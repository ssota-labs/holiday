import { z } from 'zod';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

import { REPO_BLOB } from './repo';

/**
 * A business rule, and the test that proves it.
 *
 * This is the block the whole docs site exists for. In holiday, the policy IS the
 * product — "there is no tolerance", "an installment cannot share the card
 * account", "only project occurrences after today". Those are not implementation
 * notes; they are the reasons the numbers can be trusted.
 *
 * `test` is required, not optional, and that is the entire point. A rule with a
 * link to the test that enforces it cannot quietly become false: break the rule
 * and CI goes red. A rule without one is a wish. `scripts/check-rule-links.ts`
 * fails the build if the file or test name does not resolve, so the link cannot
 * rot into a lie either.
 */
export const ruleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Repo-relative path to the test file. */
  test: z.string().regex(/^packages\/.+\.test\.ts$/, {
    message: 'test must be a repo-relative path to a .test.ts file under packages/',
  }),
  /** The `it(...)` name inside that file, so a human can find it in seconds. */
  testName: z.string().min(1),
  /** What breaks if this is violated. Not decoration — a rule with no stated
   *  consequence gets "simplified away" by the next person. */
  consequence: z.string().min(1),
});

export type RuleProps = z.infer<typeof ruleSchema> & { children?: React.ReactNode };

export function Rule(props: RuleProps) {
  const { id, title, test, testName, consequence, children } = ruleSchema.extend({}).parse(props) as RuleProps;

  return (
    <div id={id} className="not-prose bg-fd-card my-6 rounded-lg border">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <ShieldAlert className="text-fd-primary mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-fd-muted-foreground font-mono text-xs">{id}</div>
          <h4 className="font-semibold">{title}</h4>
        </div>
      </div>

      <div className="prose-sm px-4 py-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>

      <div className="text-fd-muted-foreground border-t px-4 py-3 text-sm">
        <p className="mb-2">
          <span className="text-fd-foreground font-medium">위반 시:</span> {consequence}
        </p>
        <p className="flex items-center gap-2">
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
          <span>검증 테스트:</span>
          <a
            className="text-fd-primary font-mono text-xs underline underline-offset-2"
            href={`${REPO_BLOB}/${test}`}
            target="_blank"
            rel="noreferrer"
          >
            {test}
          </a>
        </p>
        <p className="mt-1 pl-[1.375rem] font-mono text-xs">it(&quot;{testName}&quot;)</p>
      </div>
    </div>
  );
}
