'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { VERSIONS, versionFromSlug } from '@/lib/versions';

/**
 * Swaps the version segment of the current path, keeping the rest.
 *
 * `/docs/v0.1/cli` → `/docs/v0.2/cli`. If that page doesn't exist in the target
 * version, Next 404s — which is honest: the page genuinely wasn't in that
 * snapshot, and silently redirecting to the version root would hide that.
 */
export function VersionSwitcher() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean); // ['docs', 'v0.1', ...]
  const current = versionFromSlug(segments.slice(1));

  if (VERSIONS.length < 2) {
    return (
      <span className="text-fd-muted-foreground rounded-md border px-2 py-1 text-xs" title="Only one version so far">
        {current.label}
      </span>
    );
  }

  return (
    <div className="flex gap-1">
      {VERSIONS.map((v) => (
        <Link
          key={v.slug}
          href={`/${['docs', v.slug, ...segments.slice(2)].join('/')}`}
          className={
            v.slug === current.slug
              ? 'bg-fd-primary text-fd-primary-foreground rounded-md px-2 py-1 text-xs'
              : 'text-fd-muted-foreground hover:bg-fd-accent rounded-md px-2 py-1 text-xs'
          }
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}
