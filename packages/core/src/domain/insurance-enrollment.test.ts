import { describe, expect, it } from 'vitest';

import type { IsoDate } from './account.js';
import {
  InsuranceEnrollment,
  dayBeforeIso,
  enrollmentCovers,
  enrollmentRangesOverlap,
  statusAllowedForScheme,
} from './insurance-enrollment.js';

const d = (s: string) => s as IsoDate;

describe('InsuranceEnrollment.create — POLICY-023', () => {
  it('accepts an open workplace health enrollment', () => {
    const r = InsuranceEnrollment.create({
      id: '01ENROLL000000000000000001',
      scheme: 'health',
      status: 'workplace',
      startsOn: d('2025-09-01'),
      createdAt: '2026-07-20T00:00:00.000Z',
      existing: [],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.endsOn).toBeNull();
    expect(r.value.closeId).toBeNull();
  });

  it('rejects voluntary on health', () => {
    const r = InsuranceEnrollment.create({
      id: '01ENROLL000000000000000002',
      scheme: 'health',
      status: 'voluntary',
      startsOn: d('2025-09-01'),
      createdAt: '2026-07-20T00:00:00.000Z',
      existing: [],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.some((e) => e.code === 'invalid_status_for_scheme')).toBe(true);
  });

  it('accepts voluntary on national_pension', () => {
    expect(statusAllowedForScheme('national_pension', 'voluntary')).toBe(true);
    const r = InsuranceEnrollment.create({
      id: '01ENROLL000000000000000003',
      scheme: 'national_pension',
      status: 'voluntary',
      startsOn: d('2025-01-01'),
      endsOn: d('2025-06-30'),
      createdAt: '2026-07-20T00:00:00.000Z',
      existing: [],
    });
    expect(r.ok).toBe(true);
  });

  it('rejects ends_on before starts_on', () => {
    const r = InsuranceEnrollment.create({
      id: '01ENROLL000000000000000004',
      scheme: 'health',
      status: 'regional',
      startsOn: d('2026-03-01'),
      endsOn: d('2026-02-01'),
      createdAt: '2026-07-20T00:00:00.000Z',
      existing: [],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.some((e) => e.code === 'invalid_date_order')).toBe(true);
  });

  it('rejects overlapping closed intervals', () => {
    const r = InsuranceEnrollment.create({
      id: '01ENROLL000000000000000005',
      scheme: 'health',
      status: 'regional',
      startsOn: d('2025-06-01'),
      endsOn: d('2025-08-31'),
      createdAt: '2026-07-20T00:00:00.000Z',
      existing: [
        {
          id: '01ENROLL000000000000000000',
          startsOn: d('2025-01-01'),
          endsOn: d('2025-06-30'),
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.some((e) => e.code === 'overlap')).toBe(true);
  });

  it('auto-closes a single open prior when adding a successor', () => {
    const r = InsuranceEnrollment.create({
      id: '01ENROLL000000000000000006',
      scheme: 'health',
      status: 'regional',
      startsOn: d('2026-03-01'),
      createdAt: '2026-07-20T00:00:00.000Z',
      existing: [
        {
          id: '01ENROLL000000000000000000',
          startsOn: d('2025-09-01'),
          endsOn: null,
        },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.closeId).toBe('01ENROLL000000000000000000');
    expect(r.value.closeEndsOn).toBe('2026-02-28');
    expect(dayBeforeIso(d('2026-03-01'))).toBe('2026-02-28');
  });

  it('rejects overlap with a closed interval even when auto-close is on', () => {
    const r = InsuranceEnrollment.create({
      id: '01ENROLL000000000000000007',
      scheme: 'health',
      status: 'workplace',
      startsOn: d('2025-05-01'),
      endsOn: d('2025-07-01'),
      createdAt: '2026-07-20T00:00:00.000Z',
      existing: [
        {
          id: '01ENROLL000000000000000000',
          startsOn: d('2025-01-01'),
          endsOn: d('2025-12-31'),
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.some((e) => e.code === 'overlap')).toBe(true);
  });
});

describe('enrollmentRangesOverlap / enrollmentCovers', () => {
  it('treats open end as infinity', () => {
    expect(
      enrollmentRangesOverlap(d('2025-01-01'), null, d('2026-01-01'), d('2026-06-30')),
    ).toBe(true);
  });

  it('adjacent closed ranges do not overlap', () => {
    expect(
      enrollmentRangesOverlap(d('2025-01-01'), d('2025-06-30'), d('2025-07-01'), null),
    ).toBe(false);
  });

  it('covers inclusive bounds', () => {
    const e = { startsOn: d('2025-09-01'), endsOn: d('2026-02-28') as IsoDate | null };
    expect(enrollmentCovers(e, d('2025-09-01'))).toBe(true);
    expect(enrollmentCovers(e, d('2026-02-28'))).toBe(true);
    expect(enrollmentCovers(e, d('2026-03-01'))).toBe(false);
    expect(enrollmentCovers({ startsOn: d('2025-09-01'), endsOn: null }, d('2099-01-01'))).toBe(
      true,
    );
  });
});
