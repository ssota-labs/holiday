import { type AccountId, type IsoDate, assertIsoDate } from './account.js';
import { clampDay } from './billing.js';
import type { CommodityCode } from './commodity.js';
import { RATE_ONE, applyRate, mulRate, powRate, roundDiv } from './rate.js';

/**
 * 대출 — the last of the four schedules, and the same shape as the other three.
 *
 * The ledger side is unremarkable: a payment is
 *
 *     Dr Liabilities:Loans:KB:Mortgage   principal
 *     Dr Expenses:Interest:Mortgage      interest
 *     Cr Assets:Bank:KB:Checking         total
 *
 * The schedule below is a FORECAST and lives outside the journal, like every
 * other schedule here. Posting an amortization table into the ledger means every
 * rate change and every prepayment rewrites history.
 *
 * Because it is a forecast, approximation is allowed — which is not a
 * contradiction of the no-tolerance rule, it is the other side of the same
 * fact/forecast line the whole design draws. `loanCheck` is what keeps the
 * forecast honest: it compares the schedule against what the ledger actually
 * says and reports the gap.
 *
 * One thing is still exact: the rows' principal sums to the loan amount. A
 * schedule that does not is one that never reconciles.
 */

export type AmortizationMethod =
  /** 원리금균등 — level total payment; principal grows as interest shrinks. */
  | 'annuity'
  /** 원금균등 — level principal; the total payment falls every month. */
  | 'equal_principal'
  /** 만기일시상환 — interest monthly, the whole principal at maturity. */
  | 'bullet'
  /** 거치 — interest only. The balance never amortizes. */
  | 'interest_only';

export interface Loan {
  readonly accountId: AccountId;
  /** Where the payment comes from. */
  readonly fundingAccountId: AccountId;
  /** Where the interest half of a payment is booked. */
  readonly interestAccountId: AccountId;
  readonly principalMinor: bigint;
  readonly commodity: CommodityCode;
  /** Annual, as a decimal string percentage. "4.2" is 4.2%. */
  readonly annualRateText: string;
  readonly method: AmortizationMethod;
  readonly termMonths: number;
  readonly firstPaymentDate: IsoDate;
  /** Day of month payments land. -1 is 말일. */
  readonly paymentDay: number;
  readonly label: string | null;
}

export interface LoanScheduleRow {
  readonly seq: number;
  readonly dueDate: IsoDate;
  readonly openingMinor: bigint;
  readonly principalMinor: bigint;
  readonly interestMinor: bigint;
  readonly closingMinor: bigint;
}

export class LoanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoanError';
  }
}

export interface BuildLoanScheduleOptions {
  readonly principalMinor: bigint;
  /** Scaled monthly rate. See rate.ts. */
  readonly monthlyRate: bigint;
  readonly method: AmortizationMethod;
  readonly termMonths: number;
  readonly firstPaymentDate: IsoDate;
  readonly paymentDay: number;
}

export function buildLoanSchedule(opts: BuildLoanScheduleOptions): LoanScheduleRow[] {
  const { principalMinor, monthlyRate, method, termMonths, firstPaymentDate, paymentDay } = opts;

  if (principalMinor <= 0n) throw new LoanError(`a loan principal must be positive, got ${principalMinor}`);
  if (!Number.isInteger(termMonths) || termMonths < 1) {
    throw new LoanError(`termMonths must be a positive integer, got ${termMonths}`);
  }
  if (monthlyRate < 0n) throw new LoanError('a negative interest rate is not supported');
  if (method === 'annuity' && monthlyRate === 0n) {
    // The annuity formula divides by ((1+r)^n − 1), which is zero at r=0. A 0%
    // annuity is just equal principal; say so rather than dividing by zero.
    throw new LoanError('a 0% loan cannot use the annuity method — it is equal_principal. Use that.');
  }

  const dates = paymentDates(firstPaymentDate, paymentDay, termMonths);
  const principals = principalSplit(principalMinor, monthlyRate, method, termMonths);

  const rows: LoanScheduleRow[] = [];
  let opening = principalMinor;
  for (let i = 0; i < termMonths; i++) {
    // Interest accrues on what is still owed at the START of the period. For
    // interest_only the balance never falls, which is the whole point of 거치.
    const interest = applyRate(opening, monthlyRate);
    const principal = principals[i]!;
    const closing = opening - principal;
    rows.push({
      seq: i + 1,
      dueDate: dates[i]!,
      openingMinor: opening,
      principalMinor: principal,
      interestMinor: interest,
      closingMinor: closing,
    });
    opening = closing;
  }
  return rows;
}

/**
 * How much principal comes off each month.
 *
 * Every method funnels through here, and every one ends the same way: the last
 * row is forced to whatever is left. That is not a fudge — it is what lenders
 * actually do, because a level payment computed to the won never divides a
 * balance evenly, and the alternative is a loan that ends ₩3 short forever.
 */
function principalSplit(
  principalMinor: bigint,
  monthlyRate: bigint,
  method: AmortizationMethod,
  termMonths: number,
): bigint[] {
  const n = BigInt(termMonths);

  if (method === 'interest_only') {
    // The balance is never repaid here. A 거치기간 rolls into a real loan later,
    // or a line of credit is refinanced; either way this schedule does not model
    // the exit, and pretending it does would put a balloon on the books that the
    // contract never promised.
    return Array.from({ length: termMonths }, () => 0n);
  }

  if (method === 'bullet') {
    const rows = Array.from({ length: termMonths }, () => 0n);
    rows[termMonths - 1] = principalMinor;
    return rows;
  }

  if (method === 'equal_principal') {
    const base = principalMinor / n;
    const rows = Array.from({ length: termMonths }, () => base);
    rows[termMonths - 1] = principalMinor - base * (n - 1n);
    return rows;
  }

  // annuity: payment = P · r · (1+r)^n / ((1+r)^n − 1)
  const factor = powRate(RATE_ONE + monthlyRate, termMonths);
  const denominator = factor - RATE_ONE;
  if (denominator <= 0n) throw new LoanError('rate/term combination produced a degenerate annuity factor');
  const ratio = roundDiv(mulRate(monthlyRate, factor) * RATE_ONE, denominator);
  const payment = applyRate(principalMinor, ratio);

  const rows: bigint[] = [];
  let opening = principalMinor;
  for (let i = 0; i < termMonths; i++) {
    const interest = applyRate(opening, monthlyRate);
    let principal = payment - interest;
    if (i === termMonths - 1 || principal > opening) principal = opening;
    if (principal < 0n) {
      throw new LoanError(
        `the level payment (${payment}) does not cover the interest (${interest}) at month ${i + 1}. ` +
          `This loan never amortizes — check the rate and term.`,
      );
    }
    rows.push(principal);
    opening -= principal;
  }
  return rows;
}

function paymentDates(first: IsoDate, paymentDay: number, termMonths: number): IsoDate[] {
  const [fy, fm] = first.split('-').map(Number) as [number, number];
  return Array.from({ length: termMonths }, (_, i) => {
    const zero = fm - 1 + i;
    const y = fy + Math.floor(zero / 12);
    const m = ((zero % 12) + 12) % 12 + 1;
    // Same month-end clamp as cards and installments: a payment due on the 31st
    // is due on the 28th in February.
    const d = clampDay(y, m, paymentDay);
    return assertIsoDate(`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  });
}

export function schedulePrincipal(rows: readonly LoanScheduleRow[]): bigint {
  return rows.reduce((s, r) => s + r.principalMinor, 0n);
}

export function scheduleInterest(rows: readonly LoanScheduleRow[]): bigint {
  return rows.reduce((s, r) => s + r.interestMinor, 0n);
}

/** The row covering `date`, or the last one before it. What a payment should split into. */
export function rowForDate(rows: readonly LoanScheduleRow[], date: IsoDate): LoanScheduleRow | null {
  return rows.find((r) => r.dueDate === date) ?? null;
}

export interface LoanCheckResult {
  readonly asOf: IsoDate;
  /** What the schedule says should still be owed. */
  readonly expectedMinor: bigint;
  /** What the ledger actually says is owed. */
  readonly actualMinor: bigint;
  /** actual − expected. Positive: you owe more than planned. */
  readonly deltaMinor: bigint;
  readonly ok: boolean;
  readonly explanation: string;
}

/**
 * Reconcile the schedule against the ledger. This is what justifies the module.
 *
 * A loan is the one debt where you can know, independently, what the balance
 * *should* be — so a divergence is information rather than noise. It means one of:
 * a missed payment, a prepayment, a rate change nobody recorded, or a fee. All
 * four are things worth being told about, and none of them are visible from a
 * balance alone.
 *
 * `actualMinor` is negated because a liability's stored balance is a credit.
 */
export function loanCheck(opts: {
  readonly rows: readonly LoanScheduleRow[];
  readonly ledgerBalanceMinor: bigint;
  readonly asOf: IsoDate;
  readonly principalMinor: bigint;
}): LoanCheckResult {
  const { rows, ledgerBalanceMinor, asOf, principalMinor } = opts;

  const due = rows.filter((r) => r.dueDate <= asOf);
  const expected = due.length > 0 ? due[due.length - 1]!.closingMinor : principalMinor;
  const actual = -ledgerBalanceMinor;
  const delta = actual - expected;

  return {
    asOf,
    expectedMinor: expected,
    actualMinor: actual,
    deltaMinor: delta,
    ok: delta === 0n,
    explanation: explain(delta, due.length, rows.length),
  };
}

function explain(delta: bigint, paidRows: number, totalRows: number): string {
  if (delta === 0n) return `on schedule — ${paidRows}/${totalRows} payments due so far`;
  if (delta > 0n) {
    return (
      `you owe ${delta} more than the schedule expects. Usually a missed or partial payment, ` +
      `an unrecorded rate change, or a fee added to the balance.`
    );
  }
  return (
    `you owe ${-delta} less than the schedule expects. Usually a prepayment (중도상환), ` +
    `or a payment recorded with too much going to principal.`
  );
}

export function describeMethod(m: AmortizationMethod): string {
  switch (m) {
    case 'annuity':
      return '원리금균등';
    case 'equal_principal':
      return '원금균등';
    case 'bullet':
      return '만기일시상환';
    case 'interest_only':
      return '거치 (이자만)';
  }
}
