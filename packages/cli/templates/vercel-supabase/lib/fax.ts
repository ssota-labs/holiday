import { createHash } from 'node:crypto';
import { createSql, storage } from './holiday';

export type SolapiFaxEvent = {
  fileId?: string;
  url?: string;
  [k: string]: unknown;
};

/** SOLAPI sends X-Solapi-Secret = SHA1(raw shared secret). */
export function verifySolapiSecret(header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = createHash('sha1').update(secret, 'utf8').digest('hex');
  return header.toLowerCase() === expected.toLowerCase();
}

export async function upsertFaxReceived(events: SolapiFaxEvent[], eventName: string): Promise<string[]> {
  const sql = createSql();
  const ids: string[] = [];
  try {
    for (const ev of events) {
      const fileId = ev.fileId;
      if (!fileId) continue;
      ids.push(fileId);
      await sql`
        insert into fax_inbox (file_id, event_name, payload_json, status)
        values (${fileId}, ${eventName}, ${sql.json(ev as never)}, 'received')
        on conflict (file_id) do nothing
      `;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
  return ids;
}

export async function storeOriginal(fileId: string, downloadUrl: string): Promise<string> {
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const path = `fax/${fileId}`;
  const sb = storage();
  const { error } = await sb.storage.from('fax-originals').upload(path, bytes, {
    contentType: res.headers.get('content-type') ?? 'application/pdf',
    upsert: true,
  });
  if (error) throw error;
  const sql = createSql();
  try {
    await sql`
      update fax_inbox
      set storage_path = ${path}, status = 'stored', updated_at = now()
      where file_id = ${fileId}
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
  return path;
}

export async function markFax(fileId: string, status: string, error?: string): Promise<void> {
  const sql = createSql();
  try {
    await sql`
      update fax_inbox
      set status = ${status}, error = ${error ?? null}, updated_at = now()
      where file_id = ${fileId}
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function listFailed(limit = 50): Promise<{ file_id: string; status: string; error: string | null }[]> {
  const sql = createSql();
  try {
    return await sql`
      select file_id, status, error from fax_inbox
      where status in ('failed', 'received', 'stored')
      order by received_at asc
      limit ${limit}
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Best-effort notify Cursor Automation (never block SOLAPI ack on this). */
export async function notifyCursor(fileId: string): Promise<void> {
  const url = process.env.CURSOR_AUTOMATION_URL;
  const token = process.env.CURSOR_AUTOMATION_TOKEN;
  if (!url || !token) return;
  await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ source: 'holiday-fax', fileId }),
  });
}
