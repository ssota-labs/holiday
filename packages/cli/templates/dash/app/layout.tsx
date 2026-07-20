import './global.css';

import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

import { LedgerShell } from '@/components/ledger-shell';
import type { Datasets } from '@holiday-cfo/blocks';

import baked from '../data/ledger.json';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>
          <LedgerShell initial={baked as Datasets}>{children}</LedgerShell>
        </RootProvider>
      </body>
    </html>
  );
}
