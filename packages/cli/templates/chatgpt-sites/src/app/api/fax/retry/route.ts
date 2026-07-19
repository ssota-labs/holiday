import { retryFailed } from '../../../../lib/fax';
import type { Env } from '../../../../lib/env';

export async function POST(_req: Request, ctx: { env: Env }) {
  await retryFailed(ctx.env);
  return Response.json({ ok: true, retried: true });
}
