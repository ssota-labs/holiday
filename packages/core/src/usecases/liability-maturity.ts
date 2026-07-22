import { accountTypeOf, type AccountCode, type IsoDate } from '../domain/index.js';
import {
  classifyLiabilityMaturity,
  type LiabilityMaturitySummary,
  type MaturityScheduleRow,
} from '../domain/liability-maturity.js';
import type { LedgerRead } from '../ports/ledger-store.js';

/**
 * 기준일 부채 잔액 + 할부·대출 스케줄 원금을 모아 유동·비유동 요약을 만든다.
 *
 * CLI `balance` / `close`가 같은 숫자를 쓰도록 조립은 한곳에만 둔다.
 */
export async function liabilityMaturityAt(
  r: LedgerRead,
  opts: { readonly asOf: IsoDate; readonly accountPrefix?: AccountCode },
): Promise<LiabilityMaturitySummary> {
  const { asOf } = opts;
  const balances = await r.getBalances({
    asOf,
    ...(opts.accountPrefix ? { accountPrefix: opts.accountPrefix } : {}),
  });
  const liabilityBalances = balances.filter((b) => accountTypeOf(b.accountCode) === 'liability');

  const scheduleRows: MaturityScheduleRow[] = [];

  for (const inst of await r.listInstallments({ activeOn: asOf })) {
    for (const row of inst.rows) {
      scheduleRows.push({
        accountId: inst.plan.liabilityAccountId,
        dueDate: row.paymentDate,
        principalMinor: row.principalMinor,
      });
    }
  }

  for (const loan of await r.listLoans()) {
    for (const row of loan.rows) {
      scheduleRows.push({
        accountId: loan.loan.accountId,
        dueDate: row.dueDate,
        principalMinor: row.principalMinor,
      });
    }
  }

  return classifyLiabilityMaturity({
    asOf,
    balances: liabilityBalances.map((b) => ({
      accountId: b.accountId,
      accountCode: b.accountCode,
      weightMinor: b.weightMinor,
    })),
    scheduleRows,
  });
}
