/**
 * @holiday/store-postgres — the ledger on Postgres (Supabase, or pglite in tests).
 *
 * This package is a driver, a schema, and migrations. It does NOT implement
 * LedgerStore: that lives once in @holiday/store-sql and both engines run it.
 *
 * The reason is a measurement rather than a preference. The store is ~1,500 lines
 * and exactly eight of them were dialect-specific; mirroring it here would have
 * produced two files that agree today and drift on the first hand-edit that lands
 * in one and not the other — which is the failure the port boundary exists to
 * prevent.
 *
 * The proof it works is `store.test.ts`: the same conformance suite SQLite passes,
 * run against real Postgres via pglite.
 */
export * from './client.js';
export { PgDriver, pg, assertInt8ReadsAsBigInt } from './driver.js';
export { pgEngine, pgLedgerStore, PG_SCHEMA_VERSION, type PgStoreOptions } from './store.js';
export { MIGRATIONS } from './migrations.generated.js';
export * as schema from './schema.drizzle.js';
