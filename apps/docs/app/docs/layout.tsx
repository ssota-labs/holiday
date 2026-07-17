import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  // No version switcher: versioning is per-spec, on the page that owns the spec.
  // The data model has been through four migrations, the CLI is 0.1.0, and the
  // domain policy has no version at all — one number across the sidebar would
  // say they move together, and they do not. See components/blocks/spec-version.
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
