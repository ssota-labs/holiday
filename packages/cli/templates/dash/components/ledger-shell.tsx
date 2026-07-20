'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { DataProvider, type Datasets } from '@holiday-cfo/blocks';

/**
 * Figures for every 가계부 block on the page.
 *
 * Prefer the local snapshot API (fresh CLI bake). Fall back to the baked
 * `data/ledger.json` when the API is missing — that is the deploy-photo path.
 */
export function LedgerShell({
  initial,
  children,
}: {
  initial: Datasets;
  children: ReactNode;
}) {
  const [datasets, setDatasets] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/holiday/snapshot');
        if (!res.ok) return;
        const next = (await res.json()) as Datasets;
        if (!cancelled && next?.balances && next?.cashflow && next?.health) {
          setDatasets(next);
        }
      } catch {
        // static / no server — keep bake
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <DataProvider value={datasets}>{children}</DataProvider>;
}
