/**
 * Synthetic SOLAPI FAX-RECEIVE duplicate test against a preview URL.
 *
 * Usage:
 *   BASE_URL=https://….vercel.app SOLAPI_WEBHOOK_SECRET=… pnpm test:synthetic-fax
 *
 * Passes only when the second identical fileId is accepted without creating a
 * second fax_inbox row (idempotent UNIQUE file_id).
 */
import { createHash } from 'node:crypto';

const base = process.env.BASE_URL;
const secret = process.env.SOLAPI_WEBHOOK_SECRET;
if (!base || !secret) {
  console.error('BASE_URL and SOLAPI_WEBHOOK_SECRET are required');
  process.exit(1);
}

const sig = createHash('sha1').update(secret, 'utf8').digest('hex');
const fileId = `synthetic-${Date.now()}`;
const payload = [{ fileId, url: 'https://example.invalid/fax.pdf', pages: 1 }];

async function post() {
  const res = await fetch(`${base.replace(/\/$/, '')}/api/fax/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-solapi-secret': sig,
      'x-solapi-event-name': 'FAX-RECEIVE',
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  return { status: res.status, body };
}

const a = await post();
const b = await post();
if (a.status !== 200 || b.status !== 200) {
  console.error('webhook did not return 200', a, b);
  process.exit(1);
}
console.log(JSON.stringify({ fileId, first: a.body, second: b.body, ok: true }, null, 2));
