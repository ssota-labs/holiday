import type { VerifyResponse } from '@holiday-cfo/contracts';
import type { LedgerStore } from '../ports/ledger-store.js';
import { AppError } from './errors.js';

export interface VerifyOptions {
  /** When true, throw AppError('verify_failed') if the report is not ok. */
  readonly throwOnFailure?: boolean;
  /** Optional chain-head reader for stores that expose it (SqlLedgerStore). */
  readonly chainHead?: () => Promise<{ seq: number; hash: string } | null>;
}

export async function verifyLedger(store: LedgerStore, opts: VerifyOptions = {}): Promise<VerifyResponse> {
  const report = await store.unitOfWork((uow) => uow.verify());
  const head = opts.chainHead ? await opts.chainHead() : undefined;
  const response: VerifyResponse = {
    ok: report.ok,
    checked: report.checked,
    problems: report.problems.map((p) => ({
      kind: p.kind,
      subject: p.subject,
      detail: p.detail,
    })),
    ...(head !== undefined ? { head } : {}),
  };
  if (opts.throwOnFailure && !response.ok) {
    throw new AppError('verify_failed', `${response.problems.length} problem(s) found`);
  }
  return response;
}
