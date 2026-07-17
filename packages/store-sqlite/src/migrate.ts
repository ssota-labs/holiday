import type { Db } from './db.js';
import { MIGRATIONS } from './migrations.generated.js';

/**
 * The migration runner.
 *
 * Two properties matter, and the second is the one worth having:
 *
 * 1. Each migration runs in its own transaction, so a failure leaves the ledger
 *    at the last complete version rather than half-way through one.
 *
 * 2. **Applied migrations are hash-checked.** The bookkeeping table stores the
 *    sha256 of each migration as it ran, and the next open compares. Edit a
 *    migration that already ran anywhere and this fails loudly, instead of the
 *    ledger silently diverging from every other copy — including the one you
 *    committed last month. "Migrations are append-only" stops being a comment in
 *    a file and starts being something the code will not let you break.
 *
 * The idea is lifted from Drizzle's `__drizzle_migrations`, which keys rows by a
 * hash of the file. The table is ours because Drizzle's migrator wants a
 * migrations folder on disk, and this CLI is one bundled file with nothing next
 * to it.
 */
const BOOKKEEPING = `
CREATE TABLE IF NOT EXISTS __holiday_migrations (
  name       TEXT PRIMARY KEY,
  hash       TEXT NOT NULL,
  applied_at TEXT NOT NULL
)`;

export class MigrationDriftError extends Error {
  constructor(name: string, applied: string, now: string) {
    super(
      `holiday: migration ${name} has changed since it was applied to this ledger.\n` +
        `  applied: ${applied}\n` +
        `  now:     ${now}\n` +
        `Migrations are append-only. This ledger ran the old version, so re-running the new one ` +
        `would leave it in a state no other copy shares. Add a new migration instead of editing this one.`,
    );
    this.name = 'MigrationDriftError';
  }
}

export interface MigrateResult {
  readonly applied: readonly string[];
  readonly alreadyApplied: number;
}

export function runMigrations(db: Db, now: () => string): MigrateResult {
  db.exec(BOOKKEEPING);

  const seen = new Map(
    db.all<{ name: string; hash: string }>('SELECT name, hash FROM __holiday_migrations').map((r) => [r.name, r.hash]),
  );

  const applied: string[] = [];
  for (const m of MIGRATIONS) {
    const priorHash = seen.get(m.name);
    if (priorHash !== undefined) {
      if (priorHash !== m.hash) throw new MigrationDriftError(m.name, priorHash, m.hash);
      continue;
    }
    db.transaction(() => {
      for (const statement of m.statements) db.exec(statement);
      db.run('INSERT INTO __holiday_migrations (name, hash, applied_at) VALUES (?, ?, ?)', m.name, m.hash, now());
    });
    applied.push(m.name);
  }

  return { applied, alreadyApplied: seen.size };
}

export function appliedMigrations(db: Db): { name: string; appliedAt: string }[] {
  db.exec(BOOKKEEPING);
  return db
    .all<{ name: string; applied_at: string }>('SELECT name, applied_at FROM __holiday_migrations ORDER BY name')
    .map((r) => ({ name: r.name, appliedAt: r.applied_at }));
}
