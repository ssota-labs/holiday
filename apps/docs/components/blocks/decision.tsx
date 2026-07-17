import { z } from 'zod';

/**
 * An ADR.
 *
 * `rejected` is required and it is the whole value of the block. Anyone can read
 * the code to learn what was chosen; nobody can read it to learn what was tried
 * and thrown away, and that is precisely what gets re-proposed a year later.
 * "Why don't we just store the exchange rate?" has an answer, and it needs to
 * live somewhere a person will find it before rewriting the ledger.
 *
 * `status` is honest about revisability: `accepted` decisions can change,
 * `locked` ones cannot without a migration that rewrites history.
 */
export const decisionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['accepted', 'superseded', 'locked']).default('accepted'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rejected: z
    .array(z.object({ option: z.string().min(1), because: z.string().min(1) }))
    .min(1, { message: 'a decision with no rejected alternative is not a decision' }),
  /** The commit where this landed, so the reasoning has a second home. */
  commit: z.string().optional(),
});

export type DecisionProps = z.infer<typeof decisionSchema> & { children?: React.ReactNode };

const STATUS_STYLE: Record<string, string> = {
  accepted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  superseded: 'bg-fd-muted text-fd-muted-foreground line-through',
  locked: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

export function Decision(props: DecisionProps) {
  const { id, title, status = 'accepted', date, rejected, commit, children } = props;

  return (
    <div id={id} className="not-prose bg-fd-card my-6 rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="text-fd-muted-foreground font-mono text-xs">{id}</span>
        <h4 className="flex-1 font-semibold">{title}</h4>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{status}</span>
        <span className="text-fd-muted-foreground font-mono text-xs">{date}</span>
      </div>

      <div className="prose-sm px-4 py-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>

      <div className="border-t px-4 py-3">
        <h5 className="text-fd-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
          거부한 대안
        </h5>
        <ul className="flex flex-col gap-2">
          {rejected.map((r) => (
            <li key={r.option} className="text-sm">
              <span className="text-fd-foreground font-medium line-through decoration-fd-muted-foreground/50">
                {r.option}
              </span>
              <span className="text-fd-muted-foreground"> — {r.because}</span>
            </li>
          ))}
        </ul>
        {commit ? (
          <p className="text-fd-muted-foreground mt-3 font-mono text-xs">
            landed in <code>{commit}</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}
