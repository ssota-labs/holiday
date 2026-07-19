import postgres from 'postgres';
import { pgLedgerStore, postgresJsClient } from '@holiday-cfo/store-postgres';
import type { CommodityCode, LedgerStore } from '@holiday-cfo/core';
import { createClient } from '@supabase/supabase-js';
import type { HolidayFacade } from '@holiday-cfo/adapters';

/**
 * Supavisor transaction pooler: prepare:false is mandatory.
 * int8 must arrive as bigint — never as string/number.
 */
export function createSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  return postgres(url, {
    prepare: false,
    types: {
      bigint: postgres.BigInt,
    },
  });
}

export async function openStore(): Promise<
  LedgerStore & { chainHead(): Promise<{ seq: number; hash: string } | null> }
> {
  const sql = createSql();
  const store = pgLedgerStore({
    client: postgresJsClient(sql),
    book: {
      functionalCurrency: (process.env.HOLIDAY_FUNCTIONAL_CURRENCY ?? 'KRW') as CommodityCode,
      closeGrain: 'month',
      timezone: 'Asia/Seoul',
    },
  });
  await store.init();
  await store.migrate();
  return store;
}

export function storage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function withFacade<T>(fn: (f: HolidayFacade) => Promise<T>): Promise<T> {
  const store = await openStore();
  try {
    return await fn({
      store,
      functionalCurrency: (process.env.HOLIDAY_FUNCTIONAL_CURRENCY ?? 'KRW') as CommodityCode,
      chainHead: () => store.chainHead(),
    });
  } finally {
    await store.close();
  }
}

export function requireApiToken(req: Request): Response | null {
  const expected = process.env.HOLIDAY_API_TOKEN;
  if (!expected) return null;
  const auth = req.headers.get('authorization') ?? '';
  if (auth === `Bearer ${expected}`) return null;
  return Response.json(
    { error: { code: 'unauthorized', message: 'missing or invalid bearer token' } },
    { status: 401 },
  );
}
