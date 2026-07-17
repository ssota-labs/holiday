import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import { VersionSwitcher } from '@/components/version-switcher';

export default function Layout({ children }: { children: ReactNode }) {
  const base = baseOptions();
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...base}
      sidebar={{ banner: <VersionSwitcher /> }}
    >
      {children}
    </DocsLayout>
  );
}
