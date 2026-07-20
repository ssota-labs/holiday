import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import type { CommodityCode } from '@holiday-cfo/core';
import { runLedgerStoreConformance, seed, simpleTxn } from '@holiday-cfo/store-testkit';

import { Db } from './db.js';
import { MigrationDriftError } from '@holiday-cfo/store-sql';
import { sqliteLedgerStore } from './store.js';

const dirs: string[] = [];
function tempDb(): string {
  const dir = mkdtempSync(join(tmpdir(), 'holiday-'));
  dirs.push(dir);
  return join(dir, 'ledger.db');
}

afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

const newStore = async () =>
  sqliteLedgerStore({
    path: tempDb(),
    book: { functionalCurrency: 'KRW' as CommodityCode, closeGrain: 'month' },
  });

// The executable port contract. If this fails, the adapter is not an engine.
runLedgerStoreConformance('sqlite', newStore);

describe('sqlite — audit hash chain', () => {
  it('chains every mutation from genesis', async () => {
    const store = await newStore();
    await store.init();
    await store.migrate();
    const f = await store.unitOfWork((uow) => seed(uow));

    const tx = simpleTxn(f, 4500n);
    await store.unitOfWork((uow) => uow.appendTxn(tx, { status: 'draft' }));
    await store.unitOfWork((uow) => uow.promoteDraft(tx.id));

    const report = await store.unitOfWork((uow) => uow.verify());
    expect(report.problems).toEqual([]);

    const head = await store.chainHead();
    expect(head!.seq).toBe(2); // append + promote
    expect(head!.hash).toMatch(/^[0-9a-f]{64}$/);
    await store.close();
  });

  it('DETECTS a hand-edited posting that still balances', async () => {
    // The point of hashing content rather than ids. Every other check passes:
    // the transaction balances, the commodities conform, the weights are
    // identity-consistent. Only the chain notices.
    const path = tempDb();
    const store = sqliteLedgerStore({
      path,
      book: { functionalCurrency: 'KRW' as CommodityCode },
    });
    await store.init();
    await store.migrate();
    const f = await store.unitOfWork((uow) => seed(uow));
    const tx = simpleTxn(f, 4500n);
    await store.unitOfWork((uow) => uow.appendTxn(tx, { status: 'posted' }));
    expect((await store.unitOfWork((uow) => uow.verify())).ok).toBe(true);
    await store.close();

    // Someone opens the file with the sqlite3 CLI and "fixes" a number. The
    // immutability triggers block them outright, so a determined edit means
    // dropping the triggers first — which is precisely the scenario the chain
    // exists for. Both legs are edited, so the ledger still sums to zero and
    // every non-chain check still passes.
    const raw = new Db(path);
    raw.exec('DROP TRIGGER posting_immutable_update');
    raw.exec(`
      UPDATE posting SET units_minor = 9900, weight_minor = 9900 WHERE txn_id = '${tx.id}' AND seq = 0;
      UPDATE posting SET units_minor = -9900, weight_minor = -9900 WHERE txn_id = '${tx.id}' AND seq = 1;
    `);
    raw.close();

    const reopened = sqliteLedgerStore({ path, book: { functionalCurrency: 'KRW' as CommodityCode } });
    await reopened.init();
    await reopened.migrate();
    const report = await reopened.unitOfWork((uow) => uow.verify());

    expect(report.ok).toBe(false);
    expect(report.problems.map((p) => p.kind)).toContain('content_tampered');
    expect(report.problems.find((p) => p.kind === 'content_tampered')!.detail).toMatch(/balances, but it is not/);
    await reopened.close();
  });

  it('DETECTS an altered audit row', async () => {
    const path = tempDb();
    const store = sqliteLedgerStore({ path, book: { functionalCurrency: 'KRW' as CommodityCode } });
    await store.init();
    await store.migrate();
    const f = await store.unitOfWork((uow) => seed(uow));
    await store.unitOfWork((uow) => uow.appendTxn(simpleTxn(f, 100n), { status: 'posted' }));
    await store.close();

    const raw = new Db(path);
    // The append-only triggers make this the only way in — which is itself the
    // point: an audit log you can quietly UPDATE is decoration.
    raw.exec('DROP TRIGGER audit_log_immutable_update');
    raw.exec(`UPDATE audit_log SET at = '1999-01-01T00:00:00.000Z' WHERE seq = 1`);
    raw.close();

    const reopened = sqliteLedgerStore({ path, book: { functionalCurrency: 'KRW' as CommodityCode } });
    await reopened.init();
    await reopened.migrate();
    const report = await reopened.unitOfWork((uow) => uow.verify());
    expect(report.problems.map((p) => p.kind)).toContain('chain_broken');
    await reopened.close();
  });

  it('refuses to UPDATE or DELETE the audit log at all', async () => {
    const path = tempDb();
    const store = sqliteLedgerStore({ path, book: { functionalCurrency: 'KRW' as CommodityCode } });
    await store.init();
    await store.migrate();
    const f = await store.unitOfWork((uow) => seed(uow));
    await store.unitOfWork((uow) => uow.appendTxn(simpleTxn(f, 1n), { status: 'posted' }));
    await store.close();

    const raw = new Db(path);
    expect(() => raw.exec(`UPDATE audit_log SET event = 'nope' WHERE seq = 1`)).toThrow(/append-only/);
    expect(() => raw.exec('DELETE FROM audit_log WHERE seq = 1')).toThrow(/append-only/);
    raw.close();
  });
});

describe('sqlite — book identity', () => {
  it('refuses to reopen a KRW ledger as a USD one', async () => {
    // Re-basing is a rebuild into a NEW book, never an in-place edit: historical
    // weights encode the old functional currency as a fact. See plan Risk 1.
    const path = tempDb();
    const a = sqliteLedgerStore({ path, book: { functionalCurrency: 'KRW' as CommodityCode } });
    await a.init();
    await a.migrate();
    await a.close();

    const b = sqliteLedgerStore({ path, book: { functionalCurrency: 'USD' as CommodityCode } });
    await b.init();
    await expect(b.migrate()).rejects.toThrow(/cannot be changed in place/);
    await b.close();
  });
});

describe('sqlite — migrations', () => {
  it('records every migration with its hash', async () => {
    const path = tempDb();
    const store = sqliteLedgerStore({ path, book: { functionalCurrency: 'KRW' as CommodityCode } });
    await store.init();
    await store.migrate();
    await store.close();

    const raw = new Db(path);
    const rows = raw.all<{ name: string; hash: string }>('SELECT name, hash FROM __holiday_migrations ORDER BY name');
    raw.close();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => /^[0-9a-f]{64}$/.test(r.hash))).toBe(true);
  });

  it('is a no-op on an already-migrated ledger', async () => {
    const path = tempDb();
    const open = () => sqliteLedgerStore({ path, book: { functionalCurrency: 'KRW' as CommodityCode } });
    const a = open();
    await a.init();
    const first = await a.migrate();
    await a.close();

    const b = open();
    await b.init();
    const second = await b.migrate();
    await b.close();

    expect(first.to).toBeGreaterThan(0);
    // Every command opens through migrate(), so this runs constantly. It must
    // do nothing rather than re-apply.
    expect(second.to - second.from).toBe(0);
  });

  it('REFUSES to open a ledger whose applied migration has changed', async () => {
    // "Migrations are append-only" used to be a comment. This is what makes it a
    // rule: if this ledger ran an older version of a migration, re-running the new
    // one leaves it in a state no other copy of the ledger shares — including the
    // one committed last month.
    const path = tempDb();
    const store = sqliteLedgerStore({ path, book: { functionalCurrency: 'KRW' as CommodityCode } });
    await store.init();
    await store.migrate();
    await store.close();

    // Stands in for someone editing migration.sql after it had already run.
    const raw = new Db(path);
    raw.exec(`UPDATE __holiday_migrations SET hash = '${'0'.repeat(64)}' WHERE name = (SELECT MIN(name) FROM __holiday_migrations)`);
    raw.close();

    const reopened = sqliteLedgerStore({ path, book: { functionalCurrency: 'KRW' as CommodityCode } });
    await reopened.init();
    await expect(reopened.migrate()).rejects.toThrow(MigrationDriftError);
    await expect(reopened.migrate()).rejects.toThrow(/append-only/);
    await reopened.close();
  });
});
