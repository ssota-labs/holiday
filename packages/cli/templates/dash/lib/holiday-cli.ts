import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** The ledger root — the dash is scaffolded one level inside it. */
export const LEDGER_CWD = resolve(process.cwd(), '..');

const CLI = ['-y', '@holiday-cfo/cli@__HOLIDAY_VERSION__'];

/**
 * Shell the CLI. Sequential callers only — concurrent opens race the SQLite
 * write lock during migration checks ("database is locked").
 */
export async function holidayCli(args: string[], opts?: { json?: boolean }): Promise<string> {
  const prefix = opts?.json === false ? CLI : [...CLI, '--json'];
  const { stdout } = await run('npx', [...prefix, ...args], {
    cwd: LEDGER_CWD,
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}
