import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { foldBalances, type LedgerStore, type BalanceRow } from '@holiday-cfo/core';

import { amounts, DATE, fxTxn, forgedUnbalancedTxn, type Fixture, KRW, newTxnId, seed, simpleTxn } from './fixtures.js';

/**
 * The port boundary, made executable.
 *
 * The TypeScript interface is documentation; THIS is the contract. Every
 * engine-tier store must pass all of it. It exists before the first adapter on
 * purpose — a conformance suite only keeps a boundary honest if it predates the
 * pressure to bend it.
 */
export function runLedgerStoreConformance(name: string, factory: () => Promise<LedgerStore>): void {
  describe(`LedgerStore conformance: ${name}`, () => {
    let store: LedgerStore;
    let f: Fixture;

    beforeEach(async () => {
      store = await factory();
      await store.init();
      await store.migrate();
      f = await store.unitOfWork((uow) => seed(uow));
    });

    afterEach(async () => {
      await store.close();
    });

    describe('tier contract', () => {
      it('an engine-tier store actually meets the engine contract', () => {
        const c = store.capabilities;
        if (c.tier !== 'engine') return;
        // If a store declares 'engine' while missing any of these, init() must
        // have thrown before we got here. See assertEngineTier().
        expect(c.atomicMultiRowWrite).toBe(true);
        expect(c.uniqueConstraints).toBe(true);
        expect(c.readAfterWriteConsistency).toBe(true);
      });

      it('the book reports the functional currency the ledger is denominated in', async () => {
        const book = await store.read((r) => r.getBook());
        expect(book.functionalCurrency).toBe(KRW);
        // Exactly one hard-close grain. Overlapping grains double-count FX.
        expect(['day', 'week', 'month', 'quarter', 'year']).toContain(book.closeGrain);
      });
    });

    describe('append and read back', () => {
      it('round-trips a transaction without touching the integers', async () => {
        const tx = simpleTxn(f, 12500n);
        await store.unitOfWork((uow) => uow.appendTxn(tx, { status: 'posted' }));

        const got = await store.read((r) => r.getTxn(tx.id));
        expect(got).not.toBeNull();
        expect(got!.status).toBe('posted');
        expect(got!.txn.postings.map((p) => p.units.minor)).toEqual([12500n, -12500n]);
        expect(got!.txn.postings.map((p) => p.weightMinor)).toEqual([12500n, -12500n]);
        expect(got!.txn.payee).toBe('Test Payee');
      });

      it('preserves i64 magnitudes that a JS number would silently mangle', async () => {
        // 2^53 + 1 is the first integer a double cannot represent. If any layer
        // round-trips through `number`, this test is where it shows up.
        const big = 9007199254740993n;
        const tx = simpleTxn(f, big);
        await store.unitOfWork((uow) => uow.appendTxn(tx, { status: 'posted' }));

        const got = await store.read((r) => r.getTxn(tx.id));
        expect(got!.txn.postings[0]!.units.minor).toBe(big);
        expect(got!.txn.postings[0]!.weightMinor).toBe(big);
        expect(typeof got!.txn.postings[0]!.weightMinor).toBe('bigint');
      });

      it('preserves multi-currency postings and their weight provenance', async () => {
        const tx = fxTxn(f);
        await store.unitOfWork((uow) => uow.appendTxn(tx, { status: 'posted' }));

        const got = await store.read((r) => r.getTxn(tx.id));
        const usd = got!.txn.postings.find((p) => p.units.commodity === 'USD')!;
        expect(usd.units.minor).toBe(75000n);
        expect(usd.weightMinor).toBe(1000000n);
        expect(usd.weightSource).toBe('actual');
        // The rate is kept for audit but is not what made this balance.
        expect(usd.fxRateText).toBe('1333.333333');
      });

      it('rejects a duplicate transaction id', async () => {
        const tx = simpleTxn(f, 100n);
        await store.unitOfWork((uow) => uow.appendTxn(tx, { status: 'posted' }));
        await expect(store.unitOfWork((uow) => uow.appendTxn(tx, { status: 'posted' }))).rejects.toThrow();
      });
    });

    describe('atomicity', () => {
      it('a unit of work that throws writes NOTHING', async () => {
        const a = simpleTxn(f, 1000n);
        const b = simpleTxn(f, 2000n);

        await expect(
          store.unitOfWork(async (uow) => {
            await uow.appendTxn(a, { status: 'posted' });
            await uow.appendTxn(b, { status: 'posted' });
            throw new Error('boom, halfway through');
          }),
        ).rejects.toThrow('boom');

        // Not "mostly rolled back". Zero rows.
        expect(await store.read((r) => r.getTxn(a.id))).toBeNull();
        expect(await store.read((r) => r.getTxn(b.id))).toBeNull();
        expect(await store.read((r) => r.getBalances({}))).toEqual([]);
      });

      it('a failed append does not leave orphaned postings behind', async () => {
        const good = simpleTxn(f, 500n);
        await store.unitOfWork((uow) => uow.appendTxn(good, { status: 'posted' }));

        await expect(
          store.unitOfWork(async (uow) => {
            await uow.appendTxn(simpleTxn(f, 700n), { status: 'posted' });
            await uow.appendTxn(good, { status: 'posted' }); // duplicate id → throws
          }),
        ).rejects.toThrow();

        const all = await store.read((r) => r.listTxns({}));
        expect(all).toHaveLength(1);
        const rows: unknown[] = [];
        await store.read(async (r) => {
          for await (const p of r.streamPostings({})) rows.push(p);
        });
        expect(rows).toHaveLength(2);
      });
    });

    describe('invariants at rest (ring 3)', () => {
      it('REJECTS an unbalanced transaction forced past the domain via a cast', async () => {
        if (!store.capabilities.enforcesInvariantsAtRest) return;
        // The domain cannot produce this. Storage is the backstop for bugs in the
        // domain, unsafe casts, and someone opening the db with the sqlite3 CLI.
        const forged = forgedUnbalancedTxn(f);
        await expect(store.unitOfWork((uow) => uow.appendTxn(forged, { status: 'posted' }))).rejects.toThrow();
        expect(await store.read((r) => r.getTxn(forged.id))).toBeNull();
      });

      it('REJECTS a posting whose commodity contradicts its single-commodity account', async () => {
        if (!store.capabilities.enforcesInvariantsAtRest) return;
        // The vision model misreading '$' as '₩' is the most likely real error in
        // this whole system, and this is the ring that stops it landing.
        const tx = {
          id: newTxnId(),
          date: DATE,
          bookingCommodity: KRW,
          payee: null,
          narration: 'USD into a KRW-only account',
          systemKind: null,
          correctsTxnId: null,
          sourceItemId: null,
          fxEstimated: false,
          tags: [] as string[],
          meta: {},
          postings: [
            {
              seq: 0,
              accountId: f.checking.id, // declared KRW-only
              units: amounts.parse('10.00', 'USD'),
              weightMinor: 13333n,
              weightSource: 'rate' as const,
              fxRateText: '1333.33',
              fxRateId: null,
              lotId: null,
              kind: 'normal' as const,
              memo: null,
            },
            {
              seq: 1,
              accountId: f.dining.id,
              units: amounts.fromMinor(-13333n, 'KRW'),
              weightMinor: -13333n,
              weightSource: 'identity' as const,
              fxRateText: null,
              fxRateId: null,
              lotId: null,
              kind: 'normal' as const,
              memo: null,
            },
          ],
        };
        const { Txn } = await import('@holiday-cfo/core');
        await expect(
          store.unitOfWork((uow) => uow.appendTxn(Txn.trustFromStorage(tx), { status: 'posted' })),
        ).rejects.toThrow();
      });
    });

    describe('drafts and the review gate', () => {
      it('excludes drafts from balances, then includes them on promote', async () => {
        const tx = simpleTxn(f, 9000n);
        await store.unitOfWork((uow) => uow.appendTxn(tx, { status: 'draft' }));

        // An unreviewed screenshot is not a fact about your money yet.
        expect(await store.read((r) => r.getBalances({}))).toEqual([]);

        await store.unitOfWork((uow) => uow.promoteDraft(tx.id));

        const balances = await store.read((r) => r.getBalances({}));
        expect(sum(balances, 'Expenses:Food:Dining')).toBe(9000n);
        expect(sum(balances, 'Liabilities:Card:Shinhan')).toBe(-9000n);
      });

      it('keeps a rejected draft on record, because it is dedup memory', async () => {
        const tx = simpleTxn(f, 300n);
        await store.unitOfWork((uow) => uow.appendTxn(tx, { status: 'draft' }));
        await store.unitOfWork((uow) => uow.rejectDraft(tx.id, 'duplicate of an earlier capture'));

        // Deleting it would let the same screenshot be re-proposed forever.
        const got = await store.read((r) => r.getTxn(tx.id));
        expect(got!.status).toBe('rejected');
        expect(await store.read((r) => r.getBalances({}))).toEqual([]);
      });
    });

    describe('balances', () => {
      it('getBalances agrees with a fold over streamPostings', async () => {
        // The whole point of the pairing: the fast path may not disagree with the
        // mandatory primitive. If it does, one of them is lying.
        await store.unitOfWork(async (uow) => {
          for (const n of [100n, 250n, -75n, 999_999n, 12n]) {
            await uow.appendTxn(simpleTxn(f, n), { status: 'posted' });
          }
          await uow.appendTxn(fxTxn(f), { status: 'posted' });
        });

        const fast = await store.read((r) => r.getBalances({}));
        const slow = await store.read((r) => foldBalances(r, {}));
        expect(fast).toEqual(slow);
      });

      it('reports the KRW carrying value of a foreign account for free', async () => {
        await store.unitOfWork((uow) => uow.appendTxn(fxTxn(f), { status: 'posted' }));
        const balances = await store.read((r) => r.getBalances({}));
        const usd = balances.find((b) => b.accountCode === 'Assets:Bank:Wise:USD')!;
        expect(usd.unitsMinor).toBe(75000n); // $750.00 — the fact
        expect(usd.weightMinor).toBe(1000000n); // ₩1,000,000 — the measurement
      });

      it('filters by date and by account subtree', async () => {
        await store.unitOfWork(async (uow) => {
          await uow.appendTxn(simpleTxn(f, 111n, '2026-06-30' as never), { status: 'posted' });
          await uow.appendTxn(simpleTxn(f, 222n, '2026-07-01' as never), { status: 'posted' });
        });

        const july = await store.read((r) => r.getBalances({ from: '2026-07-01' as never }));
        expect(sum(july, 'Expenses:Food:Dining')).toBe(222n);

        const expenses = await store.read((r) => r.getBalances({ accountPrefix: 'Expenses' as never }));
        expect(expenses.every((b) => b.accountCode.startsWith('Expenses'))).toBe(true);
        expect(sum(expenses, 'Expenses:Food:Dining')).toBe(333n);
      });
    });

    describe('verify', () => {
      it('passes on a healthy ledger', async () => {
        await store.unitOfWork(async (uow) => {
          await uow.appendTxn(simpleTxn(f, 4500n), { status: 'posted' });
          await uow.appendTxn(fxTxn(f), { status: 'posted' });
        });
        const report = await store.unitOfWork((uow) => uow.verify());
        expect(report.problems).toEqual([]);
        expect(report.ok).toBe(true);
        expect(report.checked).toBeGreaterThan(0);
      });
    });

    describe('idempotency', () => {
      it('stores and replays a command result by key', async () => {
        // An agent shelling out to a CLI WILL retry on timeout. Without this the
        // retry double-posts, and double-posting is the one failure mode that
        // destroys trust in a ledger.
        const rec = {
          idemKey: 'K-1',
          requestSha256: 'a'.repeat(64),
          responseJson: '{"txnId":"X"}',
          createdAt: '2026-07-17T00:00:00.000Z',
        };
        await store.unitOfWork((uow) => uow.recordCommandResult(rec));
        expect(await store.read((r) => r.getCommandResult('K-1'))).toMatchObject(rec);
        expect(await store.read((r) => r.getCommandResult('nope'))).toBeNull();
      });

      it('refuses to reuse a key for a different request', async () => {
        const base = { idemKey: 'K-2', responseJson: '{}', createdAt: '2026-07-17T00:00:00.000Z' };
        await store.unitOfWork((uow) => uow.recordCommandResult({ ...base, requestSha256: 'a'.repeat(64) }));
        await expect(
          store.unitOfWork((uow) => uow.recordCommandResult({ ...base, requestSha256: 'b'.repeat(64) })),
        ).rejects.toThrow();
      });
    });

    describe('import provenance', () => {
      it('lists every ingest batch, newest first, and blocks a duplicate source', async () => {
        // The batch record is what a later session reads to know which exports
        // are already in. If listing lied about order or dropped rows, an agent
        // would re-import a file it cannot see — so the listing is contract, not
        // convenience. So is the unique source hash: identical bytes are the
        // same export, and importing it twice must fail loudly.
        const mk = (n: number) => ({
          id: `01BATCH${String(n).padStart(19, '0')}`,
          sourceSha256: `${String(n).repeat(1)}`.padEnd(64, 'f'),
          sourceName: `export-${n}.html`,
          submittedAt: `2026-07-1${n}T00:00:00.000Z`,
          itemCount: n * 10,
        });
        await store.unitOfWork((uow) => uow.recordIngestBatch(mk(1)));
        await store.unitOfWork((uow) => uow.recordIngestBatch(mk(2)));

        const batches = await store.read((r) => r.listIngestBatches());
        expect(batches.map((b) => b.sourceName)).toEqual(['export-2.html', 'export-1.html']);
        expect(batches.map((b) => b.itemCount)).toEqual([20, 10]);

        expect(await store.read((r) => r.findIngestBatchBySha(mk(1).sourceSha256))).toMatchObject({
          sourceName: 'export-1.html',
        });
        // Same source bytes, new batch id — the unique constraint must refuse.
        await expect(
          store.unitOfWork((uow) => uow.recordIngestBatch({ ...mk(1), id: '01BATCH9999999999999999999' })),
        ).rejects.toThrow();
      });
    });

    describe('classification rules', () => {
      it('lists rules in matching order and deletes them for real', async () => {
        // The listing order IS the matching order (priority DESC, then newest):
        // if two rules both match "스타벅스 강남점", the one the store lists first
        // is the one that decides the category. An engine that ordered
        // differently would classify the same payee differently — silently.
        const mk = (id: string, pattern: string, priority: number, createdAt: string) => ({
          id,
          pattern,
          match: 'contains' as const,
          category: 'Expenses:Food:Cafe',
          priority,
          createdAt,
        });
        await store.unitOfWork(async (uow) => {
          await uow.addRule(mk('01RULEA0000000000000000000', '스타벅스', 0, '2026-07-01T00:00:00.000Z'));
          await uow.addRule(mk('01RULEB0000000000000000000', '스타벅스 강남', 10, '2026-07-02T00:00:00.000Z'));
          await uow.addRule(mk('01RULEC0000000000000000000', '커피', 0, '2026-07-03T00:00:00.000Z'));
        });
        const rules = await store.read((r) => r.listRules());
        expect(rules.map((r) => r.pattern)).toEqual(['스타벅스 강남', '커피', '스타벅스']);

        await store.unitOfWork((uow) => uow.removeRule('01RULEC0000000000000000000'));
        const after = await store.read((r) => r.listRules());
        expect(after.map((r) => r.pattern)).toEqual(['스타벅스 강남', '스타벅스']);
      });
    });
  });
}

function sum(rows: readonly BalanceRow[], code: string): bigint {
  return rows.filter((r) => r.accountCode === code).reduce((s, r) => s + r.weightMinor, 0n);
}
