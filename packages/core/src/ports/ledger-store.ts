import type { Account, AccountCode, AccountId, AccountType, IsoDate } from '../domain/account.js';
import type { CardCycleRule } from '../domain/billing.js';
import type { InstallmentPlan, InstallmentRow } from '../domain/installment.js';
import type { FxRate } from '../domain/fx.js';
import type { DedupeAuthority } from '../domain/ingest.js';
import type { Loan, LoanScheduleRow } from '../domain/loan.js';
import type { Commodity, CommodityCode } from '../domain/commodity.js';
import type {
  IncomeSettlement,
  IncomeSettlementLine,
  IncomeSettlementWithLines,
  IncomeSource,
} from '../domain/kr-income.js';
import type { RecurringExpense, RecurringIncome } from '../domain/recurring.js';
import type { TxnId, ValidatedTxn } from '../domain/txn.js';

/**
 * A card's billing rule, attached to its liability account.
 *
 * Lives on the store rather than in the journal because it is a prediction about
 * the future, not a record of the past. See the `card` table comment.
 */
export interface Card {
  readonly accountId: AccountId;
  /** The account cash leaves from on the payment date. */
  readonly fundingAccountId: AccountId;
  readonly rule: CardCycleRule;
  readonly label: string | null;
}

export type Grain = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type TxnStatus = 'draft' | 'posted' | 'void' | 'rejected';
export type PeriodStatus = 'open' | 'closed' | 'locked';
export type SnapshotKind = 'close' | 'checkpoint';

export interface Book {
  readonly schemaVersion: number;
  readonly functionalCurrency: CommodityCode;
  /**
   * Exactly ONE hard-close grain per book. Daily and weekly are checkpoints, not
   * closes: a day sits inside a month, and revaluing FX at both double-counts it.
   */
  readonly closeGrain: Grain;
  readonly timezone: string;
  readonly dedupeKeyVersion: number;
  readonly fxMaxStalenessDays: number;
}

export type StoreTier =
  /** May be the system of record. Must satisfy the contract below, or init() throws. */
  | 'engine'
  /** A one-way mirror. Never authoritative. */
  | 'projection';

export interface StoreCapabilities {
  readonly tier: StoreTier;
  /** MUST be true for 'engine'. Multi-row all-or-nothing writes. */
  readonly atomicMultiRowWrite: boolean;
  /** MUST be true for 'engine'. Enforced uniqueness for idem keys and dedupe keys. */
  readonly uniqueConstraints: boolean;
  /** MUST be true for 'engine'. Reads inside a unit of work see a stable snapshot. */
  readonly readAfterWriteConsistency: boolean;
  /** Optimization only. When false, getBalances folds over streamPostings(). */
  readonly serverSideAggregation: boolean;
  readonly predicatePushdown: boolean;
  /** Storage-level invariant enforcement (triggers/CHECKs). Defense in depth. */
  readonly enforcesInvariantsAtRest: boolean;
  readonly maxWriteOpsPerSecond: number | null;
}

export class TierContractError extends Error {
  constructor(storeName: string, missing: readonly string[]) {
    super(
      `${storeName} declares tier 'engine' but does not satisfy the engine contract: ` +
        `missing ${missing.join(', ')}. An engine-tier store is the system of record for a ` +
        `double-entry ledger; without these guarantees it cannot promise the books balance. ` +
        `Declare tier 'projection' instead.`,
    );
    this.name = 'TierContractError';
  }
}

/**
 * The mechanism that stops an adapter from lying about what it can do.
 *
 * Every engine-tier store must call this in init(). Notion and Airtable fail it —
 * they have no atomic multi-row write, no unique constraints, and no
 * read-after-write consistency. That is precisely why they are projections in
 * this design and not stores. See plan §2.
 */
export function assertEngineTier(storeName: string, caps: StoreCapabilities): void {
  if (caps.tier !== 'engine') return;
  const missing: string[] = [];
  if (!caps.atomicMultiRowWrite) missing.push('atomicMultiRowWrite');
  if (!caps.uniqueConstraints) missing.push('uniqueConstraints');
  if (!caps.readAfterWriteConsistency) missing.push('readAfterWriteConsistency');
  if (missing.length > 0) throw new TierContractError(storeName, missing);
}

export interface PostingRow {
  readonly txnId: TxnId;
  readonly txnDate: IsoDate;
  readonly txnStatus: TxnStatus;
  readonly seq: number;
  readonly accountId: AccountId;
  readonly accountCode: AccountCode;
  readonly unitsMinor: bigint;
  readonly commodity: CommodityCode;
  readonly weightMinor: bigint;
  readonly weightSource: string;
  readonly kind: string;
}

export interface BalanceRow {
  readonly accountId: AccountId;
  readonly accountCode: AccountCode;
  readonly commodity: CommodityCode;
  readonly unitsMinor: bigint;
  /** The KRW carrying value. Free — it is just SUM(weight_minor). */
  readonly weightMinor: bigint;
}

export interface PostingQuery {
  readonly from?: IsoDate;
  readonly to?: IsoDate;
  /** Subtree match against the materialized-path code. */
  readonly accountPrefix?: AccountCode;
  readonly accountIds?: readonly AccountId[];
  /** Defaults to ['posted'] — drafts are excluded from every balance and report. */
  readonly statuses?: readonly TxnStatus[];
}

export type BalanceQuery = PostingQuery & { readonly asOf?: IsoDate };

export interface AccountFilter {
  readonly type?: AccountType;
  readonly prefix?: AccountCode;
  readonly includeClosed?: boolean;
  readonly cash?: boolean;
}

export interface TxnQuery extends PostingQuery {
  readonly limit?: number;
  readonly offset?: number;
}

export interface TxnWithPostings {
  readonly txn: ValidatedTxn;
  readonly status: TxnStatus;
}

export interface Period {
  readonly id: string;
  readonly grain: Grain;
  readonly start: IsoDate;
  readonly end: IsoDate;
  readonly status: PeriodStatus;
}

export interface CommandResult {
  readonly idemKey: string;
  readonly requestSha256: string;
  readonly responseJson: string;
  readonly createdAt: string;
}

export interface VerifyReport {
  readonly ok: boolean;
  readonly checked: number;
  readonly problems: readonly VerifyProblem[];
}

export interface VerifyProblem {
  readonly kind:
    | 'unbalanced_txn'
    | 'commodity_conformance'
    | 'identity_weight'
    | 'snapshot_mismatch'
    /** An audit row does not hash to what the chain says it should. */
    | 'chain_broken'
    /** A transaction still balances but no longer matches the content hash the chain recorded. */
    | 'content_tampered';
  readonly subject: string;
  readonly detail: string;
}

export interface LedgerRead {
  getBook(): Promise<Book>;
  listCommodities(): Promise<readonly Commodity[]>;
  getAccount(idOrCode: string): Promise<Account | null>;
  listAccounts(filter?: AccountFilter): Promise<readonly Account[]>;
  getTxn(id: TxnId): Promise<TxnWithPostings | null>;
  listTxns(q: TxnQuery): Promise<readonly TxnWithPostings[]>;

  /**
   * The mandatory primitive. Everything else is derivable from it.
   * Ordered by (txn_date, txn_id, seq). MUST stream — never materialize.
   *
   * Pairing this with a capability-gated getBalances() is what lets a weak
   * backend be correct-but-slow rather than wrong, without dragging the port
   * down to a lowest common denominator.
   */
  streamPostings(q: PostingQuery): AsyncIterable<PostingRow>;

  /** Fast path. Base implementation folds over streamPostings(); SQLite overrides with GROUP BY. */
  getBalances(q: BalanceQuery): Promise<readonly BalanceRow[]>;

  listPeriods(filter?: { grain?: Grain; status?: PeriodStatus }): Promise<readonly Period[]>;
  findPeriodFor(date: IsoDate, grain: Grain): Promise<Period | null>;
  getCommandResult(idemKey: string): Promise<CommandResult | null>;

  listCards(): Promise<readonly Card[]>;
  getCard(accountId: AccountId): Promise<Card | null>;

  listInstallments(filter?: { activeOn?: IsoDate }): Promise<readonly InstallmentWithRows[]>;
  getInstallment(id: string): Promise<InstallmentWithRows | null>;

  listRecurring(filter?: { activeOn?: IsoDate }): Promise<readonly RecurringExpense[]>;
  listRecurringIncome(filter?: { activeOn?: IsoDate }): Promise<readonly RecurringIncome[]>;

  listIncomeSources(filter?: { activeOn?: IsoDate }): Promise<readonly IncomeSource[]>;
  getIncomeSource(idOrLabel: string): Promise<IncomeSource | null>;
  listIncomeSettlements(filter?: {
    sourceId?: string;
    from?: IsoDate;
    to?: IsoDate;
  }): Promise<readonly IncomeSettlementWithLines[]>;
  getIncomeSettlement(id: string): Promise<IncomeSettlementWithLines | null>;

  listLoans(): Promise<readonly LoanWithSchedule[]>;
  getLoan(accountId: AccountId): Promise<LoanWithSchedule | null>;

  listBalanceAssertions(filter?: { from?: IsoDate; to?: IsoDate }): Promise<readonly BalanceAssertion[]>;
  getSnapshot(periodId: string, kind: SnapshotKind): Promise<SnapshotWithBalances | null>;

  listFxRates(filter?: { base?: CommodityCode; quote?: CommodityCode; to?: IsoDate }): Promise<readonly FxRate[]>;

  findIngestBatchBySha(sha: string): Promise<IngestBatch | null>;
  /**
   * Every import that ever ran, newest first. This is the provenance record a
   * fresh session checks before importing: which source files are already in,
   * when, and how many rows — so the same export is never worked twice.
   */
  listIngestBatches(): Promise<readonly IngestBatch[]>;
  listRules(): Promise<readonly Rule[]>;
  findIngestItemsByDedupeKey(key: string): Promise<readonly IngestItem[]>;
  listIngestItems(filter?: { status?: IngestItemStatus }): Promise<readonly IngestItem[]>;
}

export interface BalanceAssertion {
  readonly id: string;
  readonly accountId: AccountId;
  readonly asOf: IsoDate;
  readonly commodity: CommodityCode;
  /** What the statement says. The one number in this system that comes from outside it. */
  readonly expectedMinor: bigint;
  readonly note: string | null;
  readonly createdAt: string;
}

export interface SnapshotBalance {
  readonly accountId: AccountId;
  readonly commodity: CommodityCode;
  readonly unitsMinor: bigint;
  readonly weightMinor: bigint;
  readonly periodUnitsMinor: bigint;
  readonly periodWeightMinor: bigint;
}

export interface SnapshotWithBalances {
  readonly id: string;
  readonly periodId: string;
  readonly kind: SnapshotKind;
  readonly asOf: IsoDate;
  readonly createdAt: string;
  readonly balances: readonly SnapshotBalance[];
}

export interface IngestBatch {
  readonly id: string;
  readonly sourceSha256: string;
  readonly sourceName: string | null;
  readonly submittedAt: string;
  readonly itemCount: number;
}

/**
 * A classification rule: payee pattern → category account code.
 *
 * Config, not journal — editing rules never touches a posted transaction; it
 * changes what the NEXT import decides. Matching is by `priority` DESC then
 * `createdAt` DESC, first hit wins. `category` is the account CODE (human-edited,
 * human-read); an unresolvable code is a no-match plus a warning, never a guess.
 */
export interface Rule {
  readonly id: string;
  readonly pattern: string;
  readonly match: 'contains' | 'regex';
  readonly category: string;
  readonly priority: number;
  readonly createdAt: string;
}

export type IngestItemStatus = 'pending' | 'accepted' | 'rejected';

export interface IngestItem {
  readonly id: string;
  readonly batchId: string;
  readonly dedupeKey: string;
  readonly dedupeAuthority: DedupeAuthority;
  readonly externalRef: string | null;
  readonly merchant: string | null;
  readonly txnId: TxnId | null;
  readonly status: IngestItemStatus;
  readonly reason: string | null;
  readonly parsedJson: string;
  readonly createdAt: string;
}

export interface LoanWithSchedule {
  readonly loan: Loan;
  readonly rows: readonly LoanScheduleRow[];
}

export interface InstallmentWithRows {
  readonly plan: InstallmentPlan;
  readonly rows: readonly InstallmentRow[];
}

export interface LedgerUow extends LedgerRead {
  upsertCommodity(c: Commodity): Promise<void>;
  upsertAccount(a: Account): Promise<Account>;

  /**
   * Atomically writes the transaction and all of its postings, or nothing.
   *
   * Takes a ValidatedTxn, so the store's ONLY invariant obligation is atomicity
   * and durability. It deliberately does not re-derive the balance — the type
   * already proves it, and re-checking in every adapter is how four adapters end
   * up with four subtly different definitions of "balanced".
   */
  appendTxn(tx: ValidatedTxn, opts: { status: 'draft' | 'posted' }): Promise<TxnId>;
  promoteDraft(id: TxnId): Promise<void>;
  rejectDraft(id: TxnId, reason: string): Promise<void>;
  voidTxn(id: TxnId, reason: string): Promise<void>;

  setPeriodStatus(id: string, s: PeriodStatus, meta: { reason?: string }): Promise<void>;
  upsertCard(c: Card): Promise<void>;
  /** Replaces the plan and its rows wholesale — a schedule is a forecast, not a journal. */
  upsertInstallment(plan: InstallmentPlan, rows: readonly InstallmentRow[]): Promise<void>;
  upsertRecurring(r: RecurringExpense): Promise<void>;
  upsertRecurringIncome(r: RecurringIncome): Promise<void>;
  upsertIncomeSource(s: IncomeSource): Promise<void>;
  /** Replaces the settlement and its lines wholesale. */
  upsertIncomeSettlement(
    settlement: IncomeSettlement,
    lines: readonly IncomeSettlementLine[],
  ): Promise<void>;
  /** Replaces the loan and its whole schedule — a forecast is allowed to change. */
  upsertLoan(loan: Loan, rows: readonly LoanScheduleRow[]): Promise<void>;

  putFxRates(rates: readonly FxRate[]): Promise<number>;
  putBalanceAssertion(a: BalanceAssertion): Promise<void>;
  upsertPeriod(p: Period): Promise<void>;
  writeSnapshot(s: SnapshotWithBalances): Promise<void>;
  recordIngestBatch(b: IngestBatch): Promise<void>;
  addRule(r: Rule): Promise<void>;
  removeRule(id: string): Promise<void>;
  recordIngestItem(i: IngestItem): Promise<void>;
  setIngestItemStatus(id: string, status: IngestItemStatus, meta: { reason?: string; txnId?: TxnId }): Promise<void>;
  recordCommandResult(r: CommandResult): Promise<void>;
  verify(opts?: { deep?: boolean }): Promise<VerifyReport>;
}

export interface LedgerStore {
  readonly name: string;
  readonly capabilities: StoreCapabilities;
  /** Throws TierContractError if the declared tier is not actually met. */
  init(): Promise<void>;
  migrate(): Promise<{ from: number; to: number }>;
  close(): Promise<void>;
  /** THE unit of work. At engine tier this is a real serializable transaction. */
  unitOfWork<T>(fn: (uow: LedgerUow) => Promise<T>, opts?: { idemKey?: string }): Promise<T>;
  read<T>(fn: (r: LedgerRead) => Promise<T>): Promise<T>;
}

/**
 * The generic getBalances: a fold over the mandatory stream.
 *
 * An adapter with serverSideAggregation=false is correct via this and simply
 * slower. An adapter with it true overrides. Either way the port never lies about
 * what it returns.
 */
export async function foldBalances(read: LedgerRead, q: BalanceQuery): Promise<readonly BalanceRow[]> {
  const acc = new Map<string, { row: BalanceRow; units: bigint; weight: bigint }>();
  const query: PostingQuery = q.asOf ? { ...q, to: q.asOf } : q;
  for await (const p of read.streamPostings(query)) {
    const key = `${p.accountId} ${p.commodity}`;
    const cur = acc.get(key);
    if (cur) {
      cur.units += p.unitsMinor;
      cur.weight += p.weightMinor;
    } else {
      acc.set(key, {
        row: {
          accountId: p.accountId,
          accountCode: p.accountCode,
          commodity: p.commodity,
          unitsMinor: 0n,
          weightMinor: 0n,
        },
        units: p.unitsMinor,
        weight: p.weightMinor,
      });
    }
  }
  return [...acc.values()]
    .map((v) => ({ ...v.row, unitsMinor: v.units, weightMinor: v.weight }))
    .sort((a, b) =>
      a.accountCode < b.accountCode
        ? -1
        : a.accountCode > b.accountCode
          ? 1
          : a.commodity < b.commodity
            ? -1
            : a.commodity > b.commodity
              ? 1
              : 0,
    );
}
