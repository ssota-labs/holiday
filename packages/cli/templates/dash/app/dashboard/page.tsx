import {
  BalanceTable,
  CashRunway,
  CategorizeQueue,
  Dashboard,
  LedgerHealth,
} from '@holiday-cfo/blocks';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import Link from 'next/link';

import { baseOptions } from '@/lib/layout.shared';

/**
 * Number cockpit — separate from memo MDX pages.
 * Figures come from LedgerShell (API or bake); no amount props here.
 */
export default function DashboardPage() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="border-b px-6 py-3 text-sm">
        <Link href="/docs" className="text-fd-muted-foreground hover:text-fd-foreground underline-offset-4 hover:underline">
          메모·기록
        </Link>
      </div>
      <Dashboard title="가계부">
        <LedgerHealth />
        <CategorizeQueue />
        <CashRunway />
        <BalanceTable account="Assets" />
      </Dashboard>
    </HomeLayout>
  );
}
