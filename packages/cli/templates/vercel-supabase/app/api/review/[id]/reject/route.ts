import { dispatchHttp } from '@holiday-cfo/adapters';
import { requireApiToken, withFacade } from '../../../../../lib/holiday';

export const runtime = 'nodejs';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireApiToken(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  return withFacade(async (facade) => {
    const r = await dispatchHttp(facade, {
      method: 'POST',
      path: `/review/${encodeURIComponent(id)}/reject`,
      body,
    });
    return Response.json(r.body, { status: r.status });
  });
}
