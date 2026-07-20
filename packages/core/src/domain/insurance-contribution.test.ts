import { describe, expect, it } from 'vitest';

import type { IsoDate } from './account.js';
import { AmountFactory } from './amount.js';
import { CommodityRegistry, WELL_KNOWN_COMMODITIES } from './commodity.js';
import {
  InsuranceContribution,
  assertYearMonth,
  isYearMonth,
  type InsuranceContributionHeader,
} from './insurance-contribution.js';

const d = (s: string) => s as IsoDate;
const registry = CommodityRegistry.from(WELL_KNOWN_COMMODITIES);
const amounts = new AmountFactory(registry);

const LINES = [
  { kind: 'health_insurance', amount: '143800' },
  { kind: 'long_term_care', amount: '18890' },
  { kind: 'national_pension', amount: '189000' },
];

function baseInput(over: Partial<Parameters<typeof InsuranceContribution.create>[0]> = {}) {
  return {
    id: '01CONTRIB00000000000000001',
    yearMonth: '2026-03',
    recordedOn: d('2026-03-25'),
    commodity: 'KRW' as const,
    createdAt: '2026-07-20T00:00:00.000Z',
    lines: LINES,
    amounts,
    ...over,
  };
}

describe('InsuranceContribution.create — POLICY-023', () => {
  it('accepts a direct-pay month with bigint minors', () => {
    const r = InsuranceContribution.create(baseInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.revision).toBe(1);
    expect(r.value.status).toBe('current');
    expect(r.value.lines).toHaveLength(3);
    expect(r.value.lines.find((l) => l.kind === 'health_insurance')!.amountMinor).toBe(143_800n);
  });

  it('rejects empty lines', () => {
    const r = InsuranceContribution.create(baseInput({ lines: [] }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.some((e) => e.code === 'empty_lines')).toBe(true);
  });

  it('rejects duplicate kinds', () => {
    const r = InsuranceContribution.create(
      baseInput({
        lines: [
          { kind: 'health_insurance', amount: '1' },
          { kind: 'health_insurance', amount: '2' },
        ],
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.some((e) => e.code === 'duplicate_kind')).toBe(true);
  });

  it('rejects unknown kinds (employment_insurance out of v1)', () => {
    const r = InsuranceContribution.create(
      baseInput({
        lines: [{ kind: 'employment_insurance', amount: '1000' }],
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.some((e) => e.code === 'unknown_kind')).toBe(true);
  });

  it('rejects invalid year_month', () => {
    const r = InsuranceContribution.create(baseInput({ yearMonth: '2026-13' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.some((e) => e.code === 'invalid_year_month')).toBe(true);
  });

  it('rejects negative amounts', () => {
    const r = InsuranceContribution.create(
      baseInput({ lines: [{ kind: 'national_pension', amount: '-1' }] }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.some((e) => e.code === 'negative_amount')).toBe(true);
  });

  it('amend supersedes previous and bumps revision', () => {
    const first = InsuranceContribution.create(baseInput());
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const previous: InsuranceContributionHeader = {
      id: first.value.id,
      yearMonth: first.value.yearMonth,
      recordedOn: first.value.recordedOn,
      revision: first.value.revision,
      status: 'current',
      commodity: first.value.commodity,
      note: null,
      sourcePath: null,
      sourceSha256: null,
      createdAt: first.value.createdAt,
    };
    const amended = InsuranceContribution.amend({
      id: '01CONTRIB00000000000000002',
      previous,
      recordedOn: d('2026-04-01'),
      commodity: 'KRW',
      createdAt: '2026-07-20T01:00:00.000Z',
      lines: [{ kind: 'health_insurance', amount: '150000' }],
      amounts,
    });
    expect(amended.ok).toBe(true);
    if (!amended.ok) return;
    expect(amended.value.revision).toBe(2);
    expect(amended.value.supersedeId).toBe(first.value.id);
  });
});

describe('YearMonth', () => {
  it('accepts YYYY-MM', () => {
    expect(isYearMonth('2026-03')).toBe(true);
    expect(assertYearMonth('2026-03')).toBe('2026-03');
  });
  it('rejects bad shapes', () => {
    expect(isYearMonth('2026-3')).toBe(false);
    expect(isYearMonth('26-03')).toBe(false);
  });
});
