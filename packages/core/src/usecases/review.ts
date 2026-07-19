import type { ReviewAcceptResponse, ReviewListResponse, ReviewRejectResponse } from '@holiday-cfo/contracts';
import type { LedgerStore } from '../ports/ledger-store.js';
import { AppError } from './errors.js';

export async function listPendingReviews(store: LedgerStore): Promise<ReviewListResponse> {
  const rows = await store.read(async (r) => {
    const items = await r.listIngestItems({ status: 'pending' });
    return Promise.all(
      items.map(async (i) => {
        const txn = i.txnId ? await r.getTxn(i.txnId) : null;
        return {
          id: i.id,
          txnId: i.txnId,
          date: txn?.txn.date,
          payee: txn?.txn.payee ?? null,
          merchant: i.merchant,
          status: 'pending' as const,
        };
      }),
    );
  });
  return { items: rows };
}

export async function acceptReview(store: LedgerStore, id: string): Promise<ReviewAcceptResponse> {
  return store.unitOfWork(async (uow) => {
    const items = await uow.listIngestItems();
    const item = items.find((i) => i.id === id);
    if (!item) throw new AppError('not_found', `no such review item: ${id}`);
    if (item.status !== 'pending') throw new AppError('conflict', `item ${id} is already ${item.status}`);
    if (!item.txnId) throw new AppError('usage', `item ${id} has no transaction`);
    await uow.promoteDraft(item.txnId);
    await uow.setIngestItemStatus(id, 'accepted', {});
    return { id, txnId: item.txnId, status: 'accepted' as const };
  });
}

export async function rejectReview(
  store: LedgerStore,
  id: string,
  reason: string,
): Promise<ReviewRejectResponse> {
  await store.unitOfWork(async (uow) => {
    const items = await uow.listIngestItems();
    const item = items.find((i) => i.id === id);
    if (!item) throw new AppError('not_found', `no such review item: ${id}`);
    if (item.status !== 'pending') throw new AppError('conflict', `item ${id} is already ${item.status}`);
    if (item.txnId) await uow.rejectDraft(item.txnId, reason);
    await uow.setIngestItemStatus(id, 'rejected', { reason });
  });
  return { id, status: 'rejected', reason };
}
