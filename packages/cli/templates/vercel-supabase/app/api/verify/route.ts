import { dispatchHttp } from '@holiday-cfo/adapters';
import { requireApiToken, withFacade } from '../../../lib/holiday';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const denied = requireApiToken(req);
  if (denied) return denied;
  return withFacade(async (facade) => {
    const r = await dispatchHttp(facade, { method: 'POST', path: '/verify' });
    return Response.json(r.body, { status: r.status });
  });
}
