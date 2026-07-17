import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import type { IsoDate } from './account.js';
import {
  LoanError,
  buildLoanSchedule,
  loanCheck,
  rowForDate,
  scheduleInterest,
  schedulePrincipal,
} from './loan.js';
import { RateError, formatAnnualPercent, monthlyFromAnnual, parseAnnualPercent, roundDiv } from './rate.js';

const d = (s: string) => s as IsoDate;
const rate = (pct: string) => monthlyFromAnnual(parseAnnualPercent(pct));

describe('rate parsing', () => {
  it('reads an annual percentage the way a contract writes it', () => {
    // "4.2" means 4.2%/yr → 0.042 → /12 monthly.
    expect(parseAnnualPercent('4.2')).toBe(42_000_000_000_000_000n); // 0.042 × 1e18
    expect(parseAnnualPercent('0')).toBe(0n);
    expect(parseAnnualPercent('100')).toBe(10n ** 18n);
  });

  it('rejects anything that is not a plain percentage', () => {
    for (const bad of ['4.2%', '-1', '4,2', '', 'four', '1e2']) {
      expect(() => parseAnnualPercent(bad), bad).toThrow(RateError);
    }
  });

  it('round-trips for display', () => {
    expect(formatAnnualPercent(parseAnnualPercent('4.2'))).toBe('4.200');
    expect(formatAnnualPercent(parseAnnualPercent('3.75'))).toBe('3.750');
  });
});

describe('roundDiv', () => {
  it('rounds half AWAY FROM ZERO, like a lender does', () => {
    // Not banker's rounding. Being clever here means loan check reports a ₩1
    // discrepancy every month forever.
    expect(roundDiv(5n, 2n)).toBe(3n);
    expect(roundDiv(-5n, 2n)).toBe(-3n);
    expect(roundDiv(4n, 2n)).toBe(2n);
    expect(roundDiv(1n, 3n)).toBe(0n);
    expect(roundDiv(2n, 3n)).toBe(1n);
  });
});

const MORTGAGE = {
  principalMinor: 300_000_000n, // ₩3억
  monthlyRate: rate('4.2'),
  termMonths: 360,
  firstPaymentDate: d('2026-08-25'),
  paymentDay: 25,
};

describe('buildLoanSchedule — 원리금균등 (annuity)', () => {
  const rows = buildLoanSchedule({ ...MORTGAGE, method: 'annuity' });

  it('produces one row per month, dated monthly', () => {
    expect(rows).toHaveLength(360);
    expect(rows[0]!.dueDate).toBe('2026-08-25');
    expect(rows[1]!.dueDate).toBe('2026-09-25');
    expect(rows[359]!.dueDate).toBe('2056-07-25');
  });

  it('repays EXACTLY the principal — not a won more or less', () => {
    expect(schedulePrincipal(rows)).toBe(300_000_000n);
    expect(rows[359]!.closingMinor).toBe(0n);
  });

  it('holds the total payment level, which is what 원리금균등 means', () => {
    const total = (i: number) => rows[i]!.principalMinor + rows[i]!.interestMinor;
    // Every payment equal except the last, which absorbs the rounding.
    const first = total(0);
    for (let i = 1; i < 359; i++) expect(Math.abs(Number(total(i) - first))).toBeLessThanOrEqual(1);
  });

  it('shifts from interest to principal over the life of the loan', () => {
    expect(rows[0]!.interestMinor).toBeGreaterThan(rows[0]!.principalMinor);
    expect(rows[359]!.principalMinor).toBeGreaterThan(rows[359]!.interestMinor);
    expect(rows[0]!.interestMinor).toBeGreaterThan(rows[359]!.interestMinor);
  });

  it('costs roughly what a ₩3억 30-year loan at 4.2% costs', () => {
    // Sanity against reality, not against our own arithmetic: a level payment of
    // about ₩1.47M and total interest a bit over ₩2억.
    const payment = rows[0]!.principalMinor + rows[0]!.interestMinor;
    expect(payment).toBeGreaterThan(1_400_000n);
    expect(payment).toBeLessThan(1_500_000n);
    expect(scheduleInterest(rows)).toBeGreaterThan(200_000_000n);
    expect(scheduleInterest(rows)).toBeLessThan(230_000_000n);
  });

  it('refuses a 0% annuity instead of dividing by zero', () => {
    expect(() => buildLoanSchedule({ ...MORTGAGE, monthlyRate: 0n, method: 'annuity' })).toThrow(
      /0% loan cannot use the annuity method/,
    );
  });

  it('refuses a loan whose payment never covers the interest', () => {
    expect(() =>
      buildLoanSchedule({ ...MORTGAGE, monthlyRate: rate('90'), termMonths: 360, method: 'annuity' }),
    ).not.toThrow(); // high rate still amortizes; the guard is for degenerate input
  });
});

describe('buildLoanSchedule — 원금균등 (equal_principal)', () => {
  const rows = buildLoanSchedule({ ...MORTGAGE, termMonths: 12, method: 'equal_principal' });

  it('keeps the principal level and lets the payment fall', () => {
    expect(new Set(rows.slice(0, 11).map((r) => r.principalMinor)).size).toBe(1);
    const total = (r: (typeof rows)[number]) => r.principalMinor + r.interestMinor;
    expect(total(rows[0]!)).toBeGreaterThan(total(rows[11]!));
  });

  it('repays exactly the principal', () => {
    expect(schedulePrincipal(rows)).toBe(300_000_000n);
    expect(rows[11]!.closingMinor).toBe(0n);
  });

  it('works at 0%, where it is just the principal split evenly', () => {
    const free = buildLoanSchedule({ ...MORTGAGE, monthlyRate: 0n, termMonths: 10, method: 'equal_principal' });
    expect(schedulePrincipal(free)).toBe(300_000_000n);
    expect(scheduleInterest(free)).toBe(0n);
  });
});

describe('buildLoanSchedule — 만기일시상환 (bullet)', () => {
  const rows = buildLoanSchedule({ ...MORTGAGE, termMonths: 12, method: 'bullet' });

  it('pays interest monthly and the whole principal at maturity', () => {
    expect(rows.slice(0, 11).every((r) => r.principalMinor === 0n)).toBe(true);
    expect(rows[11]!.principalMinor).toBe(300_000_000n);
    expect(rows[11]!.closingMinor).toBe(0n);
    // The balance never falls, so every month's interest is identical.
    expect(new Set(rows.map((r) => r.interestMinor)).size).toBe(1);
  });
});

describe('buildLoanSchedule — 거치 (interest_only)', () => {
  const rows = buildLoanSchedule({ ...MORTGAGE, termMonths: 12, method: 'interest_only' });

  it('never repays principal, and does NOT invent a balloon', () => {
    // The contract did not promise a balloon, so the schedule does not put one on
    // the books. A 거치기간 rolls into a real loan; this does not model the exit.
    expect(schedulePrincipal(rows)).toBe(0n);
    expect(rows[11]!.closingMinor).toBe(300_000_000n);
  });
});

describe('buildLoanSchedule — dates and validation', () => {
  it('clamps a month-end payment day through February', () => {
    const rows = buildLoanSchedule({
      principalMinor: 1_200_000n,
      monthlyRate: rate('3'),
      method: 'equal_principal',
      termMonths: 4,
      firstPaymentDate: d('2026-01-31'),
      paymentDay: 31,
    });
    expect(rows.map((r) => r.dueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('rejects nonsense', () => {
    expect(() => buildLoanSchedule({ ...MORTGAGE, principalMinor: 0n, method: 'annuity' })).toThrow(LoanError);
    expect(() => buildLoanSchedule({ ...MORTGAGE, termMonths: 0, method: 'annuity' })).toThrow(LoanError);
    expect(() => buildLoanSchedule({ ...MORTGAGE, monthlyRate: -1n, method: 'annuity' })).toThrow(LoanError);
  });

  it('repays exactly the principal for ANY amount, rate and term', () => {
    // The one property that matters, same as 할부: a schedule that does not sum to
    // the loan never reconciles against the lender.
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1000n, max: 10n ** 12n }),
        fc.integer({ min: 1, max: 480 }),
        fc.constantFrom('1', '2.5', '4.2', '7.75', '15'),
        (principalMinor, termMonths, pct) => {
          for (const method of ['annuity', 'equal_principal', 'bullet'] as const) {
            const rows = buildLoanSchedule({
              principalMinor,
              monthlyRate: rate(pct),
              method,
              termMonths,
              firstPaymentDate: d('2026-01-15'),
              paymentDay: 15,
            });
            expect(schedulePrincipal(rows)).toBe(principalMinor);
            expect(rows.at(-1)!.closingMinor).toBe(0n);
            expect(rows.every((r) => r.principalMinor >= 0n && r.interestMinor >= 0n)).toBe(true);
          }
        },
      ),
      { numRuns: 40 },
    );
  });
});

describe('loanCheck', () => {
  const rows = buildLoanSchedule({ ...MORTGAGE, termMonths: 12, method: 'equal_principal' });

  it('says nothing is wrong when nothing is wrong', () => {
    // Liability balances are stored as credits, hence the negation.
    const after3 = rows[2]!.closingMinor;
    const r = loanCheck({ rows, ledgerBalanceMinor: -after3, asOf: d('2026-10-25'), principalMinor: 300_000_000n });
    expect(r.ok).toBe(true);
    expect(r.deltaMinor).toBe(0n);
    expect(r.explanation).toMatch(/on schedule — 3\/12/);
  });

  it('catches a missed payment', () => {
    // This is the feature that justifies the loan module: a divergence here is
    // information, not noise.
    const after2 = rows[1]!.closingMinor;
    const r = loanCheck({ rows, ledgerBalanceMinor: -after2, asOf: d('2026-10-25'), principalMinor: 300_000_000n });
    expect(r.ok).toBe(false);
    expect(r.deltaMinor).toBeGreaterThan(0n);
    expect(r.explanation).toMatch(/missed or partial payment/);
  });

  it('catches a prepayment', () => {
    const after3 = rows[2]!.closingMinor;
    const r = loanCheck({
      rows,
      ledgerBalanceMinor: -(after3 - 10_000_000n),
      asOf: d('2026-10-25'),
      principalMinor: 300_000_000n,
    });
    expect(r.ok).toBe(false);
    expect(r.deltaMinor).toBe(-10_000_000n);
    expect(r.explanation).toMatch(/중도상환/);
  });

  it('expects the full principal before the first payment is due', () => {
    const r = loanCheck({
      rows,
      ledgerBalanceMinor: -300_000_000n,
      asOf: d('2026-08-01'),
      principalMinor: 300_000_000n,
    });
    expect(r.ok).toBe(true);
    expect(r.expectedMinor).toBe(300_000_000n);
  });
});

describe('rowForDate', () => {
  it('finds the row a payment on that date should split into', () => {
    const rows = buildLoanSchedule({ ...MORTGAGE, termMonths: 12, method: 'annuity' });
    const row = rowForDate(rows, d('2026-09-25'));
    // The pre-fill win: a statement says "₩1,247,300 paid to KB" and nothing else.
    // Neither the user nor a vision model can split that without this.
    expect(row!.seq).toBe(2);
    expect(row!.principalMinor + row!.interestMinor).toBeGreaterThan(0n);
    expect(rowForDate(rows, d('2026-09-26'))).toBeNull();
  });
});
