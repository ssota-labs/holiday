import type { CommodityCode, Grain } from '@holiday/core';
import { type SqlEngine, SqlLedgerStore } from '@holiday/store-sql';

import type { PgClient } from './client.js';
import { assertInt8ReadsAsBigInt, PgDriver } from './driver.js';
import { MIGRATIONS } from './migrations.generated.js';

/**
 * The Postgres engine: a driver, the DDL, and nothing else.
 *
 * There is no `checkpoint` because Postgres has no WAL-into-file step to run and
 * no need for one, and no `init` pragmas because its equivalents are server
 * configuration rather than per-connection state. That this file is short is the
 * result the port boundary was supposed to buy: the ~1,500 lines of store are in
 * @holiday/store-sql and are the *same* lines SQLite runs.
 */
export const PG_SCHEMA_VERSION = 2;

export interface PgStoreOptions {
  readonly client: PgClient;
  readonly book: {
    readonly functionalCurrency: CommodityCode;
    readonly closeGrain?: Grain;
    readonly timezone?: string;
  };
  readonly now?: () => string;
}

export function pgEngine(client: PgClient): SqlEngine {
  return {
    name: 'postgres',
    driver: new PgDriver(client),
    migrations: MIGRATIONS,
    schemaVersion: PG_SCHEMA_VERSION,
    // Not pragmas — a refusal. See assertInt8ReadsAsBigInt.
    init: async (d) => assertInt8ReadsAsBigInt((d as PgDriver).client),
  };
}

export function pgLedgerStore(opts: PgStoreOptions): SqlLedgerStore {
  return new SqlLedgerStore({
    engine: pgEngine(opts.client),
    book: opts.book,
    ...(opts.now ? { now: opts.now } : {}),
  });
}
