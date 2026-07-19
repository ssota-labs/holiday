import { acceptFaxEvents, tryStoreOriginal, type FaxEvent } from '../../../../lib/fax';
import { verifySolapi, type Env } from '../../../../lib/env';

export async function POST(req: Request, ctx: { env: Env }) {
  const ok = await verifySolapi(req.headers.get('x-solapi-secret'), ctx.env.SOLAPI_WEBHOOK_SECRET);
  if (!ok) {
    return Response.json({ error: { code: 'unauthorized', message: 'bad X-Solapi-Secret' } }, { status: 401 });
  }
  const eventName = req.headers.get('x-solapi-event-name') ?? 'FAX-RECEIVE';
  const body = await req.json();
  if (!Array.isArray(body)) {
    return Response.json({ error: { code: 'usage', message: 'payload must be a JSON array' } }, { status: 400 });
  }
  const events = body as FaxEvent[];
  const ids = await acceptFaxEvents(ctx.env, events, eventName);
  // No background queue on Sites — attempt store inline; failures remain retryable.
  for (const ev of events) await tryStoreOriginal(ctx.env, ev);
  return Response.json({ ok: true, accepted: ids.length, fileIds: ids, mode: 'inbox-export' });
}
