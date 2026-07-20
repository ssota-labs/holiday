import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type CommodityCode,
  type IsoDate,
  type LedgerStore,
  RATE_SCALE,
  TaxReturn,
} from '@holiday-cfo/core';
import { amounts, KRW, seed } from '@holiday-cfo/store-testkit';

import { sqliteLedgerStore } from './store.js';

/**
 * Tax-return port cases live here (not store-testkit) because plan-tax-return-sor
 * codeAreas on base cover packages/store-sqlite but not packages/store-testkit.
 * Postgres twin: packages/store-postgres/src/tax-return.test.ts.
 */

const dirs: string[] = [];
function tempDb(): string {
  const dir = mkdtempSync(join(tmpdir(), 'holiday-tax-'));
  dirs.push(dir);
  return join(dir, 'ledger.db');
}

afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe('sqlite tax returns', () => {
  let store: LedgerStore;
  const filedOn = '2026-06-22' as IsoDate;

  beforeEach(async () => {
    store = sqliteLedgerStore({
      path: tempDb(),
      book: { functionalCurrency: 'KRW' as CommodityCode, closeGrain: 'month' },
    });
    await store.init();
    await store.migrate();
    await store.unitOfWork((uow) => seed(uow));
  });

  afterEach(async () => {
    await store.close();
  });

  it('round-trips header+lines atomically with bigint and RATE_SCALE rates', async () => {
    const created = TaxReturn.create({
      id: '01TAXRETURNSQLITE000000001',
      form: 'kr_global_income',
      taxYear: 2025,
      period: 'annual',
      filedOn,
      commodity: KRW,
      createdAt: '2026-07-20T00:00:00.000Z',
      columns: {
        global_income: {
          income_amount: '22144107',
          tax_base: '19793527',
          tax_rate: '15.0',
          payable_within_deadline: '1183276',
        },
      },
      amounts,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await store.unitOfWork((uow) => uow.addTaxReturn(created.value));
    const got = await store.read((r) =>
      r.getTaxReturn({ form: 'kr_global_income', year: 2025, period: 'annual' }),
    );
    expect(got).not.toBeNull();
    expect(got!.revision).toBe(1);
    expect(got!.lines.find((l) => l.lineKey === 'income_amount')!.valueScaled).toBe(22_144_107n);
    expect(got!.lines.find((l) => l.lineKey === 'tax_rate')!.valueScaled).toBe((RATE_SCALE * 15n) / 100n);
  });

  it('rejects duplicate (form, year, period, revision)', async () => {
    const mk = (id: string) => {
      const r = TaxReturn.create({
        id,
        form: 'kr_vat',
        taxYear: 2025,
        period: 'H1_final',
        filedOn,
        commodity: KRW,
        createdAt: '2026-07-20T00:00:00.000Z',
        columns: {
          vat: {
            taxable_supply: '48000000',
            output_tax: '4800000',
            input_tax: '1200000',
            payable_tax: '3600000',
          },
        },
        amounts,
      });
      expect(r.ok).toBe(true);
      return r.ok ? r.value : null;
    };
    await store.unitOfWork((uow) => uow.addTaxReturn(mk('01TAXRETURNSQLITE000000002')!));
    await expect(
      store.unitOfWork((uow) => uow.addTaxReturn(mk('01TAXRETURNSQLITE000000003')!)),
    ).rejects.toThrow();
  });

  it('amend supersedes previous current and keeps one current', async () => {
    const first = TaxReturn.create({
      id: '01TAXRETURNSQLITE000000004',
      form: 'kr_global_income',
      taxYear: 2024,
      period: 'annual',
      filedOn,
      commodity: KRW,
      createdAt: '2026-07-20T00:00:00.000Z',
      columns: {
        global_income: {
          income_amount: '100',
          tax_base: '90',
          payable_within_deadline: '10',
        },
      },
      amounts,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    await store.unitOfWork((uow) => uow.addTaxReturn(first.value));

    const amended = TaxReturn.amend({
      id: '01TAXRETURNSQLITE000000005',
      previous: {
        id: first.value.id,
        form: first.value.form,
        taxYear: first.value.taxYear,
        period: first.value.period,
        filedOn: first.value.filedOn,
        revision: first.value.revision,
        status: 'current',
        commodity: first.value.commodity,
        note: null,
        sourcePath: null,
        sourceSha256: null,
        createdAt: first.value.createdAt,
      },
      filedOn: '2026-07-01' as IsoDate,
      commodity: KRW,
      createdAt: '2026-07-20T01:00:00.000Z',
      columns: {
        global_income: {
          income_amount: '200',
          tax_base: '180',
          payable_within_deadline: '20',
        },
      },
      amounts,
    });
    expect(amended.ok).toBe(true);
    if (!amended.ok) return;
    await store.unitOfWork((uow) => uow.addTaxReturn(amended.value));

    const current = await store.read((r) =>
      r.getTaxReturn({ form: 'kr_global_income', year: 2024, period: 'annual' }),
    );
    expect(current!.revision).toBe(2);
    const all = await store.read((r) =>
      r.listTaxReturns({ form: 'kr_global_income', year: 2024, includeSuperseded: true }),
    );
    expect(all.filter((h) => h.status === 'current')).toHaveLength(1);
    expect(all.find((h) => h.revision === 1)!.status).toBe('superseded');
  });

  it('addTaxReturn does not create txn or posting rows', async () => {
    const created = TaxReturn.create({
      id: '01TAXRETURNSQLITE000000006',
      form: 'kr_vat',
      taxYear: 2025,
      period: 'H2_provisional',
      filedOn,
      commodity: KRW,
      createdAt: '2026-07-20T00:00:00.000Z',
      columns: {
        vat: {
          taxable_supply: '1',
          output_tax: '1',
          input_tax: '0',
          payable_tax: '1',
        },
      },
      amounts,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const before = await store.read((r) => r.listTxns({}));
    await store.unitOfWork((uow) => uow.addTaxReturn(created.value));
    const after = await store.read((r) => r.listTxns({}));
    expect(after).toHaveLength(before.length);
  });
});
