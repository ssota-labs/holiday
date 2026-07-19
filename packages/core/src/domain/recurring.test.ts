import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import type { AccountId, IsoDate } from './account.js';
import type { CardCycleRule } from './billing.js';
import type { CommodityCode } from './commodity.js';
import { projectRecurring, projectRecurringIncome } from './cashflow.js';
import {
  CadenceError,
  type RecurringExpense,
  type RecurringIncome,
  assertCadence,
  describeCadence,
  occurrencesBetween,
} from './recurring.js';

const d = (s: string) => s as IsoDate;
const BANK = 'bank' as AccountId;
const CARD = 'card' as AccountId;
const RENT = 'rent' as AccountId;
const SUBS = 'subs' as AccountId;
const KRW = 'KRW' as CommodityCode;

const SHINHAN: CardCycleRule = { cycleCloseDay: 14, paymentMonthOffset: 1, paymentDay: 1 };
const cardRules = new Map([[CARD, { rule: SHINHAN, fundingAccountId: BANK }]]);

describe('occurrencesBetween', () => {
  it('enumerates a monthly cadence', () => {
    expect(occurrencesBetween({ kind: 'monthly', dayOfMonth: 25 }, d('2026-07-01'), d('2026-10-01'))).toEqual([
      '2026-07-25',
      '2026-08-25',
      '2026-09-25',
    ]);
  });

  it('clamps a month-end cadence through February', () => {
    // Rent due on the 31st is due on the 28th in February. Emitting 2026-02-31
    // would normalize to March 3rd — a whole different month of cash flow.
    expect(occurrencesBetween({ kind: 'monthly', dayOfMonth: 31 }, d('2026-01-01'), d('2026-04-30'))).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('treats -1 as the last day', () => {
    expect(occurrencesBetween({ kind: 'monthly', dayOfMonth: -1 }, d('2028-01-01'), d('2028-03-31'))).toEqual([
      '2028-01-31',
      '2028-02-29', // leap year
      '2028-03-31',
    ]);
  });

  it('respects the range boundaries inclusively', () => {
    const c = { kind: 'monthly', dayOfMonth: 15 } as const;
    expect(occurrencesBetween(c, d('2026-07-15'), d('2026-08-15'))).toEqual(['2026-07-15', '2026-08-15']);
    expect(occurrencesBetween(c, d('2026-07-16'), d('2026-08-14'))).toEqual([]);
  });

  it('enumerates a yearly cadence and crosses years', () => {
    expect(occurrencesBetween({ kind: 'yearly', month: 3, dayOfMonth: 1 }, d('2026-01-01'), d('2028-12-31'))).toEqual([
      '2026-03-01',
      '2027-03-01',
      '2028-03-01',
    ]);
  });

  it('returns nothing for an inverted range', () => {
    expect(occurrencesBetween({ kind: 'monthly', dayOfMonth: 1 }, d('2026-08-01'), d('2026-07-01'))).toEqual([]);
  });

  it('never emits a date outside the range, for any cadence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1, max: 31 }).filter((n) => n !== 0),
        fc.date({ min: new Date('2024-01-01T00:00:00Z'), max: new Date('2026-01-01T00:00:00Z') }),
        fc.integer({ min: 0, max: 800 }),
        (dayOfMonth, start, span) => {
          const from = start.toISOString().slice(0, 10) as IsoDate;
          const toDate = new Date(start.getTime() + span * 86400000);
          const to = toDate.toISOString().slice(0, 10) as IsoDate;
          const dates = occurrencesBetween({ kind: 'monthly', dayOfMonth }, from, to);
          for (const x of dates) {
            expect(x >= from && x <= to).toBe(true);
            // Must be a real calendar date, never a 31st of February.
            expect(new Date(`${x}T00:00:00Z`).toISOString().slice(0, 10)).toBe(x);
          }
          expect([...dates].sort()).toEqual(dates);
          expect(new Set(dates).size).toBe(dates.length);
        },
      ),
    );
  });
});

describe('assertCadence', () => {
  it('rejects nonsense', () => {
    expect(() => assertCadence({ kind: 'monthly', dayOfMonth: 0 })).toThrow(CadenceError);
    expect(() => assertCadence({ kind: 'monthly', dayOfMonth: 32 })).toThrow(CadenceError);
    expect(() => assertCadence({ kind: 'yearly', month: 13, dayOfMonth: 1 })).toThrow(CadenceError);
    expect(() => assertCadence({ kind: 'yearly', month: 0, dayOfMonth: 1 })).toThrow(CadenceError);
  });
});

const rent: RecurringExpense = {
  id: 'R1',
  label: '월세',
  expenseAccountId: RENT,
  fundingAccountId: BANK, // 통장 자동이체
  amountMinor: 800000n,
  commodity: KRW,
  cadence: { kind: 'monthly', dayOfMonth: 25 },
  activeFrom: d('2020-01-01'),
  activeTo: null,
};

const netflix: RecurringExpense = {
  id: 'R2',
  label: '넷플릭스',
  expenseAccountId: SUBS,
  fundingAccountId: CARD, // 카드 결제
  amountMinor: 17000n,
  commodity: KRW,
  cadence: { kind: 'monthly', dayOfMonth: 17 },
  activeFrom: d('2020-01-01'),
  activeTo: null,
};

describe('projectRecurring', () => {
  it('takes cash on the due date when funded from a bank account', () => {
    const rows = projectRecurring({
      recurring: [rent],
      cardRules,
      today: d('2026-07-17'),
      until: d('2026-09-30'),
    });
    expect(rows.map((r) => [r.occurredOn, r.paymentDate])).toEqual([
      ['2026-07-25', '2026-07-25'],
      ['2026-08-25', '2026-08-25'],
      ['2026-09-25', '2026-09-25'],
    ]);
    expect(rows[0]!.viaCardAccountId).toBeNull();
  });

  it('rides the billing cycle when funded from a CARD', () => {
    // The distinction that matters. Netflix charges on 8/17, but the cash does
    // not move until 10/1 — six weeks later, through the card's cycle.
    const rows = projectRecurring({
      recurring: [netflix],
      cardRules,
      today: d('2026-07-17'),
      until: d('2026-11-30'),
    });
    expect(rows.map((r) => [r.occurredOn, r.paymentDate])).toEqual([
      ['2026-08-17', '2026-10-01'],
      ['2026-09-17', '2026-11-01'],
    ]);
    expect(rows[0]!.viaCardAccountId).toBe(CARD);
    // Cash ultimately leaves the bank, not the card.
    expect(rows[0]!.fundingAccountId).toBe(BANK);
  });

  it('does NOT project an occurrence on or before today', () => {
    // Today's and past occurrences are already postings, and projectCardBills
    // already counts them. Projecting them again bills them twice.
    const rows = projectRecurring({
      recurring: [netflix],
      cardRules,
      today: d('2026-07-17'), // 넷플릭스 결제일 당일
      until: d('2026-09-30'),
    });
    expect(rows.map((r) => r.occurredOn)).not.toContain('2026-07-17');
  });

  it('honours activeFrom and activeTo', () => {
    const cancelled: RecurringExpense = { ...rent, activeTo: d('2026-08-31') };
    const rows = projectRecurring({
      recurring: [cancelled],
      cardRules,
      today: d('2026-07-17'),
      until: d('2026-12-31'),
    });
    expect(rows.map((r) => r.occurredOn)).toEqual(['2026-07-25', '2026-08-25']);
  });

  it('excludes a card charge whose payment lands past the horizon', () => {
    // Charged 9/17 → paid 11/1. Asking about October must not show it.
    const rows = projectRecurring({
      recurring: [netflix],
      cardRules,
      today: d('2026-07-17'),
      until: d('2026-10-31'),
    });
    expect(rows.map((r) => r.paymentDate)).toEqual(['2026-10-01']);
  });

  it('treats an unknown funding account as a direct debit rather than dropping it', () => {
    const orphan: RecurringExpense = { ...rent, fundingAccountId: 'unknown' as AccountId };
    // A funding account we know nothing about is assumed to debit directly. That
    // may overstate how soon the cash goes, but silently dropping the expense
    // would understate the outflow entirely — the worse of the two errors.
    const rows = projectRecurring({ recurring: [orphan], cardRules, today: d('2026-07-17'), until: d('2026-08-31') });
    expect(rows.map((r) => r.paymentDate)).toEqual(['2026-07-25', '2026-08-25']);
  });
});

const SALARY = 'salary' as AccountId;

const paycheck: RecurringIncome = {
  id: 'I1',
  label: '급여',
  incomeAccountId: SALARY,
  depositAccountId: BANK,
  amountMinor: 3000000n,
  commodity: KRW,
  cadence: { kind: 'monthly', dayOfMonth: 25 },
  activeFrom: d('2020-01-01'),
  activeTo: null,
};

describe('projectRecurringIncome', () => {
  it('credits cash on the occurrence date', () => {
    const rows = projectRecurringIncome({
      incomes: [paycheck],
      today: d('2026-07-17'),
      until: d('2026-09-30'),
    });
    expect(rows.map((r) => [r.paymentDate, r.amountMinor])).toEqual([
      ['2026-07-25', -3000000n],
      ['2026-08-25', -3000000n],
      ['2026-09-25', -3000000n],
    ]);
  });

  it('does NOT project an income occurrence on or before today', () => {
    // Today's paycheck is already in opening cash if posted; projecting it again
    // invents money. Understating is the safer miss.
    const rows = projectRecurringIncome({
      incomes: [paycheck],
      today: d('2026-07-25'),
      until: d('2026-09-30'),
    });
    expect(rows.map((r) => r.paymentDate)).not.toContain('2026-07-25');
    expect(rows.map((r) => r.paymentDate)).toEqual(['2026-08-25', '2026-09-25']);
  });

  it('honours activeFrom and activeTo', () => {
    const ended: RecurringIncome = { ...paycheck, activeTo: d('2026-08-31') };
    const rows = projectRecurringIncome({
      incomes: [ended],
      today: d('2026-07-17'),
      until: d('2026-12-31'),
    });
    expect(rows.map((r) => r.paymentDate)).toEqual(['2026-07-25', '2026-08-25']);
  });
});

describe('describeCadence', () => {
  it('reads the way a Korean would say it', () => {
    expect(describeCadence({ kind: 'monthly', dayOfMonth: 25 })).toBe('매월 25일');
    expect(describeCadence({ kind: 'monthly', dayOfMonth: -1 })).toBe('매월 말일');
    expect(describeCadence({ kind: 'yearly', month: 3, dayOfMonth: 1 })).toBe('매년 3월 1일');
  });
});
