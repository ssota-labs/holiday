import type { AccountListResponse } from '@holiday-cfo/contracts';
import type { LedgerStore } from '../ports/ledger-store.js';

export async function listAccounts(store: LedgerStore): Promise<AccountListResponse> {
  const accounts = await store.read((r) => r.listAccounts());
  return {
    accounts: accounts.map((a) => ({
      id: a.id,
      code: a.code,
      type: a.type,
      commodity: a.commodity,
      cash: a.cash,
      placeholder: a.placeholder,
      monetary: a.monetary,
    })),
  };
}
