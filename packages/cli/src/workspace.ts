import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import type { CommodityCode, Grain } from '@holiday/core';
import { SqliteLedgerStore } from '@holiday/store-sqlite';

export const DIR = '.holiday';

export interface Config {
  readonly functionalCurrency: CommodityCode;
  readonly closeGrain: Grain;
  readonly timezone: string;
  readonly store: 'sqlite';
}

export class NoWorkspaceError extends Error {
  constructor(from: string) {
    super(
      `no ${DIR}/ found in ${from} or any parent directory. Run \`holiday init\` in the repo ` +
        `where you keep your finances — a PRIVATE one.`,
    );
    this.name = 'NoWorkspaceError';
  }
}

/** Walk up from cwd, git-style, so subcommands work from anywhere in the repo. */
export function findWorkspace(from = process.cwd()): string | null {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, DIR, 'config.json'))) return join(dir, DIR);
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function requireWorkspace(from = process.cwd()): string {
  const ws = findWorkspace(from);
  if (!ws) throw new NoWorkspaceError(from);
  return ws;
}

export function readConfig(ws: string): Config {
  return JSON.parse(readFileSync(join(ws, 'config.json'), 'utf8')) as Config;
}

export function createWorkspace(root: string, config: Config): string {
  const ws = join(root, DIR);
  mkdirSync(join(ws, 'exports'), { recursive: true });
  writeFileSync(join(ws, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);

  // The .db IS the system of record and is meant to be committed. The WAL and
  // shm files are transient scratch — committing them is meaningless at best and
  // a corrupt restore at worst.
  writeFileSync(
    join(ws, '.gitignore'),
    [
      '# ledger.db is the system of record and SHOULD be committed.',
      '# These two are transient. Run `holiday checkpoint` before committing.',
      'ledger.db-wal',
      'ledger.db-shm',
      '',
      '# Exports are derived. Regenerate with `holiday export`.',
      'exports/',
      '',
    ].join('\n'),
  );
  return ws;
}

export function openStore(ws: string): SqliteLedgerStore {
  const config = readConfig(ws);
  return new SqliteLedgerStore({
    path: join(ws, 'ledger.db'),
    book: {
      functionalCurrency: config.functionalCurrency,
      closeGrain: config.closeGrain,
      timezone: config.timezone,
    },
  });
}

/**
 * Open a ledger and bring its schema up to date. Every command uses this.
 *
 * Migrating on open rather than only in `init` is not a convenience — it is the
 * difference between a ledger that survives an upgrade and one that does not.
 * ledger.db is the user's system of record and is meant to be committed; the
 * plugin binary that reads it updates independently. If only `init` migrated, a
 * plugin update would leave every existing ledger unopenable, failing on a column
 * the new code expects and the old file has never heard of.
 *
 * Migrations are append-only and each runs in its own transaction, so this is
 * a no-op on an up-to-date file and atomic on an old one.
 */
export async function openLedger(ws: string): Promise<SqliteLedgerStore> {
  const store = openStore(ws);
  await store.init();
  await store.migrate();
  return store;
}
