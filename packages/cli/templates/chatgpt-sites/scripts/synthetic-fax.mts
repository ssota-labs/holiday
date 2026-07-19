/**
 * Synthetic fax idempotency check for ChatGPT Sites preview/saved version.
 * BASE_URL + SOLAPI_WEBHOOK_SECRET required.
 */
import { createHash } from 'node:crypto';

const base = process.env.BASE_URL;
const secret = process.env.SOLAPI_WEBHOOK_SECRET;
if (!base || !secret) {
  console.error('BASE_URL and SOLAPI_WEBHOOK_SECRET are required');
  process.exit(1);
}

const sig = createHash('sha1').update(secret, 'utf8').digest('hex');
const fileId = `synthetic-sites-${Date.now()}`;
const payload = [{ fileId, url: 'https://example.invalid/fax.pdf' }];

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
  return { status: res.status, body: await res.json() };
}

const a = await post();
const b = await post();
if (a.status !== 200 || b.status !== 200) {
  console.error('failed', a, b);
  process.exit(1);
}
console.log(JSON.stringify({ fileId, first: a.body, second: b.body, ok: true }, null, 2));
