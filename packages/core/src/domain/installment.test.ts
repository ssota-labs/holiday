import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import type { IsoDate } from './account.js';
import type { CardCycleRule } from './billing.js';
import {
  InstallmentError,
  buildInstallmentSchedule,
  reviseSchedule,
  scheduleTotal,
  splitTotal,
  unpaidRows,
} from './installment.js';

const d = (s: string) => s as IsoDate;

// 신한: 14일 마감, 익월 1일 결제.
const SHINHAN: CardCycleRule = { cycleCloseDay: 14, paymentMonthOffset: 1, paymentDay: 1 };
// 현대: 말일 마감, 익월 말일 결제.
const EOM: CardCycleRule = { cycleCloseDay: 31, paymentMonthOffset: 1, paymentDay: -1 };

describe('splitTotal', () => {
  it('splits evenly when it divides', () => {
    expect(splitTotal(1200000n, 12)).toEqual(Array(12).fill(100000n));
  });

  it('puts the remainder on the first row, and sums to EXACTLY the total', () => {
    // ₩1,000,000 / 3 = ₩333,333.33… — there is no third of a won. Korean issuers
    // put the odd amount on the first row.
    const rows = splitTotal(1000000n, 3);
    expect(rows).toEqual([333334n, 333333n, 333333n]);
    expect(rows.reduce((a, b) => a + b, 0n)).toBe(1000000n);
  });

  it('can put the remainder last instead', () => {
    expect(splitTotal(1000000n, 3, 'last')).toEqual([333333n, 333333n, 333334n]);
  });

  it('rejects nonsense', () => {
    expect(() => splitTotal(1000n, 0)).toThrow(InstallmentError);
    expect(() => splitTotal(1000n, 2.5)).toThrow(InstallmentError);
    expect(() => splitTotal(0n, 3)).toThrow(InstallmentError);
    expect(() => splitTotal(-1000n, 3)).toThrow(InstallmentError);
  });

  it('sums to the total for ANY total and term', () => {
    // The one property that matters. A schedule summing to ₩999,999 never
    // reconciles against a real statement, and no tolerance exists to hide it.
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 10n ** 12n }), fc.integer({ min: 1, max: 60 }), (total, months) => {
        const rows = splitTotal(total, months);
        expect(rows).toHaveLength(months);
        expect(rows.reduce((a, b) => a + b, 0n)).toBe(total);
        // No row may be negative or absurdly lopsided: the spread is at most 1 unit.
        const min = rows.reduce((a, b) => (b < a ? b : a));
        const max = rows.reduce((a, b) => (b > a ? b : a));
        expect(max - min).toBeLessThanOrEqual(BigInt(months));
      }),
    );
  });
});

describe('buildInstallmentSchedule', () => {
  it('starts on the bill the purchase actually joins, not the next month', () => {
    // 7/17 구매 → 8/14 마감 → 9/1 첫 회차. Not August.
    const rows = buildInstallmentSchedule({
      purchasedOn: d('2026-07-17'),
      months: 12,
      totalMinor: 1200000n,
      cardRule: SHINHAN,
    });
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual({ seq: 1, paymentDate: '2026-09-01', principalMinor: 100000n, feeMinor: 0n });
    expect(rows[1]!.paymentDate).toBe('2026-10-01');
    expect(rows[11]!.paymentDate).toBe('2027-08-01');
  });

  it('sums to the purchase total', () => {
    const rows = buildInstallmentSchedule({
      purchasedOn: d('2026-07-17'),
      months: 7,
      totalMinor: 1000000n,
      cardRule: SHINHAN,
    });
    expect(scheduleTotal(rows)).toBe(1000000n);
  });

  it('clamps a month-end payment day through February', () => {
    const rows = buildInstallmentSchedule({
      purchasedOn: d('2025-12-05'),
      months: 4,
      totalMinor: 400000n,
      cardRule: EOM,
    });
    expect(rows.map((r) => r.paymentDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('crosses a year boundary', () => {
    const rows = buildInstallmentSchedule({
      purchasedOn: d('2026-11-20'),
      months: 3,
      totalMinor: 300000n,
      cardRule: SHINHAN,
    });
    expect(rows.map((r) => r.paymentDate)).toEqual(['2027-01-01', '2027-02-01', '2027-03-01']);
  });

  it('accepts OBSERVED 할부수수료 read off a statement', () => {
    // The line this draws is observation vs derivation — the same one the ledger
    // draws between weight_source 'actual' and 'rate'. A fee the user can see on
    // their card app is a fact. A fee we computed from a formula is a guess.
    const rows = buildInstallmentSchedule({
      purchasedOn: d('2026-07-17'),
      months: 3,
      totalMinor: 300000n,
      cardRule: SHINHAN,
      fees: [5000n, 3400n, 1700n],
    });
    expect(rows.map((r) => [r.principalMinor, r.feeMinor])).toEqual([
      [100000n, 5000n],
      [100000n, 3400n],
      [100000n, 1700n],
    ]);
    // Fees are interest, not purchase: the principal still sums to what was bought.
    expect(rows.reduce((s, r) => s + r.principalMinor, 0n)).toBe(300000n);
  });

  it('refuses a fee list that does not match the term', () => {
    // Declining-balance fees are not all the same, so a short list means the user
    // guessed rather than read. Reject it.
    expect(() =>
      buildInstallmentSchedule({
        purchasedOn: d('2026-07-17'),
        months: 12,
        totalMinor: 1200000n,
        cardRule: SHINHAN,
        fees: [5000n],
      }),
    ).toThrow(/12 fee values, got 1/);
  });

  it('refuses a negative fee', () => {
    expect(() =>
      buildInstallmentSchedule({
        purchasedOn: d('2026-07-17'),
        months: 2,
        totalMinor: 200000n,
        cardRule: SHINHAN,
        fees: [1000n, -1n],
      }),
    ).toThrow(/negative/);
  });

  it('a one-month "installment" is just a normal charge', () => {
    const rows = buildInstallmentSchedule({
      purchasedOn: d('2026-07-17'),
      months: 1,
      totalMinor: 50000n,
      cardRule: SHINHAN,
    });
    expect(rows).toEqual([{ seq: 1, paymentDate: '2026-09-01', principalMinor: 50000n, feeMinor: 0n }]);
  });

  it('never schedules cash before the purchase, for any term', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01T00:00:00Z'), max: new Date('2030-12-31T00:00:00Z') }),
        fc.integer({ min: 1, max: 36 }),
        (date, months) => {
          const purchasedOn = date.toISOString().slice(0, 10) as IsoDate;
          const rows = buildInstallmentSchedule({ purchasedOn, months, totalMinor: 1200000n, cardRule: SHINHAN });
          expect(rows[0]!.paymentDate > purchasedOn).toBe(true);
          // Strictly increasing — two rows on one date would double-count.
          for (let i = 1; i < rows.length; i++) {
            expect(rows[i]!.paymentDate > rows[i - 1]!.paymentDate).toBe(true);
          }
        },
      ),
    );
  });
});

describe('unpaidRows', () => {
  it('keeps only rows whose money has not moved', () => {
    const rows = buildInstallmentSchedule({
      purchasedOn: d('2026-01-05'),
      months: 6,
      totalMinor: 600000n,
      cardRule: SHINHAN,
    });
    expect(rows.map((r) => r.paymentDate)[0]).toBe('2026-02-01');
    expect(unpaidRows(rows, d('2026-04-15')).map((r) => r.seq)).toEqual([4, 5, 6]);
    expect(unpaidRows(rows, d('2027-01-01'))).toEqual([]);
  });
});

describe('reviseSchedule', () => {
  const base = buildInstallmentSchedule({
    purchasedOn: d('2026-07-17'),
    months: 3,
    totalMinor: 300000n,
    cardRule: SHINHAN,
  });

  it('takes the statement over anything we computed', () => {
    // The issuer is the authority on its own numbers — including dates, which can
    // shift for holidays.
    const revised = reviseSchedule(
      [
        { seq: 1, paymentDate: d('2026-09-02'), principalMinor: 100000n, feeMinor: 4500n },
        { seq: 2, paymentDate: d('2026-10-01'), principalMinor: 100000n, feeMinor: 3000n },
        { seq: 3, paymentDate: d('2026-11-02'), principalMinor: 100000n, feeMinor: 1500n },
      ],
      300000n,
    );
    expect(revised.map((r) => r.paymentDate)).toEqual(['2026-09-02', '2026-10-01', '2026-11-02']);
    expect(revised.map((r) => r.feeMinor)).toEqual([4500n, 3000n, 1500n]);
    expect(base[0]!.paymentDate).toBe('2026-09-01'); // what we had guessed
  });

  it('refuses rows whose principal disagrees with the purchase', () => {
    // The one thing the issuer cannot disagree with us about: the purchase is
    // already posted as debt. A mismatch means one of us is on the wrong plan.
    expect(() =>
      reviseSchedule([{ seq: 1, paymentDate: d('2026-09-01'), principalMinor: 299999n, feeMinor: 0n }], 300000n),
    ).toThrow(/principal summing to 299999/);
  });

  it('refuses folding fees into the principal', () => {
    expect(() =>
      reviseSchedule(
        [
          { seq: 1, paymentDate: d('2026-09-01'), principalMinor: 105000n, feeMinor: 0n },
          { seq: 2, paymentDate: d('2026-10-01'), principalMinor: 100000n, feeMinor: 0n },
          { seq: 3, paymentDate: d('2026-11-01'), principalMinor: 100000n, feeMinor: 0n },
        ],
        300000n,
      ),
    ).toThrow(/Fees are separate/);
  });

  it('refuses gaps in the numbering', () => {
    expect(() =>
      reviseSchedule(
        [
          { seq: 1, paymentDate: d('2026-09-01'), principalMinor: 150000n, feeMinor: 0n },
          { seq: 3, paymentDate: d('2026-10-01'), principalMinor: 150000n, feeMinor: 0n },
        ],
        300000n,
      ),
    ).toThrow(/1\.\.2 with no gaps/);
  });

  it('refuses two rows on one date, which would double-count', () => {
    expect(() =>
      reviseSchedule(
        [
          { seq: 1, paymentDate: d('2026-09-01'), principalMinor: 150000n, feeMinor: 0n },
          { seq: 2, paymentDate: d('2026-09-01'), principalMinor: 150000n, feeMinor: 0n },
        ],
        300000n,
      ),
    ).toThrow(/double-count/);
  });
});
