import { cn } from '@/lib/cn';

/**
 * Document-kind ticker for planning artifacts (PRD / US / PLAN) and related IDs.
 * Used on index tables and page titles so type is visible without sidebar nesting.
 */
export const DOC_KINDS = ['PRD', 'US', 'PLAN', 'SPEC', 'ADR'] as const;
export type DocKindName = (typeof DOC_KINDS)[number];

const KIND_STYLE: Record<DocKindName, string> = {
  PRD: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  US: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  PLAN: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  SPEC: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  ADR: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

export function DocKind({
  kind,
  className,
}: {
  kind: DocKindName;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase',
        KIND_STYLE[kind],
        className,
      )}
    >
      {kind}
    </span>
  );
}

/** Infer kind from a docs URL slug path (e.g. `planning/prds/prd-tax-return-sor`). */
export function docKindFromSlug(slug: readonly string[] | undefined): DocKindName | null {
  if (!slug || slug.length === 0) return null;
  const [a, b] = slug;
  if (a === 'planning' && b === 'prds' && slug.length > 2) return 'PRD';
  if (a === 'planning' && b === 'stories' && slug.length > 2) return 'US';
  if (a === 'planning' && b === 'plans' && slug.length > 2) return 'PLAN';
  if (a === 'design' && b === 'adr') return 'ADR';
  if (a === 'spec' && slug.length >= 2) return 'SPEC';
  return null;
}
