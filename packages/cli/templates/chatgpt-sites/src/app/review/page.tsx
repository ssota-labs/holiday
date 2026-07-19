'use client';

import { useEffect, useState } from 'react';

type Row = { file_id: string; status: string; error: string | null; r2_key: string | null; received_at: string };

export default function ReviewPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState('');

  async function refresh() {
    const res = await fetch('/api/review');
    const json = await res.json();
    setRows(json.inbox ?? []);
  }

  async function retry() {
    const res = await fetch('/api/fax/retry', { method: 'POST' });
    setMsg(res.ok ? 'retry requested' : 'retry failed');
    await refresh();
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>Fax inbox (Sites)</h1>
      <p>Explicit retry only — no Queue/Cron on ChatGPT Sites.</p>
      <button type="button" onClick={() => void retry()}>
        Retry failed
      </button>{' '}
      <button type="button" onClick={() => void refresh()}>
        Refresh
      </button>
      {msg ? <p>{msg}</p> : null}
      <ul>
        {rows.map((r) => (
          <li key={r.file_id}>
            <code>{r.file_id}</code> — {r.status}
            {r.error ? ` (${r.error})` : ''}
            {r.r2_key ? ` → ${r.r2_key}` : ''}
          </li>
        ))}
      </ul>
    </main>
  );
}
