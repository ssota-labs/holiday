import { type IsoDate, assertIsoDate, type AccountId } from './account.js';
import { type CardCycleRule, assertCardCycleRule, billingDatesFor, clampDay } from './billing.js';
import type { CommodityCode } from './commodity.js';
import type { TxnId } from './txn.js';

/**
 * 할부 — a purchase split across N monthly bills.
 *
 * The modelling decision that matters: an installment balance lives in its OWN
 * liability account, separate from the card's ordinary balance.
 *
 * Why it cannot share the card account: the cash flow projection computes an
 * ordinary bill as "sum of postings inside the billing cycle". A 12-month
 * installment posts its full amount on the purchase date, so sharing the account
 * would put the entire ₩1,200,000 on the first bill when only ₩100,000 is
 * actually due. The projection would overstate the next bill by 12x — and a
 * projection that cries wolf gets ignored, which defeats the point of having one.
 *
 * Separating them means ordinary billing skips installments automatically, and
 * the rows are projected from this schedule instead. They rejoin at the payment
 * date, which is what a real statement shows: ordinary charges plus this month's
 * installment rows, one withdrawal.
 */

export interface InstallmentPlan {
  readonly id: string;
  /** The card whose statement carries these rows — decides the payment dates. */
  readonly cardAccountId: AccountId;
  /** Where the outstanding installment debt sits. Never the ordinary card account. */
  readonly liabilityAccountId: AccountId;
  readonly txnId: TxnId | null;
  readonly purchasedOn: IsoDate;
  readonly months: number;
  readonly totalMinor: bigint;
  readonly commodity: CommodityCode;
  /** v1 computes interest-free plans only. See buildInstallmentSchedule. */
  readonly interestFree: boolean;
  readonly label: string | null;
}

export interface InstallmentRow {
  /** 1-based, the way a statement numbers them (1/12, 2/12 …). */
  readonly seq: number;
  readonly paymentDate: IsoDate;
  readonly principalMinor: bigint;
  /** 할부수수료. Always 0n for interest-free plans. Reserved; see below. */
  readonly feeMinor: bigint;
}

export class InstallmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstallmentError';
  }
}

/**
 * Split `totalMinor` into `months` rows summing to EXACTLY the total.
 *
 * ₩1,000,000 over 3 months is ₩333,333.33… and there is no such thing as a third
 * of a won. The remainder has to land somewhere; Korean issuers put it on the
 * first row, so that is the default. What matters more than which row is that the
 * rows sum to the total with no residue — the same reason this ledger has no
 * tolerance anywhere else. A schedule whose rows sum to ₩999,999 is a schedule
 * that will never reconcile against a real statement.
 */
export function splitTotal(totalMinor: bigint, months: number, remainderOn: 'first' | 'last' = 'first'): bigint[] {
  if (!Number.isInteger(months) || months < 1) {
    throw new InstallmentError(`months must be a positive integer, got ${months}`);
  }
  if (totalMinor <= 0n) {
    throw new InstallmentError(`an installment total must be positive, got ${totalMinor}`);
  }
  const n = BigInt(months);
  const base = totalMinor / n;
  const remainder = totalMinor - base * n;

  const rows = Array.from({ length: months }, () => base);
  const target = remainderOn === 'first' ? 0 : months - 1;
  rows[target] = rows[target]! + remainder;
  return rows;
}

export interface BuildScheduleOptions {
  readonly purchasedOn: IsoDate;
  readonly months: number;
  readonly totalMinor: bigint;
  /** The card's billing rule — the first row lands on the bill the purchase joins. */
  readonly cardRule: CardCycleRule;
  readonly remainderOn?: 'first' | 'last';
  /**
   * 할부수수료 per row, **observed** — read off the statement, never computed.
   *
   * This is the same distinction the ledger already draws between
   * `weight_source: 'actual'` and `'rate'`: a number both sides observed is a
   * fact, a number derived from a formula is an estimate. Fees the user can see
   * on their card app are facts and belong here.
   *
   * What is still refused is *computing* them. Korean issuers apply declining-
   * balance formulas that differ per issuer, per promotion, and per term, and a
   * plausible-looking wrong fee is worse than no fee — it would quietly poison
   * the cash flow projection this feeds, and look right doing it.
   *
   * Omit for an interest-free plan. One value per month if supplied.
   */
  readonly fees?: readonly bigint[];
}

export function buildInstallmentSchedule(opts: BuildScheduleOptions): InstallmentRow[] {
  const { purchasedOn, months, totalMinor, cardRule, fees } = opts;
  assertCardCycleRule(cardRule);

  if (fees && fees.length !== months) {
    throw new InstallmentError(
      `a ${months}-month plan needs ${months} fee values, got ${fees.length}. ` +
        `Read one per row off the statement — they are not all the same, and they are not computed.`,
    );
  }
  if (fees?.some((f) => f < 0n)) {
    throw new InstallmentError('a 할부수수료 cannot be negative');
  }

  const principals = splitTotal(totalMinor, months, opts.remainderOn ?? 'first');

  // The first row rides the bill the purchase joins; the rest follow monthly on
  // the same payment day, clamped (a 31st becomes the 28th in February).
  const first = billingDatesFor(purchasedOn, cardRule).paymentDate;
  const [fy, fm] = first.split('-').map(Number) as [number, number];

  return principals.map((principalMinor, i) => {
    const zero = fm - 1 + i;
    const y = fy + Math.floor(zero / 12);
    const m = ((zero % 12) + 12) % 12 + 1;
    const day = clampDay(y, m, cardRule.paymentDay);
    return {
      seq: i + 1,
      paymentDate: assertIsoDate(`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`),
      principalMinor,
      feeMinor: fees?.[i] ?? 0n,
    };
  });
}

/**
 * Overwrite a schedule with what the statement actually says.
 *
 * The issuer is the authority on its own numbers. When the user screenshots their
 * 할부 detail screen, that beats anything computed here — including the payment
 * dates, which can shift for holidays.
 *
 * Only the principal is checked, because that is the one thing the issuer cannot
 * disagree with us about: it is the purchase, and it is already posted as debt.
 * If their principals do not sum to it, one of the two is about the wrong
 * purchase, and failing loudly is the only useful answer.
 */
export function reviseSchedule(rows: readonly InstallmentRow[], totalMinor: bigint): InstallmentRow[] {
  if (rows.length === 0) throw new InstallmentError('a revised schedule needs at least one row');

  const principal = rows.reduce((s, r) => s + r.principalMinor, 0n);
  if (principal !== totalMinor) {
    throw new InstallmentError(
      `revised rows have principal summing to ${principal}, but the purchase was ${totalMinor}. ` +
        `Fees are separate — do not fold them into the principal.`,
    );
  }
  if (rows.some((r) => r.feeMinor < 0n)) throw new InstallmentError('a 할부수수료 cannot be negative');

  const seqs = rows.map((r) => r.seq).sort((a, b) => a - b);
  if (seqs.some((s, i) => s !== i + 1)) {
    throw new InstallmentError(`rows must be numbered 1..${rows.length} with no gaps, got ${seqs.join(',')}`);
  }
  const sorted = [...rows].sort((a, b) => a.seq - b.seq);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.paymentDate <= sorted[i - 1]!.paymentDate) {
      throw new InstallmentError(
        `row ${sorted[i]!.seq} is due ${sorted[i]!.paymentDate}, not after row ${sorted[i - 1]!.seq} ` +
          `(${sorted[i - 1]!.paymentDate}). Two rows on one date would double-count.`,
      );
    }
  }
  return sorted;
}

/** Rows whose money has not moved yet. `paidThrough` is the last settled seq. */
export function unpaidRows(rows: readonly InstallmentRow[], today: IsoDate): InstallmentRow[] {
  return rows.filter((r) => r.paymentDate > today);
}

export function scheduleTotal(rows: readonly InstallmentRow[]): bigint {
  return rows.reduce((s, r) => s + r.principalMinor + r.feeMinor, 0n);
}
