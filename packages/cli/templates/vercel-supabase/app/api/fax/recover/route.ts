import { listFailed, storeOriginal, markFax, notifyCursor, type SolapiFaxEvent } from '../../../../lib/fax';
import { createSql, requireApiToken } from '../../../../lib/holiday';

export const runtime = 'nodejs';

/** Re-process fax_inbox rows that never completed after() work. */
export async function POST(req: Request) {
  const denied = requireApiToken(req);
  if (denied) return denied;

  const rows = await listFailed();
  const sql = createSql();
  const results: { fileId: string; ok: boolean; error?: string }[] = [];
  try {
    for (const row of rows) {
      try {
        const [payload] = await sql<{ payload_json: SolapiFaxEvent }[]>`
          select payload_json from fax_inbox where file_id = ${row.file_id}
        `;
        const url = payload?.payload_json?.url;
        if (!url) throw new Error('missing url in payload');
        await storeOriginal(row.file_id, url);
        await notifyCursor(row.file_id);
        await markFax(row.file_id, 'processing');
        results.push({ fileId: row.file_id, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await markFax(row.file_id, 'failed', msg);
        results.push({ fileId: row.file_id, ok: false, error: msg });
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
  return Response.json({ recovered: results });
}
