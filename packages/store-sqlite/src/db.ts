import { createRequire } from 'node:module';
import type { DatabaseSync as DatabaseSyncType, StatementSync } from 'node:sqlite';

/**
 * node:sqlite is loaded with a runtime require, not a static import. That is
 * deliberate and it is load-bearing.
 *
 * Loading it prints an ExperimentalWarning to stderr, and stderr is where the CLI
 * writes its machine-readable error envelope for the agent calling it. The CLI
 * filters that one warning — but a *static* import is loaded during module
 * linking, and whether the filter is installed by then depends on the shape of
 * the module graph: with a small graph the tick that emits the warning drains
 * late enough to be caught, and with one more module in the way it drains first
 * and leaks. Measured, not guessed — and a suppression that works by accident of
 * graph shape breaks the next time anything is refactored or bundled.
 *
 * A runtime require happens in program order, strictly after the filter is
 * installed, and does not care what the graph looks like or whether a bundler has
 * flattened it.
 */
const DatabaseSync = createRequire(import.meta.url)('node:sqlite').DatabaseSync as typeof DatabaseSyncType;

/**
 * A thin wrapper whose entire job is to make `setReadBigInts(true)` unforgettable.
 *
 * node:sqlite defaults to reading INTEGER columns as JS `number`, and throws
 * ERR_OUT_OF_RANGE the moment a value exceeds 2^53. That failure mode is a
 * landmine: every test with realistic ₩ amounts passes, and the ledger explodes
 * the first time someone records a large position — or, worse, one statement
 * returns `number` and another returns `bigint` for the same column and the
 * mismatch propagates silently into the domain.
 *
 * So: nobody calls db.prepare() directly. This wrapper is the only way in, and it
 * always turns bigint reads on. The cost is that COUNT(*) and flags come back as
 * bigint too, which is why the row mappers narrow them explicitly at one boundary.
 */
export class Db {
  readonly #db: DatabaseSyncType;
  readonly #cache = new Map<string, StatementSync>();

  constructor(path: string) {
    this.#db = new DatabaseSync(path);
  }

  exec(sql: string): void {
    this.#db.exec(sql);
  }

  prepare(sql: string): StatementSync {
    const cached = this.#cache.get(sql);
    if (cached) return cached;
    const stmt = this.#db.prepare(sql);
    stmt.setReadBigInts(true);
    this.#cache.set(sql, stmt);
    return stmt;
  }

  run(sql: string, ...params: readonly SqlValue[]): void {
    this.prepare(sql).run(...(params as never[]));
  }

  get<T>(sql: string, ...params: readonly SqlValue[]): T | undefined {
    return this.prepare(sql).get(...(params as never[])) as T | undefined;
  }

  all<T>(sql: string, ...params: readonly SqlValue[]): T[] {
    return this.prepare(sql).all(...(params as never[])) as T[];
  }

  /**
   * IMMEDIATE, not DEFERRED: take the write lock up front so a concurrent writer
   * fails at BEGIN rather than at COMMIT, where the work is already done.
   */
  transaction<T>(fn: () => T): T {
    this.exec('BEGIN IMMEDIATE');
    try {
      const out = fn();
      this.exec('COMMIT');
      return out;
    } catch (e) {
      try {
        this.exec('ROLLBACK');
      } catch {
        // A rollback failure must not mask the original error.
      }
      throw e;
    }
  }

  close(): void {
    this.#cache.clear();
    this.#db.close();
  }
}

export type SqlValue = string | number | bigint | null | Uint8Array;

/** Narrow a bigint read back to a small JS number, loudly. */
export function toInt(v: bigint | number): number {
  const n = typeof v === 'bigint' ? Number(v) : v;
  if (!Number.isSafeInteger(n)) throw new RangeError(`expected a small integer, got ${v}`);
  return n;
}

export function toBool(v: bigint | number): boolean {
  return toInt(v) === 1;
}

export function toBigInt(v: bigint | number): bigint {
  return typeof v === 'bigint' ? v : BigInt(v);
}
