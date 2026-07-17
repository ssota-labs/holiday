import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import type { IsoDate } from './account.js';
import {
  type CardCycleRule,
  CardCycleRuleError,
  assertCardCycleRule,
  billingDatesFor,
  clampDay,
  cycleRangeFor,
  daysInMonth,
  upcomingBills,
} from './billing.js';

const d = (s: string) => s as IsoDate;

// 사용기간이 전월 15일~당월 14일, 결제일이 익월 1일인 카드.
const CLOSE_14_PAY_NEXT_1: CardCycleRule = { cycleCloseDay: 14, paymentMonthOffset: 1, paymentDay: 1 };
// 말일 마감, 익월 14일 결제.
const CLOSE_EOM_PAY_NEXT_14: CardCycleRule = { cycleCloseDay: 31, paymentMonthOffset: 1, paymentDay: 14 };
// 말일 마감, 익월 말일 결제.
const CLOSE_EOM_PAY_NEXT_EOM: CardCycleRule = { cycleCloseDay: 31, paymentMonthOffset: 1, paymentDay: -1 };

describe('billingDatesFor', () => {
  it('rolls a purchase after the closing day into the next cycle', () => {
    // The whole point: 7/17 does not cost you cash in July.
    expect(billingDatesFor(d('2026-07-17'), CLOSE_14_PAY_NEXT_1)).toEqual({
      closeDate: '2026-08-14',
      paymentDate: '2026-09-01',
    });
  });

  it('keeps a purchase ON the closing day in that cycle (inclusive)', () => {
    expect(billingDatesFor(d('2026-07-14'), CLOSE_14_PAY_NEXT_1)).toEqual({
      closeDate: '2026-07-14',
      paymentDate: '2026-08-01',
    });
    // One day later is a whole month of difference in when cash moves.
    expect(billingDatesFor(d('2026-07-15'), CLOSE_14_PAY_NEXT_1).paymentDate).toBe('2026-09-01');
  });

  it('clamps a month-end close in February', () => {
    // A card that "closes on the 31st" closes on the 28th in February. Getting
    // this wrong shifts a payment by a month.
    expect(billingDatesFor(d('2026-02-10'), CLOSE_EOM_PAY_NEXT_14)).toEqual({
      closeDate: '2026-02-28',
      paymentDate: '2026-03-14',
    });
    // 2028 is a leap year.
    expect(billingDatesFor(d('2028-02-10'), CLOSE_EOM_PAY_NEXT_14).closeDate).toBe('2028-02-29');
  });

  it('clamps a month-end payment day', () => {
    expect(billingDatesFor(d('2026-01-20'), CLOSE_EOM_PAY_NEXT_EOM)).toEqual({
      closeDate: '2026-01-31',
      paymentDate: '2026-02-28',
    });
  });

  it('crosses a year boundary', () => {
    expect(billingDatesFor(d('2026-12-20'), CLOSE_14_PAY_NEXT_1)).toEqual({
      closeDate: '2027-01-14',
      paymentDate: '2027-02-01',
    });
  });

  it('handles a same-month payment', () => {
    const rule: CardCycleRule = { cycleCloseDay: 14, paymentMonthOffset: 0, paymentDay: -1 };
    expect(billingDatesFor(d('2026-07-10'), rule)).toEqual({
      closeDate: '2026-07-14',
      paymentDate: '2026-07-31',
    });
  });

  it('refuses a rule that pays before its cycle closes', () => {
    // Silently producing a payment date in the past would poison every
    // projection downstream, so this is loud.
    const impossible: CardCycleRule = { cycleCloseDay: 25, paymentMonthOffset: 0, paymentDay: 5 };
    expect(() => billingDatesFor(d('2026-07-10'), impossible)).toThrow(CardCycleRuleError);
  });
});

describe('assertCardCycleRule', () => {
  it('rejects nonsense', () => {
    expect(() => assertCardCycleRule({ cycleCloseDay: 0, paymentMonthOffset: 1, paymentDay: 1 })).toThrow();
    expect(() => assertCardCycleRule({ cycleCloseDay: 32, paymentMonthOffset: 1, paymentDay: 1 })).toThrow();
    expect(() => assertCardCycleRule({ cycleCloseDay: 14, paymentMonthOffset: -1, paymentDay: 1 })).toThrow();
    expect(() => assertCardCycleRule({ cycleCloseDay: 14, paymentMonthOffset: 1, paymentDay: 0 })).toThrow();
    expect(() => assertCardCycleRule({ cycleCloseDay: 14, paymentMonthOffset: 1, paymentDay: 32 })).toThrow();
  });

  it('accepts -1 as "last day"', () => {
    expect(() => assertCardCycleRule({ cycleCloseDay: 14, paymentMonthOffset: 1, paymentDay: -1 })).not.toThrow();
  });
});

describe('cycleRangeFor', () => {
  it('starts the day after the previous close', () => {
    // Off by one here and a purchase lands on two bills, or none.
    expect(cycleRangeFor(d('2026-08-14'), CLOSE_14_PAY_NEXT_1)).toEqual({
      from: '2026-07-15',
      to: '2026-08-14',
    });
  });

  it('handles a February close', () => {
    expect(cycleRangeFor(d('2026-03-31'), CLOSE_EOM_PAY_NEXT_14)).toEqual({
      from: '2026-03-01',
      to: '2026-03-31',
    });
  });
});

describe('upcomingBills', () => {
  it('lists each future bill exactly once, in payment order', () => {
    const bills = upcomingBills(d('2026-07-17'), d('2026-10-31'), CLOSE_14_PAY_NEXT_1);
    expect(bills.map((b) => b.paymentDate)).toEqual(['2026-08-01', '2026-09-01', '2026-10-01']);
    expect(new Set(bills.map((b) => b.closeDate)).size).toBe(bills.length);
  });

  it('excludes bills already paid', () => {
    const bills = upcomingBills(d('2026-09-02'), d('2026-10-31'), CLOSE_14_PAY_NEXT_1);
    expect(bills.map((b) => b.paymentDate)).toEqual(['2026-10-01']);
  });
});

describe('properties', () => {
  const anyDate = fc
    .date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2035-12-31T00:00:00Z') })
    .map((x) => x.toISOString().slice(0, 10) as IsoDate);

  const anyRule = fc
    .record({
      cycleCloseDay: fc.integer({ min: 1, max: 31 }),
      paymentMonthOffset: fc.integer({ min: 1, max: 2 }),
      paymentDay: fc.oneof(fc.integer({ min: 1, max: 31 }), fc.constant(-1)),
    })
    .map(assertCardCycleRule);

  it('cash never leaves before the purchase, for any date and any rule', () => {
    fc.assert(
      fc.property(anyDate, anyRule, (date, rule) => {
        const b = billingDatesFor(date, rule);
        expect(b.closeDate >= date).toBe(true);
        expect(b.paymentDate >= b.closeDate).toBe(true);
      }),
    );
  });

  it('every purchase falls inside the range of the cycle it was assigned to', () => {
    // The round-trip that catches fencepost errors: assign a date to a cycle,
    // then ask that cycle for its range, and the date must be in it.
    fc.assert(
      fc.property(anyDate, anyRule, (date, rule) => {
        const { closeDate } = billingDatesFor(date, rule);
        const range = cycleRangeFor(closeDate, rule);
        expect(date >= range.from && date <= range.to).toBe(true);
      }),
    );
  });

  it('produces a real calendar date, never a 31st of February', () => {
    fc.assert(
      fc.property(anyDate, anyRule, (date, rule) => {
        for (const iso of Object.values(billingDatesFor(date, rule))) {
          const [y, m, dd] = iso.split('-').map(Number) as [number, number, number];
          expect(dd).toBeLessThanOrEqual(daysInMonth(y, m));
          expect(new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10)).toBe(iso);
        }
      }),
    );
  });
});

describe('clampDay', () => {
  it('knows how long months are', () => {
    expect(clampDay(2026, 2, 31)).toBe(28);
    expect(clampDay(2028, 2, 31)).toBe(29);
    expect(clampDay(2026, 4, 31)).toBe(30);
    expect(clampDay(2026, 1, 31)).toBe(31);
    expect(clampDay(2026, 2, -1)).toBe(28);
    expect(clampDay(2026, 7, 14)).toBe(14);
  });
});
