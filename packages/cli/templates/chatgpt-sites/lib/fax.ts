import { nowIso, type Env } from './env';

export type FaxEvent = { fileId?: string; url?: string; [k: string]: unknown };

export async function acceptFaxEvents(env: Env, events: FaxEvent[], eventName: string): Promise<string[]> {
  const ids: string[] = [];
  const stmts = [];
  for (const ev of events) {
    if (!ev.fileId) continue;
    ids.push(ev.fileId);
    stmts.push(
      env.DB.prepare(
        `insert or ignore into fax_inbox (file_id, event_name, payload_json, status, received_at, updated_at)
         values (?, ?, ?, 'received', ?, ?)`,
      ).bind(ev.fileId, eventName, JSON.stringify(ev), nowIso(), nowIso()),
    );
  }
  if (stmts.length) await env.DB.batch(stmts);
  return ids;
}

/** Synchronous best-effort store — Sites has no Queue/Cron. Failures stay in D1. */
export async function tryStoreOriginal(env: Env, ev: FaxEvent): Promise<void> {
  if (!ev.fileId || !ev.url) return;
  try {
    const res = await fetch(ev.url);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const key = `fax/${ev.fileId}`;
    await env.ORIGINALS.put(key, await res.arrayBuffer(), {
      httpMetadata: { contentType: res.headers.get('content-type') ?? 'application/pdf' },
    });
    await env.DB.prepare(
      `update fax_inbox set r2_key = ?, status = 'stored', updated_at = ? where file_id = ?`,
    )
      .bind(key, nowIso(), ev.fileId)
      .run();
  } catch (e) {
    await env.DB.prepare(`update fax_inbox set status = 'failed', error = ?, updated_at = ? where file_id = ?`)
      .bind(e instanceof Error ? e.message : String(e), nowIso(), ev.fileId)
      .run();
  }
}

export async function listInbox(env: Env) {
  return env.DB.prepare(`select file_id, status, error, r2_key, received_at from fax_inbox order by received_at desc limit 100`).all();
}

export async function retryFailed(env: Env) {
  const { results } = await env.DB.prepare(
    `select file_id, payload_json from fax_inbox where status in ('failed', 'received') order by received_at asc limit 20`,
  ).all<{ file_id: string; payload_json: string }>();
  for (const row of results ?? []) {
    const ev = JSON.parse(row.payload_json) as FaxEvent;
    await tryStoreOriginal(env, ev);
  }
}
