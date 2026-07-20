import { holidayCli } from '@/lib/holiday-cli';

/**
 * Local CLI bridge, write side: one click = one `review accept --category`.
 * Deployed / static hosts have no this route — CategorizeQueue collapses to a notice.
 */
export async function POST(req: Request): Promise<Response> {
  let body: { itemId?: string; category?: string; remember?: boolean; payee?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const { itemId, category, remember } = body;
  if (!itemId || !category) {
    return Response.json({ error: 'itemId and category are required' }, { status: 400 });
  }
  if (!/^[A-Za-z][A-Za-z0-9-]*(:[A-Za-z0-9가-힣-]+)*$/.test(category) || !/^[0-9A-Za-z]+$/.test(itemId)) {
    return Response.json({ error: 'malformed itemId or category' }, { status: 400 });
  }

  try {
    await holidayCli(['review', 'accept', itemId, '--category', category], { json: false });

    if (remember) {
      const payee = typeof body.payee === 'string' ? body.payee.trim() : '';
      if (payee) {
        await holidayCli(['rule', 'add', payee, category], { json: false }).catch(() => undefined);
      }
    }

    await holidayCli(['dash', 'data']).catch(() => undefined);

    return Response.json({ ok: true });
  } catch (e) {
    const msg = String((e as Error & { stderr?: string }).stderr ?? (e as Error).message ?? e);
    return Response.json({ error: msg.slice(0, 500) }, { status: 500 });
  }
}
