import { cn } from '@/lib/cn';

/**
 * Lifecycle badge for planning indexes (PRD status / PLAN stage).
 * Color follows the value so scan-by-state is possible at a glance.
 */
export const DOC_STATUSES = ['draft', 'ready', 'active', 'done', 'superseded'] as const;
export type DocStatusName = (typeof DOC_STATUSES)[number];

const STATUS_STYLE: Record<DocStatusName, string> = {
  draft: 'bg-fd-muted text-fd-muted-foreground',
  ready: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  active: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  done: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  superseded: 'bg-fd-muted text-fd-muted-foreground line-through',
};

export function DocStatus({
  status,
  className,
}: {
  status: DocStatusName;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide normal-case',
        STATUS_STYLE[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

/** ADR revisability badge — matches Decision card chrome. */
export const ADR_STATUSES = ['accepted', 'locked', 'superseded'] as const;
export type AdrStatusName = (typeof ADR_STATUSES)[number];

const ADR_STATUS_STYLE: Record<AdrStatusName, string> = {
  accepted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  locked: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  superseded: 'bg-fd-muted text-fd-muted-foreground line-through',
};

export function AdrStatus({
  status,
  className,
}: {
  status: AdrStatusName;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide normal-case',
        ADR_STATUS_STYLE[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
