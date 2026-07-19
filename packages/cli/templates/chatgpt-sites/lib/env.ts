export type Env = {
  DB: D1Database;
  ORIGINALS: R2Bucket;
  SOLAPI_WEBHOOK_SECRET?: string;
  HOLIDAY_API_TOKEN?: string;
};

export async function sha1Hex(secret: string): Promise<string> {
  const data = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest('SHA-1', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySolapi(header: string | null, secret: string | undefined): Promise<boolean> {
  if (!header || !secret) return false;
  const expected = await sha1Hex(secret);
  return header.toLowerCase() === expected.toLowerCase();
}

export function nowIso(): string {
  return new Date().toISOString();
}
