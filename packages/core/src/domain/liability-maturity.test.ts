import { describe, expect, it } from 'vitest';

import type { AccountCode, AccountId, IsoDate } from './account.js';
import {
  classifyLiabilityMaturity,
  maturityWindowEnd,
  type LiabilityBalanceForMaturity,
  type MaturityScheduleRow,
} from './liability-maturity.js';

const d = (s: string) => s as IsoDate;
const id = (s: string) => s as AccountId;
const code = (s: string) => s as AccountCode;

function bal(
  accountId: string,
  accountCode: string,
  weightMinor: bigint,
): LiabilityBalanceForMaturity {
  return { accountId: id(accountId), accountCode: code(accountCode), weightMinor };
}

function row(accountId: string, dueDate: string, principalMinor: bigint): MaturityScheduleRow {
  return { accountId: id(accountId), dueDate: d(dueDate), principalMinor };
}

describe('maturityWindowEnd', () => {
  it('is asOf + 12 calendar months with month-end clamp', () => {
    expect(maturityWindowEnd(d('2026-07-31'))).toBe('2027-07-31');
    expect(maturityWindowEnd(d('2026-01-31'))).toBe('2027-01-31');
    expect(maturityWindowEnd(d('2024-02-29'))).toBe('2025-02-28');
  });
});

describe('classifyLiabilityMaturity', () => {
  it('treats card-only liabilities as all current', () => {
    // SPEC 수락 1: 카드만 → 전액 유동, 비유동 0
    const summary = classifyLiabilityMaturity({
      asOf: d('2026-07-31'),
      balances: [bal('card', 'Liabilities:Card:Shinhan', -1_240_000n)],
      scheduleRows: [],
    });
    expect(summary).toEqual({
      asOf: '2026-07-31',
      currentMinor: 1_240_000n,
      nonCurrentMinor: 0n,
      totalMinor: 1_240_000n,
      byAccount: [
        {
          accountId: 'card',
          accountCode: 'Liabilities:Card:Shinhan',
          currentMinor: 1_240_000n,
          nonCurrentMinor: 0n,
          totalMinor: 1_240_000n,
        },
      ],
    });
  });

  it('splits an 18-month installment into 12 current + 6 non-current', () => {
    // SPEC 수락 2: 남은 원금 회차 18개월 → 유동 12 + 비유동 6, 합 = 잔액
    const asOf = d('2026-07-31');
    const account = 'inst';
    const principals = Array.from({ length: 18 }, () => 100_000n);
    const scheduleRows = principals.map((p, i) => {
      // 창: (2026-07-31, 2027-07-31] — 2026-08-31 … 2027-07-31 = 12개월, 이후 6
      const y = 2026 + Math.floor((8 + i - 1) / 12);
      const m = ((8 + i - 1) % 12) + 1;
      const due = `${y}-${String(m).padStart(2, '0')}-28`;
      return row(account, due, p);
    });
    expect(scheduleRows[0]!.dueDate).toBe('2026-08-28');
    expect(scheduleRows[11]!.dueDate).toBe('2027-07-28');
    expect(scheduleRows[12]!.dueDate).toBe('2027-08-28');
    expect(scheduleRows[17]!.dueDate).toBe('2028-01-28');

    const summary = classifyLiabilityMaturity({
      asOf,
      balances: [bal(account, 'Liabilities:Card:Shinhan:Installment', -1_800_000n)],
      scheduleRows,
    });
    expect(summary.currentMinor).toBe(1_200_000n);
    expect(summary.nonCurrentMinor).toBe(600_000n);
    expect(summary.totalMinor).toBe(1_800_000n);
    expect(summary.currentMinor + summary.nonCurrentMinor).toBe(summary.totalMinor);
  });

  it('puts schedule shortfall onto current when schedule < balance', () => {
    // SPEC 수락 3: 스케줄 원금 합 < 장부 → 합은 장부, 부족분은 유동
    const summary = classifyLiabilityMaturity({
      asOf: d('2026-07-31'),
      balances: [bal('loan', 'Liabilities:Loans:KB:Mortgage', -90_000_000n)],
      scheduleRows: [
        row('loan', '2026-08-15', 500_000n),
        row('loan', '2026-09-15', 500_000n),
        // …의도적으로 스케줄을 짧게 둠
        row('loan', '2028-01-15', 1_000_000n),
      ],
    });
    // 창 안 1_000_000 + 창 밖 1_000_000 = S 2_000_000; B 90_000_000
    // 부족 88_000_000 → 유동
    expect(summary.currentMinor).toBe(1_000_000n + 88_000_000n);
    expect(summary.nonCurrentMinor).toBe(1_000_000n);
    expect(summary.totalMinor).toBe(90_000_000n);
  });

  it('scales down when schedule exceeds balance, fixing remainder on current', () => {
    const summary = classifyLiabilityMaturity({
      asOf: d('2026-07-31'),
      balances: [bal('loan', 'Liabilities:Loans:KB', -100n)],
      scheduleRows: [
        row('loan', '2026-08-01', 60n),
        row('loan', '2028-08-01', 40n),
      ],
    });
    // S=100 would be exact; exaggerate to 200 then B=100 → half
    const over = classifyLiabilityMaturity({
      asOf: d('2026-07-31'),
      balances: [bal('loan', 'Liabilities:Loans:KB', -100n)],
      scheduleRows: [
        row('loan', '2026-08-01', 120n),
        row('loan', '2028-08-01', 80n),
      ],
    });
    expect(summary.currentMinor + summary.nonCurrentMinor).toBe(100n);
    expect(over.currentMinor + over.nonCurrentMinor).toBe(100n);
    // nonCurrent = (80 * 100) / 200 = 40; current = 60
    expect(over.nonCurrentMinor).toBe(40n);
    expect(over.currentMinor).toBe(60n);
  });

  it('ignores interest-only rows (zero principal) and treats leftover balance as current', () => {
    const summary = classifyLiabilityMaturity({
      asOf: d('2026-07-31'),
      balances: [bal('loan', 'Liabilities:Loans:IO', -50_000_000n)],
      scheduleRows: [
        row('loan', '2026-08-01', 0n),
        row('loan', '2026-09-01', 0n),
        row('loan', '2027-08-01', 0n),
      ],
    });
    expect(summary.currentMinor).toBe(50_000_000n);
    expect(summary.nonCurrentMinor).toBe(0n);
  });

  it('puts a bullet maturity outside the window entirely in non-current', () => {
    const summary = classifyLiabilityMaturity({
      asOf: d('2026-07-31'),
      balances: [bal('loan', 'Liabilities:Loans:Bullet', -10_000_000n)],
      scheduleRows: [row('loan', '2030-07-31', 10_000_000n)],
    });
    expect(summary.currentMinor).toBe(0n);
    expect(summary.nonCurrentMinor).toBe(10_000_000n);
  });

  it('excludes schedule rows on or before asOf', () => {
    const summary = classifyLiabilityMaturity({
      asOf: d('2026-07-31'),
      balances: [bal('inst', 'Liabilities:Card:X:Installment', -200_000n)],
      scheduleRows: [
        row('inst', '2026-07-31', 100_000n), // asOf — 창 밖(이전)
        row('inst', '2026-08-31', 100_000n),
        row('inst', '2026-09-30', 100_000n), // 스케줄>잔액 → 비율 축소
      ],
    });
    expect(summary.totalMinor).toBe(200_000n);
    expect(summary.currentMinor + summary.nonCurrentMinor).toBe(200_000n);
  });

  it('skips zero and credit-overpaid liability weights', () => {
    const summary = classifyLiabilityMaturity({
      asOf: d('2026-07-31'),
      balances: [
        bal('zero', 'Liabilities:Card:A', 0n),
        bal('over', 'Liabilities:Card:B', 50_000n),
        bal('debt', 'Liabilities:Card:C', -10_000n),
      ],
      scheduleRows: [],
    });
    expect(summary.byAccount).toHaveLength(1);
    expect(summary.totalMinor).toBe(10_000n);
  });

  it('aggregates multi-commodity weights per account', () => {
    const summary = classifyLiabilityMaturity({
      asOf: d('2026-07-31'),
      balances: [
        bal('card', 'Liabilities:Card:Multi', -100_000n),
        bal('card', 'Liabilities:Card:Multi', -50_000n),
      ],
      scheduleRows: [],
    });
    expect(summary.totalMinor).toBe(150_000n);
    expect(summary.byAccount).toHaveLength(1);
  });
});
