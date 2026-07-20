import { PGlite } from '@electric-sql/pglite';
import {
  type CommodityCode,
  type IsoDate,
  type LedgerStore,
  RATE_SCALE,
  TaxReturn,
} from '@holiday-cfo/core';
import { amounts, KRW, seed } from '@holiday-cfo/store-testkit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { pgliteClient } from './client.js';
import { pgLedgerStore } from './store.js';

/**
 * Twin of packages/store-sqlite/src/tax-return.test.ts — kept out of store-testkit
 * so plan-tax-return-sor base codeAreas cover the change.
 */

describe('postgres tax returns', () => {
  let store: LedgerStore;
  const filedOn = '2026-06-22' as IsoDate;

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

  it('round-trips header+lines atomically with bigint and RATE_SCALE rates', async () => {
    const created = TaxReturn.create({
      id: '01TAXRETURNPG0000000000001',
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
    await store.unitOfWork((uow) => uow.addTaxReturn(mk('01TAXRETURNPG0000000000002')!));
    await expect(
      store.unitOfWork((uow) => uow.addTaxReturn(mk('01TAXRETURNPG0000000000003')!)),
    ).rejects.toThrow();
  });

  it('amend supersedes previous current', async () => {
    const first = TaxReturn.create({
      id: '01TAXRETURNPG0000000000004',
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
      id: '01TAXRETURNPG0000000000005',
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
  });
});
