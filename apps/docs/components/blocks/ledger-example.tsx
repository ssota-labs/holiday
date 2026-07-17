import { z } from 'zod';

/**
 * A double-entry example, rendered the way an accountant reads one.
 *
 * A fenced code block cannot do the one thing that matters here: show that the
 * weights sum to zero. This computes the sum and displays it, so an example in
 * the docs that does not balance is visibly wrong on the page rather than
 * plausibly wrong.
 *
 * `units` and `weight` are separate columns because that separation is the whole
 * ledger model — the fact and the measurement. Collapsing them into one number
 * would document a different system than the one that exists.
 */
export const legSchema = z.object({
  account: z.string().min(1),
  /** The fact: what moved, in its own commodity. e.g. "750.00 USD" */
  units: z.string().min(1),
  /** The measurement, in minor units of the booking commodity. */
  weight: z.number().int(),
  source: z.enum(['identity', 'actual', 'rate', 'plug']).default('identity'),
  note: z.string().optional(),
});

export const ledgerExampleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payee: z.string().optional(),
  narration: z.string().optional(),
  booking: z.string().default('KRW'),
  legs: z.array(legSchema).min(2, { message: 'a transaction needs at least two postings' }),
});

export type LedgerExampleProps = z.infer<typeof ledgerExampleSchema>;

const SOURCE_STYLE: Record<string, string> = {
  identity: 'text-fd-muted-foreground',
  actual: 'text-emerald-600 dark:text-emerald-400',
  rate: 'text-amber-600 dark:text-amber-400',
  plug: 'text-violet-600 dark:text-violet-400',
};

const fmt = (n: number) => n.toLocaleString('en-US');

export function LedgerExample(props: LedgerExampleProps) {
  const { date, payee, narration, booking, legs } = ledgerExampleSchema.parse(props);
  const sum = legs.reduce((s, l) => s + l.weight, 0);
  const balanced = sum === 0;

  return (
    <div className="not-prose bg-fd-card my-6 overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-baseline gap-2 border-b px-4 py-2 text-sm">
        <code className="font-mono text-xs">{date}</code>
        {payee ? <span className="font-medium">{payee}</span> : null}
        {narration ? <span className="text-fd-muted-foreground">{narration}</span> : null}
        <span className="text-fd-muted-foreground ml-auto font-mono text-xs">booking: {booking}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-fd-muted-foreground border-b text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 font-medium">account</th>
              <th className="px-4 py-2 text-right font-medium">units (fact)</th>
              <th className="px-4 py-2 text-right font-medium">weight ({booking})</th>
              <th className="px-4 py-2 font-medium">source</th>
            </tr>
          </thead>
          <tbody>
            {legs.map((l, i) => (
              <tr key={`${l.account}-${i}`} className="border-b align-top last:border-0">
                <td className="px-4 py-2">
                  <code className="font-mono text-xs">{l.account}</code>
                  {l.note ? <p className="text-fd-muted-foreground mt-0.5 text-xs">{l.note}</p> : null}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">{l.units}</td>
                <td className="px-4 py-2 text-right font-mono text-xs">{fmt(l.weight)}</td>
                <td className={`px-4 py-2 font-mono text-xs ${SOURCE_STYLE[l.source]}`}>{l.source}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2">
            <tr>
              <td className="text-fd-muted-foreground px-4 py-2 text-xs uppercase tracking-wide" colSpan={2}>
                SUM(weight)
              </td>
              <td
                className={`px-4 py-2 text-right font-mono text-xs font-semibold ${
                  balanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {fmt(sum)}
              </td>
              <td className="px-4 py-2 text-xs">
                {balanced ? (
                  <span className="text-emerald-600 dark:text-emerald-400">✓ 정확히 0</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">✗ 불균형 — 이 예제는 틀렸습니다</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
