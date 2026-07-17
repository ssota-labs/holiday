import { z } from 'zod';

/**
 * A Ubiquitous Language entry.
 *
 * The point of a glossary in DDD is not the definitions — it's the *enforcement*:
 * the same word in the spec, in conversation, in the code, and in the column name.
 * So `code` is here to name where the term actually lives in the source. A term
 * that cannot point at its own implementation has already drifted.
 *
 * `ko` exists because this project is bilingual by nature: the domain is Korean
 * personal finance, the code is English. 청구주기 and "billing cycle" must be
 * pinned to each other or they will slowly become two different concepts.
 */
export const termSchema = z.object({
  term: z.string().min(1),
  /** The Korean the user actually says. */
  ko: z.string().optional(),
  /** Where it lives in the code: a type, function, or column name. */
  code: z.string().optional(),
  /** Terms this is easily confused with. Usually the most useful line. */
  notTo: z.string().optional(),
});

export type TermProps = z.infer<typeof termSchema> & { children?: React.ReactNode };

export function Term(props: TermProps) {
  const { term, ko, code, notTo, children } = props;
  const id = term.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div id={id} className="not-prose border-fd-border my-4 border-l-2 py-1 pl-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h4 className="font-semibold">{term}</h4>
        {ko ? <span className="text-fd-muted-foreground text-sm">{ko}</span> : null}
        {code ? (
          <code className="bg-fd-muted rounded px-1.5 py-0.5 font-mono text-xs">{code}</code>
        ) : null}
      </div>
      <div className="prose-sm mt-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
      {notTo ? (
        <p className="text-fd-muted-foreground mt-2 text-sm">
          <span className="font-medium">혼동 주의:</span> {notTo}
        </p>
      ) : null}
    </div>
  );
}

export function Glossary({ children }: { children?: React.ReactNode }) {
  return <div className="not-prose my-6 flex flex-col gap-2">{children}</div>;
}
