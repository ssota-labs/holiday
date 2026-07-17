import type { Dialect, SqlDriver, SqlValue } from '@holiday/store-sql';

import type { PgClient } from './client.js';

/**
 * Postgres behind the same SqlDriver the SQLite adapter implements, so both
 * engines run the one store in @holiday/store-sql rather than two mirrors of it.
 *
 * There are exactly two things to get right here, and `pg()` below is one of them.
 * The other is int8.
 */
export class PgDriver implements SqlDriver {
  readonly dialect: Dialect = {
    name: 'postgres',
    // LIKE, not GLOB: Postgres has no GLOB, and its LIKE is already
    // case-sensitive — which is the property the store actually needs.
    subtreeWildcard: (prefix) => `${prefix}:%`,
    prepare: pg,
  };

  constructor(readonly client: PgClient) {}

  async get<T>(sql: string, ...params: readonly SqlValue[]): Promise<T | undefined> {
    return (await this.client.query<T>(pg(sql), params))[0];
  }

  async all<T>(sql: string, ...params: readonly SqlValue[]): Promise<T[]> {
    return this.client.query<T>(pg(sql), params);
  }

  async run(sql: string, ...params: readonly SqlValue[]): Promise<void> {
    await this.client.query(pg(sql), params);
  }

  async exec(sql: string): Promise<void> {
    return this.client.exec(sql);
  }

  async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
    return this.client.transaction((tx) => fn(new PgDriver(tx)));
  }

  async close(): Promise<void> {
    return this.client.close();
  }
}

/**
 * `?` → `$1, $2, …`, and the store's SQLite spelling → Postgres.
 *
 * Rewriting at query time rather than hand-editing the store is the entire point:
 * a hand-edit renumbers every parameter after any insertion, and a mis-numbered
 * `$4` binds the wrong column *silently*. This cannot. More importantly, hand-
 * editing means a second copy of the store, and a second copy drifts.
 *
 * The rewrites are small and total — they are the eight dialect-specific spots
 * that a count found in ~1,500 lines:
 *
 * - **`?` → `$n`.** Postgres numbers its placeholders.
 * - **GLOB → LIKE.** Only ever the materialized-path subtree query,
 *   `code GLOB 'Assets:Bank:*'`. The store spells it GLOB because it needs a
 *   case-SENSITIVE match and SQLite's LIKE is not one; Postgres's LIKE is. The
 *   wildcard itself comes from `dialect.subtreeWildcard`, not from here.
 * - **INSERT OR IGNORE → ON CONFLICT DO NOTHING.** Note this APPENDS: dropping
 *   `OR IGNORE` alone would turn a tolerated duplicate into a raised unique
 *   violation, which is the opposite of what the caller asked for.
 */
export function pg(sql: string): string {
  let out = sql.replace(/\bGLOB\b/g, 'LIKE');
  if (/\bINSERT OR IGNORE INTO\b/.test(out)) {
    out = out.replace(/\bINSERT OR IGNORE INTO\b/g, 'INSERT INTO').trimEnd() + ' ON CONFLICT DO NOTHING';
  }
  let i = 0;
  return out.replace(/\?/g, () => `$${++i}`);
}

/**
 * Refuse to run unless int8 arrives as a bigint.
 *
 * Postgres sends int8 as a *string* by default — correctly, since it does not fit
 * a JS number. But the store narrows every amount through `toBigInt`/`toInt`,
 * which take `bigint | number`, so a client without an int8 parser hands the
 * ledger strings and `units_minor` starts concatenating instead of adding.
 *
 * This is node:sqlite's setReadBigInts problem arrived at from the opposite
 * direction — SQLite would have handed back a lossy number, Postgres hands back a
 * lossless string — and it gets the same answer: one place that knows, and no way
 * to forget. The parser has to be set at client construction, which this cannot do
 * for a client it was handed, so it checks instead. A ledger that silently does
 * string arithmetic on money is not a failure mode worth being polite about.
 */
export async function assertInt8ReadsAsBigInt(client: PgClient): Promise<void> {
  const [row] = await client.query<{ v: unknown }>('SELECT 9007199254740993::int8 AS v');
  if (typeof row?.v !== 'bigint') {
    throw new TypeError(
      `holiday: this Postgres client reads int8 as ${typeof row?.v}, not bigint.\n` +
        `  Every amount in the ledger is an int8. Without a parser they arrive as strings and\n` +
        `  arithmetic on them concatenates instead of adding.\n` +
        `  pglite:      new PGlite({ parsers: { 20: (v) => BigInt(v) } })\n` +
        `  postgres.js: postgres(url, { types: { bigint: postgres.BigInt } })`,
    );
  }
}
