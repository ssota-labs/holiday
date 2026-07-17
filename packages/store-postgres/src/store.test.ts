import { PGlite } from '@electric-sql/pglite';
import type { CommodityCode } from '@holiday/core';
import { runLedgerStoreConformance } from '@holiday/store-testkit';
import { describe, expect, it } from 'vitest';

import { type PgClient, pgliteClient } from './client.js';
import { assertInt8ReadsAsBigInt, pg } from './driver.js';
import { pgLedgerStore } from './store.js';

/**
 * The conformance suite, run against real Postgres.
 *
 * pglite is not a mock and not a Postgres-alike: it is Postgres compiled to WASM,
 * running in this process. Same planner, same triggers, same int8 semantics, no
 * server and no Docker. Which means the same 26 cases SQLite passes run here, and
 * this adapter does not ship on the strength of "it looks like the other one".
 *
 * That matters more than usual for this package. Its whole claim is that ONE
 * store implementation serves both engines — and the only thing that can turn
 * that claim from a design sketch into a fact is a second engine actually passing.
 */
const newStore = () =>
  pgLedgerStore({
    client: pgliteClient(new PGlite()),
    book: { functionalCurrency: 'KRW' as CommodityCode },
  });

runLedgerStoreConformance('postgres', newStore);

describe('pg() — the eight dialect-specific spots', () => {
  it('numbers placeholders positionally', () => {
    expect(pg('SELECT * FROM a WHERE x = ? AND y = ?')).toBe('SELECT * FROM a WHERE x = $1 AND y = $2');
  });

  it('translates GLOB to LIKE, which is case-sensitive in Postgres', () => {
    // The store spells it GLOB because it needs a case-SENSITIVE prefix match and
    // SQLite's LIKE is not one. Postgres's LIKE is, so the semantics survive.
    expect(pg('WHERE code GLOB ?')).toBe('WHERE code LIKE $1');
  });

  it('APPENDS ON CONFLICT DO NOTHING rather than just dropping OR IGNORE', () => {
    // Dropping `OR IGNORE` alone would turn a tolerated duplicate into a raised
    // unique violation — the opposite of what the caller asked for. This is the
    // bug this test exists to catch.
    expect(pg('INSERT OR IGNORE INTO commodity (code) VALUES (?)')).toBe(
      'INSERT INTO commodity (code) VALUES ($1) ON CONFLICT DO NOTHING',
    );
  });
});

describe('postgres — int8 is not a string', () => {
  it('reads int8 as bigint and int4 as number, under pglite, with no parser config', async () => {
    // Measured, not assumed — the first version of this file configured
    // `parsers: { 20: BigInt }` and asserted the default was broken. Both were
    // wrong: pglite already does the right thing. The store needs exactly this
    // split — amounts (int8) as bigint, flags and counts (int4) as number — which
    // is what `toBigInt`/`toInt` in store-sql take.
    const db = new PGlite();
    // 2^53 + 1: the first integer a JS number cannot hold. If anything in the
    // path touches Number this comes back as ...992.
    const r = await db.query<{ v: unknown; i: unknown }>('SELECT 9007199254740993::int8 AS v, 42::int4 AS i');
    expect(r.rows[0]?.v).toBe(9007199254740993n);
    expect(r.rows[0]?.i).toBe(42);
    await db.close();
  });

  it('refuses a client that hands back int8 as a string', async () => {
    // postgres.js — the Supabase path — returns int8 as a string by default,
    // because it does not fit a JS number. That default is correct and this is
    // where it gets caught: without a parser, `units_minor` would concatenate
    // instead of adding. Stubbed rather than run against postgres.js, because the
    // thing under test is the refusal, not the client.
    const stringy: PgClient = {
      query: async <T>() => [{ v: '9007199254740993' }] as T[],
      exec: async () => {},
      transaction: async <T>(fn: (tx: PgClient) => Promise<T>) => fn(stringy),
      close: async () => {},
    };
    await expect(assertInt8ReadsAsBigInt(stringy)).rejects.toThrow(/reads int8 as string, not bigint/);
  });
});
