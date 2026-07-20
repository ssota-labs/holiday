import {
  cashRunway,
  type CommodityCode,
  type IsoDate,
  type ProjectedOutflow,
  projectCardBills,
  projectInstallments,
  projectLoans,
  type ProjectionPosting,
  projectRecurring,
  projectRecurringIncome,
} from '../domain/index.js';
import type { LedgerRead } from '../ports/ledger-store.js';
import { addMonthsIso } from './dates.js';

/** A projected cash movement, or a caller's hypothetical folded into the same runway. */
type RunwayItem =
  | ProjectedOutflow
  | { readonly kind: 'assumption'; readonly paymentDate: IsoDate; readonly amountMinor: bigint; readonly label: string };

/**
 * "Will the cash survive the bills that are already coming?" — assembled once.
 *
 * This lived inside the `holiday cashflow` command, which was fine while the CLI
 * was the only caller. It is not: the dashboard needs the same answer, and a
 * dashboard that re-assembles it from the same domain functions would be a second
 * implementation of the hardest read in the system. Two implementations agree on
 * the day they are written and drift on the first fix that lands in one of them.
 * That is the same argument that collapsed two stores into one, and it applies
 * harder here, because a projection that quietly disagrees with the CLI is not a
 * bug anyone notices — both numbers look plausible.
 *
 * So the CLI formats this, the dashboard bakes this, and neither computes it.
 *
 * Pure with respect to time: `asOf` is a parameter. Nothing here calls Date.now().
 */

/**
 * Something real that this projection does NOT include.
 *
 * Not decoration. A projection that silently omits an outflow reads as
 * reassurance when it should read as "I don't know" — so every caller is handed
 * the gaps along with the numbers, and the dashboard is expected to show them
 * next to the runway rather than beneath a fold.
 */
export interface CashflowGap {
  readonly kind: 'installment-off-cycle' | 'asset-not-marked-cash' | 'income-not-to-cash';
  /** Account code or plan label — whatever the user would recognise. */
  readonly subject: string;
  readonly detail: string;
}

/**
 * A hypothetical the caller wants folded into the runway: a purchase they are
 * considering, a bonus they expect, a lump-sum they might pay down. It is not in
 * the ledger and never touches it — the whole point is to ask "what if" without
 * writing anything.
 *
 * `changeMinor` is signed the way a cash leg is: money LEAVING the account is
 * negative, money arriving is positive. So a ₩5,000,000 laptop is -5000000 and a
 * ₩3,000,000 bonus is +3000000. Same rule as `txn add`, so the user does not
 * learn a second sign convention.
 */
export interface CashflowAssumption {
  readonly date: IsoDate;
  readonly changeMinor: bigint;
  readonly label: string;
}

export interface CashflowPoint {
  readonly date: IsoDate;
  readonly outflowMinor: bigint;
  readonly balanceAfterMinor: bigint;
  readonly items: readonly { readonly kind: string; readonly label: string; readonly amountMinor: bigint }[];
}

export interface CashflowProjection {
  readonly asOf: IsoDate;
  readonly until: IsoDate;
  readonly openingCashMinor: bigint;
  readonly commodity: CommodityCode;
  readonly runway: readonly CashflowPoint[];
  readonly gaps: readonly CashflowGap[];
}

/**
 * How far back to look for card charges.
 *
 * A cycle that has closed but not yet been billed is still an outflow, and the
 * longest cycle plus its payment lag is comfortably under four months.
 */
const POSTING_WINDOW_MONTHS = -4;

export async function projectCashflow(
  r: LedgerRead,
  opts: { readonly asOf: IsoDate; readonly until: IsoDate; readonly assume?: readonly CashflowAssumption[] },
): Promise<CashflowProjection> {
  const { asOf, until } = opts;
  const book = await r.getBook();

  const accounts = await r.listAccounts();
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const cards = (await r.listCards()).map((c) => ({
    accountId: c.accountId,
    accountCode: byId.get(c.accountId)!.code,
    fundingAccountId: c.fundingAccountId,
    rule: c.rule,
    label: c.label,
  }));

  // The historical half of a cash flow statement is a QUERY, never a maintained
  // table — that is what stops it drifting from the ledger.
  const cashIds = new Set(accounts.filter((a) => a.cash).map((a) => a.id));
  const balances = await r.getBalances({ asOf });
  const openingCashMinor = balances.filter((b) => cashIds.has(b.accountId)).reduce((s, b) => s + b.weightMinor, 0n);

  const postings: ProjectionPosting[] = [];
  for await (const p of r.streamPostings({ from: addMonthsIso(asOf, POSTING_WINDOW_MONTHS) })) {
    const account = byId.get(p.accountId);
    if (!account) continue;
    postings.push({
      txnId: p.txnId,
      txnDate: p.txnDate,
      accountId: p.accountId,
      accountType: account.type,
      weightMinor: p.weightMinor,
      commodity: p.commodity,
      correctsTxnId: p.correctsTxnId,
      systemKind: p.systemKind,
    });
  }

  // Installments are NOT derived from postings: their postings all sit on the
  // purchase date, and only the schedule knows a twelfth moves each month.
  const installments = (await r.listInstallments({ activeOn: asOf })).map((i) => ({
    id: i.plan.id,
    cardAccountId: i.plan.cardAccountId,
    liabilityAccountId: i.plan.liabilityAccountId,
    label: i.plan.label,
    months: i.plan.months,
    rows: i.rows,
  }));
  const recurring = await r.listRecurring({ activeOn: asOf });
  const recurringIncomes = await r.listRecurringIncome({ activeOn: asOf });
  const loans = (await r.listLoans()).map((l) => ({
    accountId: l.loan.accountId,
    fundingAccountId: l.loan.fundingAccountId,
    label: l.loan.label,
    termMonths: l.loan.termMonths,
    rows: l.rows,
  }));

  const fundingByCard = new Map(cards.map((c) => [c.accountId, c.fundingAccountId]));
  const cardRules = new Map(cards.map((c) => [c.accountId, { rule: c.rule, fundingAccountId: c.fundingAccountId }]));

  // Incomes that do not land in a --cash account cannot answer "will the cash
  // survive" — projecting them would invent spendable money. Surface the gap
  // instead of silently omitting or silently including.
  const incomesToCash = recurringIncomes.filter((i) => cashIds.has(i.depositAccountId));
  const incomesOffCash = recurringIncomes.filter((i) => !cashIds.has(i.depositAccountId));

  // Assumptions ride in the same runway as real outflows — the user asked to see
  // them "얹어서", not in a separate column. They are tagged so a reader can tell
  // a hypothetical from a committed bill.
  const assumed: RunwayItem[] = (opts.assume ?? [])
    .filter((a) => a.date >= asOf && a.date <= until)
    .map((a) => ({ kind: 'assumption', paymentDate: a.date, amountMinor: -a.changeMinor, label: a.label }));

  const runway = cashRunway<RunwayItem>(openingCashMinor, [
    ...projectCardBills({ cards, postings, today: asOf, until }),
    ...projectInstallments({ installments, fundingByCard, today: asOf, until }),
    ...projectRecurring({ recurring, cardRules, today: asOf, until }),
    ...projectRecurringIncome({ incomes: incomesToCash, today: asOf, until }),
    ...projectLoans({ loans, today: asOf, until }),
    ...assumed,
  ]);

  const gaps: CashflowGap[] = [
    ...installments
      .filter((i) => !fundingByCard.has(i.cardAccountId))
      .map(
        (i): CashflowGap => ({
          kind: 'installment-off-cycle',
          subject: i.label ?? i.id,
          detail: 'is on a card with no billing cycle, so its rows are NOT in this projection',
        }),
      ),
    ...incomesOffCash.map((i): CashflowGap => {
      const deposit = byId.get(i.depositAccountId);
      return {
        kind: 'income-not-to-cash',
        subject: i.label,
        detail: `deposits to ${deposit?.code ?? i.depositAccountId}, which is not --cash, so it is NOT in this projection`,
      };
    }),
    // An asset account nobody marked as cash is either deliberate or an oversight,
    // and only the user knows which. Saying nothing makes the oversight invisible.
    ...accounts
      .filter((a) => a.type === 'asset' && !a.cash && !a.placeholder && !a.closedOn)
      .map(
        (a): CashflowGap => ({
          kind: 'asset-not-marked-cash',
          subject: a.code,
          detail: 'is not marked --cash, so it is NOT counted as cash on hand',
        }),
      ),
  ];

  return {
    asOf,
    until,
    openingCashMinor,
    commodity: book.functionalCurrency,
    runway: runway.map((p) => ({
      date: p.date,
      outflowMinor: p.outflowMinor,
      balanceAfterMinor: p.balanceAfterMinor,
      items: p.items.map((b) => ({ kind: b.kind ?? 'card', label: describeOutflow(b), amountMinor: b.amountMinor })),
    })),
    gaps,
  };
}

/** A human label for one projected outflow. Moved here so the CLI and the dashboard name things identically. */
export function describeOutflow(b: RunwayItem): string {
  if (b.kind === 'assumption') return `가정: ${b.label}`;
  if (b.kind === 'loan') return `${b.label ?? '대출'} (${b.seq}/${b.termMonths})`;
  if (b.kind === 'installment') return `${b.label ?? '할부'} (${b.seq}/${b.months})`;
  if (b.kind === 'income') return b.label;
  if (b.kind === 'recurring') {
    // Show the charge date when a card sits in between, since "why is this here"
    // is otherwise unanswerable: the money is leaving weeks after the charge.
    return b.viaCardAccountId ? `${b.label} (${b.occurredOn} 결제분)` : b.label;
  }
  return `${b.cardLabel ?? b.cardCode}  ${b.cycleFrom}..${b.cycleTo}`;
}
