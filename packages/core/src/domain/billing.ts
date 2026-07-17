import { type IsoDate, assertIsoDate } from './account.js';

/**
 * Credit-card billing cycles — the thing that makes a card statement different
 * from a bank statement, and the reason a cash flow view is needed at all.
 *
 * A purchase on 7/17 does not move cash. It joins a billing cycle, that cycle
 * closes, and the whole cycle's total leaves your account weeks later on one
 * date. Without this rule the ledger knows what you owe but has no idea *when*
 * it lands, which is exactly the question being asked daily.
 *
 * This lives in the domain and touches no database: it is pure date arithmetic,
 * and pure date arithmetic is where fencepost bugs live. It gets tested alone.
 */
export interface CardCycleRule {
  /**
   * The day of the month a cycle closes, inclusive. A purchase on this day
   * belongs to the cycle closing that day; a purchase the next day rolls to the
   * following cycle.
   *
   * Korean cards vary a lot (14일, 26일, 말일…), so this is configuration, not a
   * constant. Use 31 to mean "closes at month end" — it clamps.
   */
  readonly cycleCloseDay: number;
  /** Months from the closing month to the payment month. Usually 0 or 1. */
  readonly paymentMonthOffset: number;
  /** Day of month the bill is paid. -1 means the last day of that month (말일). */
  readonly paymentDay: number;
}

export interface BillingDates {
  /** The last date whose purchases are on this bill. */
  readonly closeDate: IsoDate;
  /** The date cash actually leaves the funding account. */
  readonly paymentDate: IsoDate;
}

export class CardCycleRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardCycleRuleError';
  }
}

export function assertCardCycleRule(r: CardCycleRule): CardCycleRule {
  if (!Number.isInteger(r.cycleCloseDay) || r.cycleCloseDay < 1 || r.cycleCloseDay > 31) {
    throw new CardCycleRuleError(`cycleCloseDay must be an integer in [1, 31], got ${r.cycleCloseDay}`);
  }
  if (!Number.isInteger(r.paymentMonthOffset) || r.paymentMonthOffset < 0 || r.paymentMonthOffset > 3) {
    throw new CardCycleRuleError(`paymentMonthOffset must be an integer in [0, 3], got ${r.paymentMonthOffset}`);
  }
  const okDay = r.paymentDay === -1 || (Number.isInteger(r.paymentDay) && r.paymentDay >= 1 && r.paymentDay <= 31);
  if (!okDay) {
    throw new CardCycleRuleError(`paymentDay must be an integer in [1, 31], or -1 for the last day, got ${r.paymentDay}`);
  }
  return r;
}

export function daysInMonth(year: number, month1: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** Clamp a day-of-month to a month that may be shorter. -1 means the last day. */
export function clampDay(year: number, month1: number, day: number): number {
  const last = daysInMonth(year, month1);
  if (day === -1) return last;
  return Math.min(day, last);
}

function ymd(date: IsoDate): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return { y, m, d };
}

function iso(y: number, m1: number, d: number): IsoDate {
  return assertIsoDate(`${String(y).padStart(4, '0')}-${String(m1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
}

function addMonths(y: number, m1: number, delta: number): { y: number; m: number } {
  const zero = m1 - 1 + delta;
  return { y: y + Math.floor(zero / 12), m: ((zero % 12) + 12) % 12 + 1 };
}

/**
 * When does a purchase on `purchaseDate` actually cost you cash?
 *
 * Both month-end clamps below are real cases, not defensive padding: a card that
 * closes on the 31st closes on the 28th in February, and a bill due on the 31st
 * is due on the 30th in April. Getting either wrong shifts a payment by a month,
 * which is precisely the error a cash flow projection exists to prevent.
 */
export function billingDatesFor(purchaseDate: IsoDate, rule: CardCycleRule): BillingDates {
  assertCardCycleRule(rule);
  const { y, m, d } = ymd(purchaseDate);

  // Which cycle does this purchase land in? Inclusive of the closing day.
  const closeDayThisMonth = clampDay(y, m, rule.cycleCloseDay);
  const closeYm = d <= closeDayThisMonth ? { y, m } : addMonths(y, m, 1);
  const closeDay = clampDay(closeYm.y, closeYm.m, rule.cycleCloseDay);
  const closeDate = iso(closeYm.y, closeYm.m, closeDay);

  const payYm = addMonths(closeYm.y, closeYm.m, rule.paymentMonthOffset);
  const payDay = clampDay(payYm.y, payYm.m, rule.paymentDay);
  const paymentDate = iso(payYm.y, payYm.m, payDay);

  if (paymentDate < closeDate) {
    throw new CardCycleRuleError(
      `this rule pays a bill on ${paymentDate}, before its cycle closes on ${closeDate}. ` +
        `Increase paymentMonthOffset.`,
    );
  }
  return { closeDate, paymentDate };
}

/** The inclusive date range of purchases on the bill that closes on `closeDate`. */
export function cycleRangeFor(closeDate: IsoDate, rule: CardCycleRule): { from: IsoDate; to: IsoDate } {
  assertCardCycleRule(rule);
  const { y, m } = ymd(closeDate);
  const prev = addMonths(y, m, -1);
  const prevClose = clampDay(prev.y, prev.m, rule.cycleCloseDay);
  const dayAfterPrevClose = nextDay(iso(prev.y, prev.m, prevClose));
  return { from: dayAfterPrevClose, to: closeDate };
}

export function nextDay(date: IsoDate): IsoDate {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return assertIsoDate(t.toISOString().slice(0, 10));
}

/**
 * Every bill whose payment falls in (after, until].
 *
 * This is what the projection walks: the ledger knows the purchases, this knows
 * which future date each one detonates on.
 */
export function upcomingBills(from: IsoDate, until: IsoDate, rule: CardCycleRule): BillingDates[] {
  assertCardCycleRule(rule);
  const out: BillingDates[] = [];
  const seen = new Set<string>();

  // Start BEFORE `from`, not at it. The most imminent bill is almost always one
  // whose cycle has already closed but whose payment has not landed yet — the
  // money you already spent. Walking forward from today misses exactly that bill,
  // which is the most certain outflow there is and the worst one to omit.
  const start = ymd(from);
  const back = addMonths(start.y, start.m, -(rule.paymentMonthOffset + 2));
  let cursor = iso(back.y, back.m, 1);

  // Stop far enough out that a purchase near `until` still gets its bill.
  const end = ymd(until);
  const horizon = addMonths(end.y, end.m, rule.paymentMonthOffset + 1);
  const stop = iso(horizon.y, horizon.m, clampDay(horizon.y, horizon.m, 28));

  while (cursor <= stop) {
    const b = billingDatesFor(cursor, rule);
    // `paymentDate > from` is what excludes bills already settled.
    if (!seen.has(b.closeDate) && b.paymentDate > from && b.paymentDate <= until) {
      seen.add(b.closeDate);
      out.push(b);
    }
    cursor = nextDay(b.closeDate);
  }
  return out.sort((a, b) => (a.paymentDate < b.paymentDate ? -1 : 1));
}
