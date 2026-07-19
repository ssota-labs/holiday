import { after } from 'next/server';
import { verifySolapiSecret, upsertFaxReceived, storeOriginal, markFax, notifyCursor, type SolapiFaxEvent } from '../../../lib/fax';

export const runtime = 'nodejs';

/**
 * SOLAPI FAX-RECEIVE webhook.
 *
 * Must acknowledge within ~5s. Persist fileId uniquely, return 200, then
 * best-effort download + Cursor notify via after(). Durable recover route
 * covers lost after() work.
 */
export async function POST(req: Request) {
  const secret = process.env.SOLAPI_WEBHOOK_SECRET ?? '';
  const header = req.headers.get('x-solapi-secret');
  if (!verifySolapiSecret(header, secret)) {
    return Response.json({ error: { code: 'unauthorized', message: 'bad X-Solapi-Secret' } }, { status: 401 });
  }

  const eventName = req.headers.get('x-solapi-event-name') ?? 'FAX-RECEIVE';
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: 'usage', message: 'body must be JSON' } }, { status: 400 });
  }
  if (!Array.isArray(body)) {
    return Response.json({ error: { code: 'usage', message: 'SOLAPI payload must be a JSON array' } }, { status: 400 });
  }

  const events = body as SolapiFaxEvent[];
  const ids = await upsertFaxReceived(events, eventName);

  after(async () => {
    for (const ev of events) {
      const fileId = ev.fileId;
      const url = ev.url;
      if (!fileId || !url) continue;
      try {
        await storeOriginal(fileId, url);
        await notifyCursor(fileId);
        await markFax(fileId, 'processing');
      } catch (e) {
        await markFax(fileId, 'failed', e instanceof Error ? e.message : String(e));
      }
    }
  });

  return Response.json({ ok: true, accepted: ids.length, fileIds: ids });
}
