import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/**
 * The local CLI bridge, write side: one click = one `review accept --category`.
 *
 * Everything writes THROUGH the CLI — the same command, the same validation, the
 * same audit trail as if the user had typed it. The route adds nothing but
 * transport. With `remember`, the pick also becomes a rule, so the next 스타벅스
 * never reaches the queue at all: the queue is supposed to shrink itself.
 *
 * After a successful accept it re-bakes the snapshot; the dev server hot-reloads
 * ledger.json, so the other cards on the page catch up without a manual step.
 */

const LEDGER_CWD = resolve(process.cwd(), '..');
const CLI = ['-y', '@holiday-cfo/cli@__HOLIDAY_VERSION__'];

async function cli(args: string[]): Promise<string> {
  const { stdout } = await run('npx', [...CLI, ...args], { cwd: LEDGER_CWD, maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

export async function POST(req: Request): Promise<Response> {
  let body: { itemId?: string; category?: string; remember?: boolean; payee?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const { itemId, category, remember } = body;
  if (!itemId || !category) {
    return Response.json({ error: 'itemId and category are required' }, { status: 400 });
  }
  // The account code shape the CLI itself enforces — refuse anything else before
  // it goes near a shell argument.
  if (!/^[A-Za-z][A-Za-z0-9-]*(:[A-Za-z0-9가-힣-]+)*$/.test(category) || !/^[0-9A-Za-z]+$/.test(itemId)) {
    return Response.json({ error: 'malformed itemId or category' }, { status: 400 });
  }

  try {
    await cli(['review', 'accept', itemId, '--category', category]);

    if (remember) {
      // Best-effort: the payee comes back from the pending list the block already
      // holds. A rule that fails to add (duplicate, whatever) must not undo the
      // accept that just succeeded.
      const payee = typeof body.payee === 'string' ? body.payee.trim() : '';
      if (payee) await cli(['rule', 'add', payee, category]).catch(() => undefined);
    }

    // Refresh the baked snapshot so the rest of the page follows.
    await cli(['dash', 'data']).catch(() => undefined);

    return Response.json({ ok: true });
  } catch (e) {
    const msg = String((e as Error & { stderr?: string }).stderr ?? (e as Error).message ?? e);
    return Response.json({ error: msg.slice(0, 500) }, { status: 500 });
  }
}
