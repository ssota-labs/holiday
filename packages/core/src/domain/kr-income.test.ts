import { describe, expect, it } from 'vitest';

import type { IsoDate } from './account.js';
import {
  KR_STATUTE_2026,
  buildSettlementLines,
  checkIncomeSettlement,
  pensionContributionBase,
  truncApplyRate,
} from './kr-income.js';
import { RATE_SCALE } from './rate.js';

const d = (s: string) => s as IsoDate;

describe('truncApplyRate', () => {
  it('절사한다 — 반올림하지 않는다', () => {
    // 1_000_001 × 3% = 30_000.03 → 30_000
    expect(truncApplyRate(1_000_001n, RATE_SCALE * 3n / 100n)).toBe(30_000n);
  });
});

describe('business_withholding', () => {
  it('builds 3% + 10%-of-that local tax (3.3%)', () => {
    const { lines, netMinor } = buildSettlementLines({
      regime: 'business_withholding',
      grossMinor: 10_000_000n,
      paidOn: d('2026-07-15'),
    });
    expect(lines).toEqual([
      { seq: 1, kind: 'income_tax_3', amountMinor: 300_000n },
      { seq: 2, kind: 'local_tax_0_3', amountMinor: 30_000n },
    ]);
    expect(netMinor).toBe(9_670_000n);
  });

  it('computes local tax as 10% of income tax (법정 문구)', () => {
    const gross = 1_000_010n;
    const { lines } = buildSettlementLines({
      regime: 'business_withholding',
      grossMinor: gross,
      paidOn: d('2026-03-01'),
    });
    const incomeTax = lines.find((l) => l.kind === 'income_tax_3')!.amountMinor;
    const local = lines.find((l) => l.kind === 'local_tax_0_3')!.amountMinor;
    expect(incomeTax).toBe(truncApplyRate(gross, RATE_SCALE * 3n / 100n));
    expect(local).toBe(truncApplyRate(incomeTax, RATE_SCALE * 10n / 100n));
  });
});

describe('business_vat', () => {
  it('adds 10% VAT to supply — cash in is supply+vat', () => {
    const { lines, netMinor } = buildSettlementLines({
      regime: 'business_vat',
      grossMinor: 3_860_250n,
      paidOn: d('2026-07-01'),
    });
    expect(lines).toEqual([{ seq: 1, kind: 'vat_10', amountMinor: 386_025n }]);
    expect(netMinor).toBe(3_860_250n + 386_025n);
  });
});

describe('allowance', () => {
  it('has no deduction lines', () => {
    const { lines, netMinor } = buildSettlementLines({
      regime: 'allowance',
      grossMinor: 161_800n,
      paidOn: d('2026-07-10'),
    });
    expect(lines).toEqual([]);
    expect(netMinor).toBe(161_800n);
  });
});

describe('salary / 4대보험', () => {
  it('refuses salary without 갑근세', () => {
    expect(() =>
      buildSettlementLines({
        regime: 'salary',
        grossMinor: 3_000_000n,
        paidOn: d('2026-07-25'),
      }),
    ).toThrow(/earnedIncomeTaxMinor/);
  });

  it('computes 2026 employee shares with pension ceiling after July', () => {
    // ₩8,000,000 — pension base capped at 6,590,000 from 2026-07
    const { lines, netMinor } = buildSettlementLines({
      regime: 'salary',
      grossMinor: 8_000_000n,
      paidOn: d('2026-07-25'),
      earnedIncomeTaxMinor: 400_000n,
    });
    const by = Object.fromEntries(lines.map((l) => [l.kind, l.amountMinor]));
    expect(by.national_pension).toBe(truncApplyRate(6_590_000n, KR_STATUTE_2026.pensionEmployeeRate));
    expect(by.health_insurance).toBe(truncApplyRate(8_000_000n, KR_STATUTE_2026.healthEmployeeRate));
    expect(by.long_term_care).toBe(
      truncApplyRate(by.health_insurance!, KR_STATUTE_2026.longTermCareOnHealthRate),
    );
    expect(by.employment_insurance).toBe(
      truncApplyRate(8_000_000n, KR_STATUTE_2026.employmentEmployeeRate),
    );
    expect(by.earned_income_tax).toBe(400_000n);
    expect(by.local_income_tax).toBe(40_000n);
    const deducted = lines.reduce((s, l) => s + l.amountMinor, 0n);
    expect(netMinor).toBe(8_000_000n - deducted);
  });

  it('uses pre-July pension ceiling for June pay', () => {
    expect(pensionContributionBase(8_000_000n, d('2026-06-25'))).toBe(6_370_000n);
    expect(pensionContributionBase(8_000_000n, d('2026-07-01'))).toBe(6_590_000n);
  });

  it('truncates pension base to 천 원', () => {
    expect(pensionContributionBase(3_456_789n, d('2026-07-01'))).toBe(3_456_000n);
  });
});

describe('checkIncomeSettlement', () => {
  it('passes a settlement built from the same statute', () => {
    const built = buildSettlementLines({
      regime: 'business_withholding',
      grossMinor: 13_692_720n,
      paidOn: d('2026-07-15'),
    });
    const result = checkIncomeSettlement({
      regime: 'business_withholding',
      settlement: {
        id: 's1',
        sourceId: 'src',
        paidOn: d('2026-07-15'),
        grossMinor: 13_692_720n,
        netMinor: built.netMinor,
        commodity: 'KRW',
        statuteAsOf: built.statuteAsOf,
        txnId: null,
        label: null,
      },
      lines: built.lines,
    });
    expect(result.ok).toBe(true);
  });

  it('flags a hand-edited withholding line', () => {
    const built = buildSettlementLines({
      regime: 'business_withholding',
      grossMinor: 1_000_000n,
      paidOn: d('2026-07-15'),
    });
    const badLines = built.lines.map((l) =>
      l.kind === 'income_tax_3' ? { ...l, amountMinor: 50_000n } : l,
    );
    const result = checkIncomeSettlement({
      regime: 'business_withholding',
      settlement: {
        id: 's1',
        sourceId: 'src',
        paidOn: d('2026-07-15'),
        grossMinor: 1_000_000n,
        netMinor: built.netMinor,
        commodity: 'KRW',
        statuteAsOf: built.statuteAsOf,
        txnId: null,
        label: null,
      },
      lines: badLines,
    });
    expect(result.ok).toBe(false);
    expect(result.mismatched.some((m) => m.kind === 'income_tax_3')).toBe(true);
  });
});
