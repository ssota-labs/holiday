import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/**
 * The local CLI bridge, read side: what is waiting to be categorized, and which
 * categories exist to pick from.
 *
 * The dash never opens ledger.db — that stays true even here. This route shells
 * the CLI, so every invariant the CLI owns still holds, and the dashboard remains
 * a client of the same contract the agent uses. It exists only where a Node
 * server runs (pnpm dev / a local build); a deployed snapshot has no server, the
 * fetch fails, and CategorizeQueue degrades to a notice. That failure mode is the
 * boundary: local dash = cockpit, deployed dash = photograph.
 */

/** The ledger root — the dash is scaffolded one level inside it. */
const LEDGER_CWD = resolve(process.cwd(), '..');
const CLI = ['-y', '@holiday-cfo/cli@__HOLIDAY_VERSION__'];

async function cli(args: string[]): Promise<string> {
  const { stdout } = await run('npx', [...CLI, '--json', ...args], { cwd: LEDGER_CWD, maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

export async function GET(): Promise<Response> {
  try {
    // Sequential on purpose: each CLI call opens the ledger, and opening runs
    // migrations inside a write transaction — two concurrent opens race for the
    // write lock and one dies with "database is locked". The route is transport,
    // not a hot path; two calls in a row cost nothing.
    const itemsRaw = await cli(['review', 'list']);
    const accountsRaw = await cli(['account', 'list']);
    const items = JSON.parse(itemsRaw) as {
      id: string;
      merchant: string | null;
      parsedJson: string;
    }[];
    const accounts = JSON.parse(accountsRaw) as { code: string; type: string; placeholder?: boolean }[];

    // Pickable categories: real expense/income accounts, minus the parking lots —
    // picking "Uncategorized" for an uncategorized row would be a no-op loop.
    const categories = accounts
      .filter((a) => (a.type === 'expense' || a.type === 'income') && !a.placeholder)
      .map((a) => a.code)
      .filter((c) => !c.endsWith(':Uncategorized'))
      .sort();

    const pending = items.map((i) => {
      let date: string | null = null;
      let amountMinor: string | null = null;
      let commodity = 'KRW';
      try {
        const parsed = JSON.parse(i.parsedJson) as {
          date?: string;
          money?: { amount: string; commodity: string };
          legs?: { amount: string; commodity: string }[];
        };
        date = parsed.date ?? null;
        const m = parsed.money ?? parsed.legs?.[0];
        if (m) {
          amountMinor = m.amount;
          commodity = m.commodity;
        }
      } catch {
        // an item without parseable JSON still shows, just without figures
      }
      return { id: i.id, payee: i.merchant, date, amountMinor, commodity };
    });

    return Response.json({ items: pending, categories });
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e) }, { status: 500 });
  }
}
