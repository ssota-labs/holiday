/**
 * What is left of the old hand-written schema.
 *
 * The DDL moved to `schema.drizzle.ts` (tables, diffed by drizzle-kit) and
 * `migrations/*.sql` (triggers, which drizzle-kit does not model). What stays here
 * is the connection-level configuration, which is not schema and not migratable —
 * pragmas are per-connection and have to be set every time the file is opened.
 */

/** Bumped when the shape of the book row itself changes, not per migration. */
export const SCHEMA_VERSION = 2;

export const PRAGMAS = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
-- A personal ledger writes a few rows a day. Correctness beats throughput.
PRAGMA synchronous = FULL;
`;
