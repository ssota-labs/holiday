'use client';

import { createContext, useContext } from 'react';

/**
 * The snapshot a dashboard renders — exactly the shape `holiday dash data` bakes.
 *
 * Two properties, both load-bearing.
 *
 * **Amounts are strings, never numbers.** Every amount in the ledger is an i64 in
 * minor units. JSON has no i64, so they serialise as decimal strings, and
 * `Number("9007199254740993")` silently gives ...992. Nothing in the blocks parses
 * one back — see money.ts, which formats the digits directly.
 *
 * **The agent does not fill this in; the CLI does.** The agent chooses which
 * blocks appear and in what order. It supplies no figures, because the catalog
 * gives it no prop that holds one. A model that can type a number into a
 * dashboard will eventually type the wrong one, and a wrong number in a well-made
 * card reads as authoritative — which is the one failure this whole project is
 * organised against.
 */
export interface Datasets {
  /** `holiday --json balance` */
  readonly balances: readonly {
    readonly accountCode: string;
    readonly commodity: string;
    readonly unitsMinor: string;
    readonly weightMinor: string;
  }[];

  /** `holiday --json cashflow` */
  readonly cashflow: {
    readonly asOf: string;
    readonly until: string;
    readonly openingCashMinor: string;
    readonly commodity: string;
    readonly runway: readonly {
      readonly date: string;
      readonly outflowMinor: string;
      readonly balanceAfterMinor: string;
      readonly items: readonly { readonly kind: string; readonly label: string; readonly amountMinor: string }[];
    }[];
    /**
     * What the projection is NOT covering. Rendered, not hidden: a projection
     * that silently omits an outflow reads as reassurance when it should read as
     * "I don't know".
     */
    readonly gaps: readonly { readonly kind: string; readonly subject: string; readonly detail: string }[];
  };

  /** `holiday --json verify` */
  readonly health: {
    readonly ok: boolean;
    readonly checked: number;
    readonly problems: readonly { readonly kind: string; readonly detail: string }[];
    readonly head: { readonly seq: number; readonly hash: string } | null;
  };

  /** When the snapshot was baked. A dashboard that cannot say how old it is lies by omission. */
  readonly bakedAt: string;
}

const DataContext = createContext<Datasets | null>(null);

export function DataProvider({ value, children }: { value: Datasets; children: React.ReactNode }) {
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDatasets(): Datasets {
  const v = useContext(DataContext);
  if (!v) throw new Error('holiday: a dashboard block was rendered outside <DataProvider>');
  return v;
}
