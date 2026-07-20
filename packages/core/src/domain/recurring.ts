import { type AccountId, type IsoDate, assertIsoDate } from './account.js';
import { clampDay } from './billing.js';
import type { CommodityCode } from './commodity.js';

/**
 * 정기지출 — rent, subscriptions, insurance, telecom.
 *
 * This is a FORECAST, not a fact, and it is the third thing in this system with
 * that shape (card cycles, installment schedules, and now this). Netflix is
 * *expected* to take ₩17,000 next month; when it actually does, that is an
 * ordinary transaction like any other. Modelling it as an account — which is how
 * most hand-rolled trackers do it — corrupts history the moment the price changes
 * or you cancel. So it lives out here with the other schedules.
 */

export type Cadence =
  /** dayOfMonth -1 means the last day of the month (말일). */
  | { readonly kind: 'monthly'; readonly dayOfMonth: number }
  | { readonly kind: 'yearly'; readonly month: number; readonly dayOfMonth: number };

export interface RecurringExpense {
  readonly id: string;
  readonly label: string;
  readonly expenseAccountId: AccountId;
  /**
   * Where the money comes from — and the whole reason this is not trivial.
   *
   * A bank account means cash leaves on the occurrence date. A CARD means the
   * occurrence date only creates debt, and the cash leaves later, on whatever
   * date that card's billing cycle lands on. Same subscription, completely
   * different cash flow.
   */
  readonly fundingAccountId: AccountId;
  readonly amountMinor: bigint;
  readonly commodity: CommodityCode;
  readonly cadence: Cadence;
  readonly activeFrom: IsoDate;
  readonly activeTo: IsoDate | null;
}

/**
 * 정기수입 — salary, retainers, rent received.
 *
 * Same forecast shape as 정기지출, opposite direction. Salary is *expected* on
 * the 25th; when it lands, that is an ordinary posting. Keeping the cadence out
 * of the journal means a raise or a job change does not rewrite history.
 *
 * Simpler than expenses on one axis: there is no card cycle. Cash arrives in a
 * deposit account on the occurrence date. The runway only counts deposits into
 * `--cash` accounts — anything else would inflate "will the cash survive" with
 * money that is not spendable.
 */
export interface RecurringIncome {
  readonly id: string;
  readonly label: string;
  readonly incomeAccountId: AccountId;
  /** Asset account the cash lands in — must be `--cash` for the runway to see it. */
  readonly depositAccountId: AccountId;
  readonly amountMinor: bigint;
  readonly commodity: CommodityCode;
  readonly cadence: Cadence;
  readonly activeFrom: IsoDate;
  readonly activeTo: IsoDate | null;
}

export class CadenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CadenceError';
  }
}

export function assertCadence(c: Cadence): Cadence {
  const dayOk = c.dayOfMonth === -1 || (Number.isInteger(c.dayOfMonth) && c.dayOfMonth >= 1 && c.dayOfMonth <= 31);
  if (!dayOk) {
    throw new CadenceError(`dayOfMonth must be an integer in [1, 31], or -1 for the last day, got ${c.dayOfMonth}`);
  }
  if (c.kind === 'yearly' && (!Number.isInteger(c.month) || c.month < 1 || c.month > 12)) {
    throw new CadenceError(`month must be an integer in [1, 12], got ${c.month}`);
  }
  return c;
}

function iso(y: number, m: number, d: number): IsoDate {
  return assertIsoDate(`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
}

/**
 * Every occurrence in [from, to], inclusive.
 *
 * The clamp is the same one card cycles need and for the same reason: rent due on
 * the 31st is due on the 28th in February. A schedule that emits 2026-02-31
 * silently produces March 3rd through Date's normalization, which is a whole
 * different month of cash flow.
 */
export function occurrencesBetween(cadence: Cadence, from: IsoDate, to: IsoDate): IsoDate[] {
  assertCadence(cadence);
  if (from > to) return [];

  const [fy, fm] = from.split('-').map(Number) as [number, number];
  const [ty, tm] = to.split('-').map(Number) as [number, number];
  const out: IsoDate[] = [];

  if (cadence.kind === 'monthly') {
    for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); ) {
      const date = iso(y, m, clampDay(y, m, cadence.dayOfMonth));
      if (date >= from && date <= to) out.push(date);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return out;
  }

  for (let y = fy; y <= ty; y++) {
    const date = iso(y, cadence.month, clampDay(y, cadence.month, cadence.dayOfMonth));
    if (date >= from && date <= to) out.push(date);
  }
  return out;
}

export function isActiveOn(
  r: { readonly activeFrom: IsoDate; readonly activeTo: IsoDate | null },
  date: IsoDate,
): boolean {
  if (date < r.activeFrom) return false;
  return r.activeTo === null || date <= r.activeTo;
}

/**
 * Can this schedule still emit an occurrence in the open-closed horizon
 * `(asOf, until]`?
 *
 * Cashflow must NOT require `asOf ∈ [activeFrom, activeTo]`. A retainer that
 * starts next month is invisible today if the input filter asks "are you active
 * *today*", even though every occurrence after `activeFrom` would pass
 * `isActiveOn`. The horizon overlap is the right gate; per-occurrence
 * `isActiveOn` still drops dates before the start.
 *
 * Ended on or before `asOf` (`activeTo <= asOf`) cannot produce a later
 * occurrence, so it is out. See SPEC-recurring-active-window.
 */
export function overlapsHorizon(
  r: { readonly activeFrom: IsoDate; readonly activeTo: IsoDate | null },
  asOf: IsoDate,
  until: IsoDate,
): boolean {
  if (r.activeFrom > until) return false;
  if (r.activeTo !== null && r.activeTo <= asOf) return false;
  return true;
}

/**
 * Visible on `income list` / `recurring list`: in today's active window, or
 * not yet started and not ended. Schedules whose end date is earlier than
 * `asOf` stay hidden.
 */
export function isListedOn(
  r: { readonly activeFrom: IsoDate; readonly activeTo: IsoDate | null },
  asOf: IsoDate,
): boolean {
  if (r.activeTo !== null && r.activeTo < asOf) return false;
  return isActiveOn(r, asOf) || r.activeFrom > asOf;
}

/** Start date is still in the future (and the schedule has not ended). */
export function isUpcomingOn(
  r: { readonly activeFrom: IsoDate; readonly activeTo: IsoDate | null },
  asOf: IsoDate,
): boolean {
  return r.activeFrom > asOf && (r.activeTo === null || r.activeTo >= asOf);
}

export function describeCadence(c: Cadence): string {
  const day = c.dayOfMonth === -1 ? '말일' : `${c.dayOfMonth}일`;
  return c.kind === 'monthly' ? `매월 ${day}` : `매년 ${c.month}월 ${day}`;
}
