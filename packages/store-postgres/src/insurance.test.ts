import { PGlite } from '@electric-sql/pglite';
import {
  type CommodityCode,
  type IsoDate,
  type LedgerStore,
  InsuranceContribution,
  InsuranceEnrollment,
} from '@holiday-cfo/core';
import { amounts, KRW, seed } from '@holiday-cfo/store-testkit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { pgliteClient } from './client.js';
import { pgLedgerStore } from './store.js';

/**
 * Twin of packages/store-sqlite/src/insurance.test.ts — plan-007.
 */

describe('postgres insurance enrollment + contribution', () => {
  let store: LedgerStore;

  beforeEach(async () => {
    store = pgLedgerStore({
      client: pgliteClient(new PGlite()),
      book: { functionalCurrency: 'KRW' as CommodityCode },
    });
    await store.init();
    await store.migrate();
    await store.unitOfWork((uow) => seed(uow));
  });

  afterEach(async () => {
    await store.close();
  });

  it('round-trips enrollment and auto-closes open prior on successor', async () => {
    const first = InsuranceEnrollment.create({
      id: '01ENROLLPG0000000000000001',
      scheme: 'health',
      status: 'workplace',
      startsOn: '2025-09-01' as IsoDate,
      createdAt: '2026-07-20T00:00:00.000Z',
      existing: [],
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    await store.unitOfWork((uow) => uow.addInsuranceEnrollment(first.value));

    const existing = await store.read((r) => r.listInsuranceEnrollments({ scheme: 'health' }));
    const second = InsuranceEnrollment.create({
      id: '01ENROLLPG0000000000000002',
      scheme: 'health',
      status: 'regional',
      startsOn: '2026-03-01' as IsoDate,
      createdAt: '2026-07-20T01:00:00.000Z',
      existing: existing.map((e) => ({
        id: e.id,
        startsOn: e.startsOn,
        endsOn: e.endsOn,
      })),
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    await store.unitOfWork((uow) => uow.addInsuranceEnrollment(second.value));

    const all = await store.read((r) => r.listInsuranceEnrollments({ scheme: 'health' }));
    expect(all).toHaveLength(2);
    const closed = all.find((e) => e.id === first.value.id)!;
    expect(closed.endsOn).toBe('2026-02-28');
    expect(all.find((e) => e.status === 'regional')!.endsOn).toBeNull();
  });

  it('round-trips contribution header+lines with bigint and amend', async () => {
    const created = InsuranceContribution.create({
      id: '01CONTRIBPG000000000000001',
      yearMonth: '2026-03',
      recordedOn: '2026-03-25' as IsoDate,
      commodity: KRW,
      createdAt: '2026-07-20T00:00:00.000Z',
      lines: [
        { kind: 'health_insurance', amount: '143800' },
        { kind: 'long_term_care', amount: '18890' },
        { kind: 'national_pension', amount: '189000' },
      ],
      amounts,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    await store.unitOfWork((uow) => uow.addInsuranceContribution(created.value));

    const got = await store.read((r) =>
      r.getInsuranceContribution({ yearMonth: created.value.yearMonth }),
    );
    expect(got).not.toBeNull();
    expect(got!.lines.find((l) => l.kind === 'health_insurance')!.amountMinor).toBe(143_800n);

    const amended = InsuranceContribution.amend({
      id: '01CONTRIBPG000000000000002',
      previous: {
        id: created.value.id,
        yearMonth: created.value.yearMonth,
        recordedOn: created.value.recordedOn,
        revision: created.value.revision,
        status: 'current',
        commodity: created.value.commodity,
        note: null,
        sourcePath: null,
        sourceSha256: null,
        createdAt: created.value.createdAt,
      },
      recordedOn: '2026-04-01' as IsoDate,
      commodity: KRW,
      createdAt: '2026-07-20T01:00:00.000Z',
      lines: [{ kind: 'health_insurance', amount: '150000' }],
      amounts,
    });
    expect(amended.ok).toBe(true);
    if (!amended.ok) return;
    await store.unitOfWork((uow) => uow.addInsuranceContribution(amended.value));

    const current = await store.read((r) =>
      r.getInsuranceContribution({ yearMonth: created.value.yearMonth }),
    );
    expect(current!.revision).toBe(2);
    const all = await store.read((r) =>
      r.listInsuranceContributions({
        yearMonth: created.value.yearMonth,
        includeSuperseded: true,
      }),
    );
    expect(all.filter((h) => h.status === 'current')).toHaveLength(1);
    expect(all.find((h) => h.revision === 1)!.status).toBe('superseded');
  });

  it('addInsurance* does not create txn or posting rows', async () => {
    const en = InsuranceEnrollment.create({
      id: '01ENROLLPG0000000000000099',
      scheme: 'health',
      status: 'workplace',
      startsOn: '2024-01-01' as IsoDate,
      createdAt: '2026-07-20T00:00:00.000Z',
      existing: [],
    });
    const contrib = InsuranceContribution.create({
      id: '01CONTRIBPG000000000000099',
      yearMonth: '2026-01',
      recordedOn: '2026-01-15' as IsoDate,
      commodity: KRW,
      createdAt: '2026-07-20T00:00:00.000Z',
      lines: [{ kind: 'health_insurance', amount: '1' }],
      amounts,
    });
    expect(en.ok && contrib.ok).toBe(true);
    if (!en.ok || !contrib.ok) return;
    const before = await store.read((r) => r.listTxns({}));
    await store.unitOfWork(async (uow) => {
      await uow.addInsuranceEnrollment(en.value);
      await uow.addInsuranceContribution(contrib.value);
    });
    const after = await store.read((r) => r.listTxns({}));
    expect(after.length).toBe(before.length);
  });
});
