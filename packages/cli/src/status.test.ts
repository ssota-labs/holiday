import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  assertAccountCode,
  assertIsoDate,
  type Account,
  type AccountId,
  type CommodityCode,
} from '@holiday-cfo/core';
import { afterEach, describe, expect, it } from 'vitest';

import { isoTimestampInTimeZone, writeLedgerStatus } from './status.js';
import { createWorkspace, openLedger, requireWorkspace } from './workspace.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('writeLedgerStatus', () => {
  it('rewrites status.md from ledger structure and ignores hand edits', async () => {
    const root = mkdtempSync(join(tmpdir(), 'holiday-status-'));
    dirs.push(root);
    const ws = createWorkspace(root, {
      functionalCurrency: 'KRW' as CommodityCode,
      closeGrain: 'month',
      timezone: 'Asia/Seoul',
      store: 'sqlite',
    });
    const store = await openLedger(ws);

    const checking = makeAccount('01J00000000000000000000001', 'Assets:Bank:Checking', 'asset', true);
    const card = makeAccount('01J00000000000000000000002', 'Liabilities:Card:Everyday', 'liability');
    await store.unitOfWork(async (write) => {
      await write.upsertAccount(checking);
      await write.upsertAccount(card);
      await write.upsertCard({
        accountId: card.id,
        fundingAccountId: checking.id,
        label: '생활 카드',
        rule: { cycleCloseDay: 14, paymentDay: 25, paymentMonthOffset: 1 },
      });
    });

    const now = new Date('2026-07-23T03:20:00Z');
    const first = await writeLedgerStatus(ws, store, 'Asia/Seoul', now);
    expect(first).toEqual({
      statusPath: join(root, 'status.md'),
      generatedAt: '2026-07-23T12:20:00+09:00',
    });
    const expected = readFileSync(first.statusPath, 'utf8');
    expect(expected).toContain('Checking (쓸 수 있는 돈)');
    expect(expected).toContain('생활 카드 — `Liabilities:Card:Everyday`');
    expect(expected).not.toMatch(/잔액|minor|₩/i);

    writeFileSync(first.statusPath, '# 손으로 바꾼 내용\n');
    await writeLedgerStatus(ws, store, 'Asia/Seoul', now);
    expect(readFileSync(first.statusPath, 'utf8')).toBe(expected);
    expect(await store.read((read) => read.listAccounts())).toHaveLength(2);
    await store.close();
  });

  it('does not create status.md when no ledger workspace exists', () => {
    const root = mkdtempSync(join(tmpdir(), 'holiday-no-status-'));
    dirs.push(root);
    expect(() => requireWorkspace(root)).toThrow(/no \.holiday\/ found/);
    expect(existsSync(join(root, 'status.md'))).toBe(false);
  });
});

describe('isoTimestampInTimeZone', () => {
  it('includes the configured timezone offset', () => {
    const now = new Date('2026-07-23T03:20:00Z');
    expect(isoTimestampInTimeZone(now, 'Asia/Seoul')).toBe('2026-07-23T12:20:00+09:00');
    expect(isoTimestampInTimeZone(now, 'UTC')).toBe('2026-07-23T03:20:00+00:00');
  });
});

function makeAccount(
  id: string,
  code: string,
  type: Account['type'],
  cash = false,
): Account {
  return {
    id: id as AccountId,
    code: assertAccountCode(code),
    type,
    parentId: null,
    commodity: null,
    monetary: true,
    cash,
    placeholder: false,
    openedOn: assertIsoDate('2026-01-01'),
    closedOn: null,
  };
}
