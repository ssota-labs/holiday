import { listInbox } from '../../../lib/fax';
import type { Env } from '../../../lib/env';

/**
 * Limited MCP surface for Sites inbox/export mode.
 * Does NOT expose ledger mutate tools — there is no engine ledger here.
 */
export async function GET() {
  return Response.json({
    tools: [
      { name: 'holiday_sites_inbox_list', description: 'List fax inbox rows (Sites inbox-export mode)' },
      { name: 'holiday_sites_fax_retry', description: 'Retry failed/received fax downloads into R2' },
    ],
    mode: 'inbox-export',
    d1EngineEligible: false,
  });
}

export async function POST(req: Request, ctx: { env: Env }) {
  const body = (await req.json()) as { name?: string };
  if (body.name === 'holiday_sites_inbox_list') {
    const rows = await listInbox(ctx.env);
    return Response.json({ ok: true, inbox: rows.results ?? [] });
  }
  if (body.name === 'holiday_sites_fax_retry') {
    const { retryFailed } = await import('../../../lib/fax');
    await retryFailed(ctx.env);
    return Response.json({ ok: true });
  }
  return Response.json({ error: { code: 'not_found', message: `unknown tool ${body.name}` } }, { status: 404 });
}
