import { holidayCli } from '@/lib/holiday-cli';

/**
 * Local snapshot — same shape as `holiday dash data` bake.
 * Re-bakes so the cockpit matches the ledger at request time.
 */
export async function GET(): Promise<Response> {
  try {
    const raw = await holidayCli(['dash', 'data']);
    return Response.json(JSON.parse(raw));
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e) }, { status: 500 });
  }
}
