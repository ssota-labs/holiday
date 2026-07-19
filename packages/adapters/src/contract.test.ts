import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AccountListResponse,
  IngestSubmitResponse,
  ReviewAcceptResponse,
  ReviewListResponse,
  VerifyResponse,
} from '@holiday-cfo/contracts';
import {
  type Account,
  type AccountId,
  type CommodityCode,
  CommodityRegistry,
  WELL_KNOWN_COMMODITIES,
  accountTypeOf,
  assertAccountCode,
  assertIsoDate,
  createUlidFactory,
} from '@holiday-cfo/core';
import { dispatchHttp, dispatchMcpTool } from '@holiday-cfo/adapters';
import { sqliteLedgerStore } from '@holiday-cfo/store-sqlite';

const nextUlid = createUlidFactory();
const registry = CommodityRegistry.from(WELL_KNOWN_COMMODITIES);

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

async function openFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'holiday-contract-'));
  dirs.push(dir);
  const store = sqliteLedgerStore({
    path: join(dir, 'ledger.db'),
    book: { functionalCurrency: 'KRW' as CommodityCode },
  });
  await store.init();
  await store.migrate();
  await store.unitOfWork(async (uow) => {
    for (const c of registry.all()) await uow.upsertCommodity(c);
    const cash: Account = {
      id: nextUlid() as AccountId,
      code: assertAccountCode('Assets:Bank:Cash'),
      type: accountTypeOf(assertAccountCode('Assets:Bank:Cash')),
      parentId: null,
      commodity: 'KRW' as CommodityCode,
      monetary: true,
      cash: true,
      placeholder: false,
      openedOn: assertIsoDate('2026-01-01'),
      closedOn: null,
    };
    const exp: Account = {
      id: nextUlid() as AccountId,
      code: assertAccountCode('Expenses:Food'),
      type: accountTypeOf(assertAccountCode('Expenses:Food')),
      parentId: null,
      commodity: 'KRW' as CommodityCode,
      monetary: true,
      cash: false,
      placeholder: false,
      openedOn: assertIsoDate('2026-01-01'),
      closedOn: null,
    };
    await uow.upsertAccount(cash);
    await uow.upsertAccount(exp);
  });
  const facade = {
    store,
    functionalCurrency: 'KRW' as CommodityCode,
    chainHead: () => store.chainHead(),
  };
  return { store, facade };
}

const submission = {
  sourceName: 'fixture',
  items: [
    {
      date: '2026-07-01',
      payee: 'Cafe',
      legs: [
        { account: 'Expenses:Food', amount: '5000', commodity: 'KRW' },
        { account: 'Assets:Bank:Cash', amount: '-5000', commodity: 'KRW' },
      ],
    },
  ],
};

describe('CLI/HTTP/MCP contract parity', () => {
  it('returns the same ingest → review → accept → verify shape across HTTP and MCP', async () => {
    const { store, facade } = await openFixture();

    const httpIngest = await dispatchHttp(facade, {
      method: 'POST',
      path: '/ingest/submit',
      body: { submission, idemKey: 'k1' },
    });
    expect(httpIngest.ok).toBe(true);
    const ingestBody = IngestSubmitResponse.parse(httpIngest.body);
    expect(ingestBody.items).toHaveLength(1);
    expect(ingestBody.items[0]!.status).toBe('pending');

    const mcpReplay = await dispatchMcpTool(facade, 'holiday_ingest_submit', {
      submission,
      idemKey: 'k1',
    });
    expect(mcpReplay.ok).toBe(true);
    const replayed = IngestSubmitResponse.parse(mcpReplay.body);
    expect(replayed.replayed).toBe(true);
    expect(replayed.batchId).toBe(ingestBody.batchId);

    const httpAccounts = await dispatchHttp(facade, { method: 'GET', path: '/accounts' });
    const mcpAccounts = await dispatchMcpTool(facade, 'holiday_account_list', {});
    expect(AccountListResponse.parse(httpAccounts.body).accounts.map((a) => a.code).sort()).toEqual(
      AccountListResponse.parse(mcpAccounts.body).accounts.map((a) => a.code).sort(),
    );

    const httpReview = await dispatchHttp(facade, { method: 'GET', path: '/review' });
    const mcpReview = await dispatchMcpTool(facade, 'holiday_review_list', {});
    const listed = ReviewListResponse.parse(httpReview.body);
    expect(listed.items).toHaveLength(1);
    expect(ReviewListResponse.parse(mcpReview.body).items[0]!.id).toBe(listed.items[0]!.id);

    const id = listed.items[0]!.id;
    const httpAccept = await dispatchHttp(facade, { method: 'POST', path: `/review/${id}/accept` });
    expect(ReviewAcceptResponse.parse(httpAccept.body)).toEqual({
      id,
      txnId: ingestBody.items[0]!.txnId,
      status: 'accepted',
    });

    const verify = await dispatchHttp(facade, { method: 'POST', path: '/verify' });
    const v = VerifyResponse.parse(verify.body);
    expect(v.ok).toBe(true);

    // Rejected path error code parity
    const bad = await dispatchMcpTool(facade, 'holiday_review_accept', { id: 'missing' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.body.error.code).toBe('not_found');

    await store.close();
  });
});
