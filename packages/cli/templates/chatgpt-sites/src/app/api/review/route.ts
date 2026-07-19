import { listInbox } from '../../../lib/fax';
import type { Env } from '../../../lib/env';

export async function GET(_req: Request, ctx: { env: Env }) {
  const rows = await listInbox(ctx.env);
  return Response.json({ mode: 'inbox-export', d1EngineEligible: false, inbox: rows.results ?? [] });
}
