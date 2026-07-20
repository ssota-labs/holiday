'use client';

import {
  BalanceTable,
  CashRunway,
  CategorizeQueue,
  Dashboard,
  LedgerHealth,
} from './components.js';
import { DataProvider, type Datasets } from './data.js';

/**
 * Default number cockpit: health, categorize queue, runway, asset balances.
 *
 * Layout lives in this component (and in MDX pages), not in a json-render
 * `spec.json`. Pass the bake/API snapshot via `datasets`.
 */
export function DefaultDashboard({ datasets }: { datasets: Datasets }) {
  return (
    <DataProvider value={datasets}>
      <Dashboard title="가계부">
        <LedgerHealth />
        <CategorizeQueue />
        <CashRunway />
        <BalanceTable account="Assets" />
      </Dashboard>
    </DataProvider>
  );
}
