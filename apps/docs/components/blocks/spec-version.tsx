import { z } from 'zod';

import { REPO_BLOB } from './repo';

/**
 * The version of ONE spec, with its history.
 *
 * Replaces a site-wide version switcher, which was a lie: the data model has been
 * through four migrations, the CLI is 0.1.0, and the domain policy has no version
 * at all — it is either true now or it is wrong. Stamping one number across all
 * of them says they move together, and they do not.
 *
 * `source` is required. Every entry has to point at the artifact that proves it —
 * a migration folder, a git tag, a package version. A hand-maintained changelog
 * drifts from the thing it describes within a month; one that names its evidence
 * can at least be checked.
 */
export const specVersionSchema = z.object({
  /** What is versioned. "데이터 모델", "CLI 스펙". */
  spec: z.string().min(1),
  /** The version this page describes. */
  version: z.string().min(1),
  /** Where the number comes from, so nobody has to trust it. */
  source: z.string().min(1),
  history: z
    .array(
      z.object({
        version: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        summary: z.string().min(1),
        /** Repo-relative path to the artifact — a migration folder, a file. */
        ref: z.string().optional(),
      }),
    )
    .min(1),
});

export type SpecVersionProps = z.infer<typeof specVersionSchema>;

export function SpecVersion(props: SpecVersionProps) {
  const { spec, version, source, history } = specVersionSchema.parse(props);
  const ordered = [...history].reverse();

  return (
    <div className="not-prose bg-fd-card my-6 overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-baseline gap-2 border-b px-4 py-3">
        <span className="text-fd-muted-foreground text-xs uppercase tracking-wide">{spec}</span>
        <code className="bg-fd-primary/10 text-fd-primary rounded px-2 py-0.5 font-mono text-sm font-semibold">
          {version}
        </code>
        <span className="text-fd-muted-foreground ml-auto font-mono text-xs">{source}</span>
      </div>

      <ol className="flex flex-col">
        {ordered.map((h, i) => (
          <li key={h.version} className="flex gap-3 border-b px-4 py-2 last:border-0">
            <code
              className={`font-mono text-xs ${i === 0 ? 'text-fd-primary font-semibold' : 'text-fd-muted-foreground'}`}
            >
              {h.version}
            </code>
            <span className="text-fd-muted-foreground shrink-0 font-mono text-xs">{h.date}</span>
            <span className="min-w-0 flex-1 text-sm">
              {h.summary}
              {h.ref ? (
                <a
                  className="text-fd-muted-foreground hover:text-fd-primary ml-2 font-mono text-xs underline underline-offset-2"
                  href={`${REPO_BLOB}/${h.ref}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {h.ref.split('/').at(-1)}
                </a>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
