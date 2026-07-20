import { holidayCli } from '@/lib/holiday-cli';

/**
 * Local CLI bridge, read side: drafts waiting to be categorized.
 * The dash never opens ledger.db — this route shells the CLI.
 */
export async function GET(): Promise<Response> {
  try {
    // Sequential on purpose: concurrent opens race the SQLite write lock.
    const itemsRaw = await holidayCli(['review', 'list']);
    const accountsRaw = await holidayCli(['account', 'list']);
    const items = JSON.parse(itemsRaw) as {
      id: string;
      merchant: string | null;
      parsedJson: string;
    }[];
    const accounts = JSON.parse(accountsRaw) as { code: string; type: string; placeholder?: boolean }[];

    const categories = accounts
      .filter((a) => (a.type === 'expense' || a.type === 'income') && !a.placeholder)
      .map((a) => a.code)
      .filter((c) => !c.endsWith(':Uncategorized'))
      .sort();

    const pending = items.map((i) => {
      let date: string | null = null;
      let amountMinor: string | null = null;
      let commodity = 'KRW';
      try {
        const parsed = JSON.parse(i.parsedJson) as {
          date?: string;
          money?: { amount: string; commodity: string };
          legs?: { amount: string; commodity: string }[];
        };
        date = parsed.date ?? null;
        const m = parsed.money ?? parsed.legs?.[0];
        if (m) {
          amountMinor = m.amount;
          commodity = m.commodity;
        }
      } catch {
        // still show the item without figures
      }
      return { id: i.id, payee: i.merchant, date, amountMinor, commodity };
    });

    return Response.json({ items: pending, categories });
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e) }, { status: 500 });
  }
}
