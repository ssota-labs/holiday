import type { AccountCode, AccountId, IsoDate } from './account.js';
import { type CardCycleRule, billingDatesFor, cycleRangeFor, nextDay, upcomingBills } from './billing.js';
import type { CommodityCode } from './commodity.js';
import { type RecurringExpense, isActiveOn, occurrencesBetween } from './recurring.js';
import type { TxnId } from './txn.js';

/**
 * Cash flow projection.
 *
 * The ledger only knows the past. This is the forward half: which of the money
 * you have already spent has not left your account yet, and when it will. That
 * is the question a credit card creates and the reason a cash flow view exists
 * separately from a balance.
 *
 * Note what this is NOT: a maintained table. The historical half of a cash flow
 * statement is a query over the ledger (postings touching cash accounts) and can
 * never drift from it. Only the forward half needs computing, and it is derived
 * from schedules, never stored as fact.
 */

export interface CardForProjection {
  readonly accountId: AccountId;
  readonly accountCode: AccountCode;
  readonly fundingAccountId: AccountId;
  readonly rule: CardCycleRule;
  readonly label: string | null;
}

/** Just enough of a posting to project from. Keeps this function DB-free. */
export interface ProjectionPosting {
  readonly txnId: TxnId;
  readonly txnDate: IsoDate;
  readonly accountId: AccountId;
  readonly weightMinor: bigint;
  readonly commodity: CommodityCode;
}

export interface ProjectedBill {
  readonly cardAccountId: AccountId;
  readonly cardCode: AccountCode;
  readonly cardLabel: string | null;
  readonly fundingAccountId: AccountId;
  readonly closeDate: IsoDate;
  readonly paymentDate: IsoDate;
  /** Positive = cash that will leave on paymentDate. */
  readonly amountMinor: bigint;
  readonly cycleFrom: IsoDate;
  readonly cycleTo: IsoDate;
}

/**
 * What will each card take, and when.
 *
 * The subtle part is deciding which postings belong to a bill. On a card account,
 * a purchase is negative, but BOTH a refund and a payment-of-a-previous-bill are
 * positive. Summing naively lets last month's payment cancel out this month's
 * charges, understating the bill — which is the exact direction of error that
 * gets someone overdrawn.
 *
 * They are told apart by the other side of the transaction: a payment's counter
 * leg is the funding account, a refund's is an expense. So transactions touching
 * the funding account are excluded, and everything else in the cycle counts.
 */
export function projectCardBills(opts: {
  readonly cards: readonly CardForProjection[];
  readonly postings: readonly ProjectionPosting[];
  readonly today: IsoDate;
  readonly until: IsoDate;
}): ProjectedBill[] {
  const { cards, postings, today, until } = opts;

  const byTxn = new Map<TxnId, ProjectionPosting[]>();
  for (const p of postings) {
    const list = byTxn.get(p.txnId);
    if (list) list.push(p);
    else byTxn.set(p.txnId, [p]);
  }

  const out: ProjectedBill[] = [];

  for (const card of cards) {
    const isPayment = (txnId: TxnId): boolean =>
      (byTxn.get(txnId) ?? []).some((p) => p.accountId === card.fundingAccountId);

    for (const bill of upcomingBills(today, until, card.rule)) {
      const range = cycleRangeFor(bill.closeDate, card.rule);
      let sum = 0n;
      for (const p of postings) {
        if (p.accountId !== card.accountId) continue;
        if (p.txnDate < range.from || p.txnDate > range.to) continue;
        if (isPayment(p.txnId)) continue;
        sum += p.weightMinor;
      }
      // Card postings are negative (they increase what you owe), so the cash
      // that leaves is the negation.
      const amountMinor = -sum;
      if (amountMinor === 0n) continue;
      out.push({
        cardAccountId: card.accountId,
        cardCode: card.accountCode,
        cardLabel: card.label,
        fundingAccountId: card.fundingAccountId,
        closeDate: bill.closeDate,
        paymentDate: bill.paymentDate,
        amountMinor,
        cycleFrom: range.from,
        cycleTo: range.to,
      });
    }
  }

  return out.sort((a, b) =>
    a.paymentDate < b.paymentDate ? -1 : a.paymentDate > b.paymentDate ? 1 : a.cardCode < b.cardCode ? -1 : 1,
  );
}

/** An installment row that has not been paid yet. */
export interface ProjectedInstallment {
  readonly kind: 'installment';
  readonly installmentId: string;
  readonly cardAccountId: AccountId;
  readonly liabilityAccountId: AccountId;
  readonly fundingAccountId: AccountId;
  readonly label: string | null;
  readonly paymentDate: IsoDate;
  readonly amountMinor: bigint;
  readonly seq: number;
  readonly months: number;
}

export interface InstallmentForProjection {
  readonly id: string;
  readonly cardAccountId: AccountId;
  readonly liabilityAccountId: AccountId;
  readonly label: string | null;
  readonly months: number;
  readonly rows: readonly { readonly seq: number; readonly paymentDate: IsoDate; readonly principalMinor: bigint; readonly feeMinor: bigint }[];
}

/**
 * Installment rows whose money has not moved yet.
 *
 * These are NOT derived from postings the way card bills are, because an
 * installment's postings all sit on the purchase date — the schedule is the only
 * thing that knows a twelfth of it moves each month. That is exactly why the
 * balance lives in its own account: ordinary billing sums postings in a cycle and
 * would otherwise bill the whole purchase at once.
 */
export function projectInstallments(opts: {
  readonly installments: readonly InstallmentForProjection[];
  readonly fundingByCard: ReadonlyMap<AccountId, AccountId>;
  readonly today: IsoDate;
  readonly until: IsoDate;
}): ProjectedInstallment[] {
  const out: ProjectedInstallment[] = [];
  for (const plan of opts.installments) {
    const fundingAccountId = opts.fundingByCard.get(plan.cardAccountId);
    // A plan on a card with no billing rule has no known payment source. Skipping
    // it silently would understate the projection, so the caller checks for this.
    if (!fundingAccountId) continue;
    for (const r of plan.rows) {
      if (r.paymentDate <= opts.today || r.paymentDate > opts.until) continue;
      out.push({
        kind: 'installment',
        installmentId: plan.id,
        cardAccountId: plan.cardAccountId,
        liabilityAccountId: plan.liabilityAccountId,
        fundingAccountId,
        label: plan.label,
        paymentDate: r.paymentDate,
        amountMinor: r.principalMinor + r.feeMinor,
        seq: r.seq,
        months: plan.months,
      });
    }
  }
  return out.sort((a, b) => (a.paymentDate < b.paymentDate ? -1 : 1));
}

/** A 정기지출 occurrence that has not happened yet. */
export interface ProjectedRecurring {
  readonly kind: 'recurring';
  readonly recurringId: string;
  readonly label: string;
  readonly expenseAccountId: AccountId;
  /** The account cash ultimately leaves — the bank, even when a card is in between. */
  readonly fundingAccountId: AccountId;
  /** Non-null when this is charged to a card and therefore rides its billing cycle. */
  readonly viaCardAccountId: AccountId | null;
  readonly occurredOn: IsoDate;
  readonly paymentDate: IsoDate;
  readonly amountMinor: bigint;
}

/**
 * 정기지출 that has not happened yet.
 *
 * Two things make this harder than it looks.
 *
 * First, funding decides everything. Rent paid from a bank account leaves cash on
 * the day it is due. A subscription on a card does not: that date only creates
 * debt, and the cash goes weeks later when the card's cycle settles. Same amount,
 * same cadence, entirely different answer to "does the balance survive".
 *
 * Second, DOUBLE COUNTING. Last month's Netflix is already a posting, and
 * projectCardBills already counts it into its bill. Projecting it again from the
 * cadence would bill it twice. So only occurrences strictly after `today` are
 * projected; anything on or before it is the ledger's business, not the
 * forecast's. The cost of that rule is that today's occurrence is missed if it
 * has not been recorded yet — which is the safer direction to be wrong, since a
 * projection that double-counts is one nobody trusts twice.
 */
export function projectRecurring(opts: {
  readonly recurring: readonly RecurringExpense[];
  /** Card account id → its rule and the bank account that settles it. */
  readonly cardRules: ReadonlyMap<AccountId, { readonly rule: CardCycleRule; readonly fundingAccountId: AccountId }>;
  readonly today: IsoDate;
  readonly until: IsoDate;
}): ProjectedRecurring[] {
  const out: ProjectedRecurring[] = [];

  for (const r of opts.recurring) {
    const card = opts.cardRules.get(r.fundingAccountId);

    for (const occurredOn of occurrencesBetween(r.cadence, nextDay(opts.today), opts.until)) {
      if (!isActiveOn(r, occurredOn)) continue;

      const paymentDate = card ? billingDatesFor(occurredOn, card.rule).paymentDate : occurredOn;
      if (paymentDate <= opts.today || paymentDate > opts.until) continue;

      out.push({
        kind: 'recurring',
        recurringId: r.id,
        label: r.label,
        expenseAccountId: r.expenseAccountId,
        fundingAccountId: card ? card.fundingAccountId : r.fundingAccountId,
        viaCardAccountId: card ? r.fundingAccountId : null,
        occurredOn,
        paymentDate,
        amountMinor: r.amountMinor,
      });
    }
  }
  return out.sort((a, b) => (a.paymentDate < b.paymentDate ? -1 : 1));
}

export type ProjectedOutflow =
  | (ProjectedBill & { readonly kind?: 'card' })
  | ProjectedInstallment
  | ProjectedRecurring;

export interface CashRunwayPoint<T> {
  readonly date: IsoDate;
  readonly outflowMinor: bigint;
  readonly balanceAfterMinor: bigint;
  readonly items: readonly T[];
}

/**
 * Walk the projected outflows forward from today's cash balance.
 *
 * This is the whole deliverable: not "what do I owe" but "does the balance
 * survive". A negative `balanceAfterMinor` is the answer to the question being
 * asked every day.
 *
 * Generic over the outflow so ordinary card bills and installment rows land in
 * the same day bucket — which is what a real statement does. One withdrawal on
 * the 1st, made of this month's charges plus every installment row that came due.
 */
export function cashRunway<T extends { readonly paymentDate: IsoDate; readonly amountMinor: bigint }>(
  openingCashMinor: bigint,
  outflows: readonly T[],
): CashRunwayPoint<T>[] {
  const byDate = new Map<IsoDate, T[]>();
  for (const b of outflows) {
    const list = byDate.get(b.paymentDate);
    if (list) list.push(b);
    else byDate.set(b.paymentDate, [b]);
  }
  const dates = [...byDate.keys()].sort();

  let balance = openingCashMinor;
  return dates.map((date) => {
    const items = byDate.get(date)!;
    const outflow = items.reduce((s, b) => s + b.amountMinor, 0n);
    balance -= outflow;
    return { date, outflowMinor: outflow, balanceAfterMinor: balance, items };
  });
}
