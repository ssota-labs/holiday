import {
  type Account,
  type AccountCode,
  type AccountFilter,
  type AccountId,
  type AccountType,
  type BalanceQuery,
  type BalanceRow,
  type Book,
  type Card,
  type Commodity,
  type CommodityCode,
  type CommandResult,
  type Grain,
  type InstallmentPlan,
  type InstallmentRow,
  type InstallmentWithRows,
  type Loan,
  type LoanScheduleRow,
  type LoanWithSchedule,
  type RecurringExpense,
  schedulePrincipal,
  assertCadence,
  assertCardCycleRule,
  isActiveOn,
  type IsoDate,
  type LedgerRead,
  type LedgerStore,
  type LedgerUow,
  type Period,
  type PeriodStatus,
  type PostingQuery,
  type PostingRow,
  type StoreCapabilities,
  Txn,
  type TxnId,
  type TxnQuery,
  type TxnStatus,
  type TxnWithPostings,
  type ValidatedTxn,
  type VerifyProblem,
  type VerifyReport,
  assertEngineTier,
} from '@holiday/core';

import { CHAIN_HASH_VERSION, chainHash, GENESIS_HASH, stableJson, txnContentHash } from './chain.js';
import { Db, type SqlValue, toBigInt, toBool, toInt } from './db.js';
import { runMigrations } from './migrate.js';
import { PRAGMAS, SCHEMA_VERSION } from './schema.js';

export interface SqliteStoreOptions {
  readonly path: string;
  readonly book: {
    readonly functionalCurrency: CommodityCode;
    readonly closeGrain?: Grain;
    readonly timezone?: string;
  };
  readonly now?: () => string;
}

const CAPS: StoreCapabilities = {
  tier: 'engine',
  atomicMultiRowWrite: true,
  uniqueConstraints: true,
  readAfterWriteConsistency: true,
  serverSideAggregation: true,
  predicatePushdown: true,
  enforcesInvariantsAtRest: true,
  maxWriteOpsPerSecond: null,
};

export class SqliteLedgerStore implements LedgerStore {
  readonly name = 'sqlite';
  readonly capabilities = CAPS;

  readonly #db: Db;
  readonly #opts: SqliteStoreOptions;
  readonly #now: () => string;

  constructor(opts: SqliteStoreOptions) {
    this.#opts = opts;
    this.#now = opts.now ?? (() => new Date().toISOString());
    this.#db = new Db(opts.path);
  }

  async init(): Promise<void> {
    // A store may not claim to be the system of record unless it actually is one.
    assertEngineTier(this.name, this.capabilities);
    this.#db.exec(PRAGMAS);
  }

  async migrate(): Promise<{ from: number; to: number }> {
    // Hash-checked and append-only: editing an applied migration throws rather
    // than letting this ledger diverge from every other copy. See migrate.ts.
    const result = runMigrations(this.#db, this.#now);
    this.#seedBook();
    return { from: result.alreadyApplied, to: result.alreadyApplied + result.applied.length };
  }

  #seedBook(): void {
    const existing = this.#db.get<{ functional_currency: string }>('SELECT functional_currency FROM book WHERE id = ?', 'book');
    if (existing) {
      if (existing.functional_currency !== this.#opts.book.functionalCurrency) {
        // Re-basing a book is a rebuild into a NEW book, never an in-place edit —
        // historical weights encode the old functional currency as a fact.
        throw new Error(
          `this ledger is denominated in ${existing.functional_currency}, but was opened as ` +
            `${this.#opts.book.functionalCurrency}. A book's functional currency cannot be changed in place.`,
        );
      }
      return;
    }
    this.#db.transaction(() => {
      // The functional currency must exist before the book can reference it.
      this.#db.run(
        `INSERT OR IGNORE INTO commodity (code, exponent, kind, name) VALUES (?, ?, ?, ?)`,
        this.#opts.book.functionalCurrency,
        0,
        'fiat',
        this.#opts.book.functionalCurrency,
      );
      this.#db.run(
        `INSERT INTO book (id, schema_version, functional_currency, close_grain, timezone, created_at)
         VALUES ('book', ?, ?, ?, ?, ?)`,
        SCHEMA_VERSION,
        this.#opts.book.functionalCurrency,
        this.#opts.book.closeGrain ?? 'month',
        this.#opts.book.timezone ?? 'Asia/Seoul',
        this.#now(),
      );
    });
  }

  async unitOfWork<T>(fn: (uow: LedgerUow) => Promise<T>): Promise<T> {
    // node:sqlite is synchronous, so the callback must not await anything that
    // could interleave another write. In practice every uow method resolves
    // immediately; the async signature exists for adapters that need it.
    const uow = new SqliteUow(this.#db, this.#now);
    this.#db.exec('BEGIN IMMEDIATE');
    let out: T;
    try {
      out = await fn(uow);
    } catch (e) {
      try {
        this.#db.exec('ROLLBACK');
      } catch {
        /* never mask the original error */
      }
      throw e;
    }
    this.#db.exec('COMMIT');
    return out;
  }

  async read<T>(fn: (r: LedgerRead) => Promise<T>): Promise<T> {
    return fn(new SqliteUow(this.#db, this.#now));
  }

  /**
   * The head of the audit chain.
   *
   * Not part of the LedgerStore port: a chain is one way to get tamper evidence,
   * not something every engine must offer. Anchor this value outside the file —
   * print it, commit it, mail it to yourself — and the chain stops being merely
   * self-consistent and starts being evidence.
   */
  async chainHead(): Promise<{ seq: number; hash: string } | null> {
    return chainHeadOf(this.#db);
  }

  /**
   * Fold the WAL back into the main file.
   *
   * Matters because ledger.db is meant to be committed: without a checkpoint the
   * committed file can be missing the most recent transactions, which are still
   * sitting in the -wal that git is (correctly) ignoring. A backup that silently
   * omits last week is worse than no backup.
   */
  async checkpoint(): Promise<void> {
    this.#db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  }

  async close(): Promise<void> {
    this.#db.close();
  }
}

interface TxnRow {
  id: string;
  date: string;
  booking_commodity: string;
  payee: string | null;
  narration: string;
  status: string;
  system_kind: string | null;
  corrects_txn_id: string | null;
  source_item_id: string | null;
  fx_estimated: bigint;
  tags_json: string;
  meta_json: string;
}

interface PostingRowRaw {
  txn_id: string;
  seq: bigint;
  account_id: string;
  account_code: string;
  units_minor: bigint;
  commodity: string;
  weight_minor: bigint;
  weight_source: string;
  fx_rate_text: string | null;
  fx_rate_id: string | null;
  lot_id: string | null;
  kind: string;
  memo: string | null;
  txn_date: string;
  txn_status: string;
}

class SqliteUow implements LedgerUow {
  constructor(
    private readonly db: Db,
    private readonly now: () => string,
  ) {}

  async getBook(): Promise<Book> {
    const r = this.db.get<{
      schema_version: bigint;
      functional_currency: string;
      close_grain: string;
      timezone: string;
      dedupe_key_version: bigint;
      fx_max_staleness_days: bigint;
    }>('SELECT * FROM book WHERE id = ?', 'book');
    if (!r) throw new Error('holiday: this ledger has no book — run `holiday init` first');
    return {
      schemaVersion: toInt(r.schema_version),
      functionalCurrency: r.functional_currency as CommodityCode,
      closeGrain: r.close_grain as Grain,
      timezone: r.timezone,
      dedupeKeyVersion: toInt(r.dedupe_key_version),
      fxMaxStalenessDays: toInt(r.fx_max_staleness_days),
    };
  }

  async listCommodities(): Promise<readonly Commodity[]> {
    return this.db
      .all<{ code: string; exponent: bigint; kind: string; name: string }>(
        'SELECT * FROM commodity ORDER BY code',
      )
      .map((r) => ({
        code: r.code as CommodityCode,
        exponent: toInt(r.exponent),
        kind: r.kind as Commodity['kind'],
        name: r.name,
      }));
  }

  async upsertCommodity(c: Commodity): Promise<void> {
    this.db.run(
      `INSERT INTO commodity (code, exponent, kind, name) VALUES (?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET exponent = excluded.exponent, kind = excluded.kind, name = excluded.name`,
      c.code,
      c.exponent,
      c.kind,
      c.name,
    );
  }

  async getAccount(idOrCode: string): Promise<Account | null> {
    const r = this.db.get<AccountRowRaw>('SELECT * FROM account WHERE id = ? OR code = ?', idOrCode, idOrCode);
    return r ? mapAccount(r) : null;
  }

  async listAccounts(filter?: AccountFilter): Promise<readonly Account[]> {
    const where: string[] = [];
    const params: SqlValue[] = [];
    if (filter?.type) {
      where.push('type = ?');
      params.push(filter.type);
    }
    if (filter?.prefix) {
      where.push('(code = ? OR code GLOB ?)');
      params.push(filter.prefix, `${filter.prefix}:*`);
    }
    if (filter?.cash !== undefined) {
      where.push('cash = ?');
      params.push(filter.cash ? 1 : 0);
    }
    if (!filter?.includeClosed) where.push('closed_on IS NULL');
    const sql = `SELECT * FROM account ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY code`;
    return this.db.all<AccountRowRaw>(sql, ...params).map(mapAccount);
  }

  async upsertAccount(a: Account): Promise<Account> {
    this.db.run(
      `INSERT INTO account (id, code, type, parent_id, commodity, monetary, cash, placeholder, opened_on, closed_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         code = excluded.code, type = excluded.type, parent_id = excluded.parent_id,
         commodity = excluded.commodity, monetary = excluded.monetary,
         cash = excluded.cash, placeholder = excluded.placeholder, closed_on = excluded.closed_on`,
      a.id,
      a.code,
      a.type,
      a.parentId,
      a.commodity,
      a.monetary ? 1 : 0,
      a.cash ? 1 : 0,
      a.placeholder ? 1 : 0,
      a.openedOn,
      a.closedOn,
    );
    return a;
  }

  /**
   * txn → postings → seal.
   *
   * The seal is where the balance rule is enforced, because SQLite has no
   * deferred constraints and the running sum is legitimately non-zero while the
   * postings are still going in. Nothing unsealed is ever readable as a fact.
   */
  async appendTxn(tx: ValidatedTxn, opts: { status: 'draft' | 'posted' }): Promise<TxnId> {
    this.db.run(
      `INSERT INTO txn (id, date, booking_commodity, payee, narration, status, system_kind,
                        corrects_txn_id, source_item_id, fx_estimated, tags_json, meta_json, sealed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      tx.id,
      tx.date,
      tx.bookingCommodity,
      tx.payee,
      tx.narration,
      opts.status,
      tx.systemKind,
      tx.correctsTxnId,
      tx.sourceItemId,
      tx.fxEstimated ? 1 : 0,
      JSON.stringify(tx.tags),
      JSON.stringify(tx.meta),
      this.now(),
    );

    for (const p of tx.postings) {
      this.db.run(
        `INSERT INTO posting (txn_id, seq, account_id, units_minor, commodity, weight_minor,
                              weight_source, fx_rate_text, fx_rate_id, lot_id, kind, memo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        tx.id,
        p.seq,
        p.accountId,
        p.units.minor,
        p.units.commodity,
        p.weightMinor,
        p.weightSource,
        p.fxRateText,
        p.fxRateId,
        p.lotId,
        p.kind,
        p.memo,
      );
    }

    // Fires txn_seal_requires_balance. A forged unbalanced txn dies here even
    // though the type system was told it was fine.
    this.db.run('UPDATE txn SET sealed = 1 WHERE id = ?', tx.id);

    // The audit row commits to the transaction's CONTENT, not just its id. That
    // is what makes a later hand-edit of a posting detectable: the row would
    // still balance, but it would no longer hash to what the chain recorded.
    this.#appendAudit('txn_append', tx.id, {
      status: opts.status,
      contentSha256: txnContentHash(tx),
      hashVersion: CHAIN_HASH_VERSION,
    });
    return tx.id;
  }

  /** Every mutation lands here. An audit trail with holes is not an audit trail. */
  #appendAudit(event: string, subject: string, detail: Record<string, unknown>): void {
    const head = this.db.get<{ seq: bigint; hash: string }>(
      'SELECT seq, hash FROM audit_log ORDER BY seq DESC LIMIT 1',
    );
    const seq = head ? toInt(head.seq) + 1 : 1;
    const prevHash = head?.hash ?? GENESIS_HASH;
    const at = this.now();
    const detailJson = stableJson(detail);
    const hash = chainHash({ seq, at, event, subject, detail: detailJson, prevHash });
    this.db.run(
      'INSERT INTO audit_log (seq, at, event, subject, detail, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
      seq,
      at,
      event,
      subject,
      detailJson,
      prevHash,
      hash,
    );
  }


  async promoteDraft(id: TxnId): Promise<void> {
    const changed = this.#setStatus(id, 'posted', 'draft', null);
    if (!changed) throw new Error(`holiday: ${id} is not a draft, so it cannot be accepted`);
  }

  async rejectDraft(id: TxnId, reason: string): Promise<void> {
    // Rows are retained, not deleted: a rejected item is dedup memory. Deleting it
    // would let the same screenshot be re-proposed forever.
    const changed = this.#setStatus(id, 'rejected', 'draft', reason);
    if (!changed) throw new Error(`holiday: ${id} is not a draft, so it cannot be rejected`);
  }

  async voidTxn(id: TxnId, reason: string): Promise<void> {
    const changed = this.#setStatus(id, 'void', 'posted', reason);
    if (!changed) throw new Error(`holiday: ${id} is not posted, so it cannot be voided`);
  }

  #setStatus(id: TxnId, to: TxnStatus, from: TxnStatus, reason: string | null): boolean {
    const before = this.db.get<{ n: bigint }>('SELECT COUNT(*) AS n FROM txn WHERE id = ? AND status = ?', id, from);
    if (!before || toInt(before.n) === 0) return false;
    this.db.run('UPDATE txn SET status = ?, reason = ? WHERE id = ?', to, reason, id);
    this.#appendAudit('txn_status', id, { from, to, reason });
    return true;
  }

  async getTxn(id: TxnId): Promise<TxnWithPostings | null> {
    const t = this.db.get<TxnRow>('SELECT * FROM txn WHERE id = ? AND sealed = 1', id);
    if (!t) return null;
    const rows = this.db.all<PostingRowRaw>(
      `SELECT p.*, a.code AS account_code, t.date AS txn_date, t.status AS txn_status
       FROM posting p JOIN account a ON a.id = p.account_id JOIN txn t ON t.id = p.txn_id
       WHERE p.txn_id = ? ORDER BY p.seq`,
      id,
    );
    return { txn: mapTxn(t, rows), status: t.status as TxnStatus };
  }

  async listTxns(q: TxnQuery): Promise<readonly TxnWithPostings[]> {
    const { where, params } = buildWhere(q, 't');
    const limit = q.limit ? ` LIMIT ${toInt(q.limit)}` : '';
    const offset = q.offset ? ` OFFSET ${toInt(q.offset)}` : '';
    const ts = this.db.all<TxnRow>(
      `SELECT DISTINCT t.* FROM txn t WHERE ${where} ORDER BY t.date, t.id${limit}${offset}`,
      ...params,
    );
    const out: TxnWithPostings[] = [];
    for (const t of ts) {
      const got = await this.getTxn(t.id as TxnId);
      if (got) out.push(got);
    }
    return out;
  }

  async *streamPostings(q: PostingQuery): AsyncIterable<PostingRow> {
    const { where, params } = buildWhere(q, 't');
    const accountWhere = q.accountPrefix ? ' AND (a.code = ? OR a.code GLOB ?)' : '';
    const accountParams: SqlValue[] = q.accountPrefix ? [q.accountPrefix, `${q.accountPrefix}:*`] : [];
    const idWhere = q.accountIds?.length ? ` AND p.account_id IN (${q.accountIds.map(() => '?').join(',')})` : '';
    const idParams: SqlValue[] = q.accountIds ? [...q.accountIds] : [];

    const rows = this.db.all<PostingRowRaw>(
      `SELECT p.*, a.code AS account_code, t.date AS txn_date, t.status AS txn_status
       FROM posting p JOIN txn t ON t.id = p.txn_id JOIN account a ON a.id = p.account_id
       WHERE ${where}${accountWhere}${idWhere}
       ORDER BY t.date, t.id, p.seq`,
      ...params,
      ...accountParams,
      ...idParams,
    );
    for (const r of rows) {
      yield {
        txnId: r.txn_id as TxnId,
        txnDate: r.txn_date as IsoDate,
        txnStatus: r.txn_status as TxnStatus,
        seq: toInt(r.seq),
        accountId: r.account_id as AccountId,
        accountCode: r.account_code as AccountCode,
        unitsMinor: toBigInt(r.units_minor),
        commodity: r.commodity as CommodityCode,
        weightMinor: toBigInt(r.weight_minor),
        weightSource: r.weight_source,
        kind: r.kind,
      };
    }
  }

  /** The fast path. Must agree with foldBalances() over streamPostings(). */
  async getBalances(q: BalanceQuery): Promise<readonly BalanceRow[]> {
    const effective: PostingQuery = q.asOf ? { ...q, to: q.asOf } : q;
    const { where, params } = buildWhere(effective, 't');
    const accountWhere = q.accountPrefix ? ' AND (a.code = ? OR a.code GLOB ?)' : '';
    const accountParams: SqlValue[] = q.accountPrefix ? [q.accountPrefix, `${q.accountPrefix}:*`] : [];
    const idWhere = q.accountIds?.length ? ` AND p.account_id IN (${q.accountIds.map(() => '?').join(',')})` : '';
    const idParams: SqlValue[] = q.accountIds ? [...q.accountIds] : [];

    return this.db
      .all<{ account_id: string; account_code: string; commodity: string; units: bigint; weight: bigint }>(
        `SELECT p.account_id, a.code AS account_code, p.commodity,
                SUM(p.units_minor) AS units, SUM(p.weight_minor) AS weight
         FROM posting p JOIN txn t ON t.id = p.txn_id JOIN account a ON a.id = p.account_id
         WHERE ${where}${accountWhere}${idWhere}
         GROUP BY p.account_id, a.code, p.commodity
         ORDER BY a.code, p.commodity`,
        ...params,
        ...accountParams,
        ...idParams,
      )
      .map((r) => ({
        accountId: r.account_id as AccountId,
        accountCode: r.account_code as AccountCode,
        commodity: r.commodity as CommodityCode,
        unitsMinor: toBigInt(r.units),
        weightMinor: toBigInt(r.weight),
      }));
  }

  async listPeriods(filter?: { grain?: Grain; status?: PeriodStatus }): Promise<readonly Period[]> {
    const where: string[] = [];
    const params: SqlValue[] = [];
    if (filter?.grain) {
      where.push('grain = ?');
      params.push(filter.grain);
    }
    if (filter?.status) {
      where.push('status = ?');
      params.push(filter.status);
    }
    return this.db
      .all<{ id: string; grain: string; start: string; end: string; status: string }>(
        `SELECT * FROM period ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY start`,
        ...params,
      )
      .map((r) => ({
        id: r.id,
        grain: r.grain as Grain,
        start: r.start as IsoDate,
        end: r.end as IsoDate,
        status: r.status as PeriodStatus,
      }));
  }

  async findPeriodFor(date: IsoDate, grain: Grain): Promise<Period | null> {
    const r = this.db.get<{ id: string; grain: string; start: string; end: string; status: string }>(
      'SELECT * FROM period WHERE grain = ? AND start <= ? AND end >= ?',
      grain,
      date,
      date,
    );
    return r
      ? {
          id: r.id,
          grain: r.grain as Grain,
          start: r.start as IsoDate,
          end: r.end as IsoDate,
          status: r.status as PeriodStatus,
        }
      : null;
  }

  async setPeriodStatus(id: string, s: PeriodStatus, meta: { reason?: string }): Promise<void> {
    this.db.run('UPDATE period SET status = ? WHERE id = ?', s, id);
    // Reopening a closed period is never silent and never automatic.
    this.#appendAudit('period_status', id, { status: s, reason: meta.reason ?? null });
  }

  async listCards(): Promise<readonly Card[]> {
    return this.db.all<CardRowRaw>('SELECT * FROM card ORDER BY account_id').map(mapCard);
  }

  async getCard(accountId: AccountId): Promise<Card | null> {
    const r = this.db.get<CardRowRaw>('SELECT * FROM card WHERE account_id = ?', accountId);
    return r ? mapCard(r) : null;
  }

  async upsertCard(c: Card): Promise<void> {
    assertCardCycleRule(c.rule);
    const acct = await this.getAccount(c.accountId);
    if (!acct) throw new Error(`holiday: no such account: ${c.accountId}`);
    if (acct.type !== 'liability') {
      // A billing cycle on an expense account is meaningless and would silently
      // produce a nonsense projection.
      throw new Error(`holiday: ${acct.code} is a ${acct.type} account — a card must be a liability`);
    }
    const funding = await this.getAccount(c.fundingAccountId);
    if (!funding) throw new Error(`holiday: no such funding account: ${c.fundingAccountId}`);
    if (funding.type !== 'asset') {
      throw new Error(`holiday: ${funding.code} is a ${funding.type} account — a card is paid from an asset`);
    }
    this.db.run(
      `INSERT INTO card (account_id, funding_account_id, cycle_close_day, payment_month_offset, payment_day, label)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id) DO UPDATE SET
         funding_account_id = excluded.funding_account_id,
         cycle_close_day = excluded.cycle_close_day,
         payment_month_offset = excluded.payment_month_offset,
         payment_day = excluded.payment_day,
         label = excluded.label`,
      c.accountId,
      c.fundingAccountId,
      c.rule.cycleCloseDay,
      c.rule.paymentMonthOffset,
      c.rule.paymentDay,
      c.label,
    );
    this.#appendAudit('card_upsert', c.accountId, { rule: c.rule, fundingAccountId: c.fundingAccountId });
  }

  async listInstallments(filter?: { activeOn?: IsoDate }): Promise<readonly InstallmentWithRows[]> {
    const plans = this.db.all<InstallmentRowRaw>('SELECT * FROM installment ORDER BY purchased_on, id');
    const out: InstallmentWithRows[] = [];
    for (const p of plans) {
      const rows = this.#rowsOf(p.id);
      // "Active" = still has money left to move. A finished plan is history.
      if (filter?.activeOn && !rows.some((r) => r.paymentDate > filter.activeOn!)) continue;
      out.push({ plan: mapInstallment(p), rows });
    }
    return out;
  }

  async getInstallment(id: string): Promise<InstallmentWithRows | null> {
    const p = this.db.get<InstallmentRowRaw>('SELECT * FROM installment WHERE id = ?', id);
    return p ? { plan: mapInstallment(p), rows: this.#rowsOf(id) } : null;
  }

  #rowsOf(installmentId: string): InstallmentRow[] {
    return this.db
      .all<{ seq: bigint; payment_date: string; principal_minor: bigint; fee_minor: bigint }>(
        'SELECT * FROM installment_row WHERE installment_id = ? ORDER BY seq',
        installmentId,
      )
      .map((r) => ({
        seq: toInt(r.seq),
        paymentDate: r.payment_date as IsoDate,
        principalMinor: toBigInt(r.principal_minor),
        feeMinor: toBigInt(r.fee_minor),
      }));
  }

  async upsertInstallment(plan: InstallmentPlan, rows: readonly InstallmentRow[]): Promise<void> {
    if (plan.cardAccountId === plan.liabilityAccountId) {
      throw new Error(
        `holiday: an installment's liability account must differ from the card account, or ordinary ` +
          `billing will count the whole purchase on the first bill`,
      );
    }
    // Principal only. 할부수수료 is interest expense, not part of what you bought:
    // the purchase posts ₩1,200,000 of debt, and the fees accrue on top as they
    // are charged. Summing them in here would demand a schedule that overstates
    // the purchase by its own interest.
    const principal = rows.reduce((s, r) => s + r.principalMinor, 0n);
    if (principal !== plan.totalMinor) {
      // A schedule that does not sum to the purchase never reconciles against a
      // real statement. Same reason there is no tolerance anywhere else here.
      throw new Error(
        `holiday: schedule principal sums to ${principal} but the purchase was ${plan.totalMinor}`,
      );
    }
    if (rows.some((r) => r.feeMinor < 0n)) {
      throw new Error('holiday: a 할부수수료 cannot be negative');
    }
    if (plan.interestFree && rows.some((r) => r.feeMinor !== 0n)) {
      throw new Error('holiday: plan is marked interest-free but has non-zero fees');
    }
    if (rows.length !== plan.months) {
      throw new Error(`holiday: plan says ${plan.months} months but got ${rows.length} rows`);
    }

    this.db.run(
      `INSERT INTO installment (id, card_account_id, liability_account_id, txn_id, purchased_on,
                                months, total_minor, commodity, interest_free, label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         card_account_id = excluded.card_account_id,
         liability_account_id = excluded.liability_account_id,
         txn_id = excluded.txn_id, purchased_on = excluded.purchased_on,
         months = excluded.months, total_minor = excluded.total_minor,
         commodity = excluded.commodity, interest_free = excluded.interest_free,
         label = excluded.label`,
      plan.id,
      plan.cardAccountId,
      plan.liabilityAccountId,
      plan.txnId,
      plan.purchasedOn,
      plan.months,
      plan.totalMinor,
      plan.commodity,
      plan.interestFree ? 1 : 0,
      plan.label,
    );
    // Wholesale replace: the schedule is a forecast, and a forecast is allowed to
    // change. Only the journal is append-only.
    this.db.run('DELETE FROM installment_row WHERE installment_id = ?', plan.id);
    for (const r of rows) {
      this.db.run(
        'INSERT INTO installment_row (installment_id, seq, payment_date, principal_minor, fee_minor) VALUES (?, ?, ?, ?, ?)',
        plan.id,
        r.seq,
        r.paymentDate,
        r.principalMinor,
        r.feeMinor,
      );
    }
    this.#appendAudit('installment_upsert', plan.id, {
      months: plan.months,
      totalMinor: plan.totalMinor.toString(),
      cardAccountId: plan.cardAccountId,
    });
  }

  async listRecurring(filter?: { activeOn?: IsoDate }): Promise<readonly RecurringExpense[]> {
    const rows = this.db.all<RecurringRowRaw>('SELECT * FROM recurring ORDER BY label, id').map(mapRecurring);
    if (!filter?.activeOn) return rows;
    return rows.filter((r) => isActiveOn(r, filter.activeOn!));
  }

  async upsertRecurring(r: RecurringExpense): Promise<void> {
    assertCadence(r.cadence);
    const expense = await this.getAccount(r.expenseAccountId);
    if (!expense) throw new Error(`holiday: no such account: ${r.expenseAccountId}`);
    const funding = await this.getAccount(r.fundingAccountId);
    if (!funding) throw new Error(`holiday: no such account: ${r.fundingAccountId}`);
    if (funding.type !== 'asset' && funding.type !== 'liability') {
      // Cash comes out of a bank account or goes onto a card. Anything else means
      // the projection would not know when the money actually moves.
      throw new Error(
        `holiday: ${funding.code} is a ${funding.type} account — a recurring expense is funded from ` +
          `an asset (direct debit) or a liability (card)`,
      );
    }
    this.db.run(
      `INSERT INTO recurring (id, label, expense_account_id, funding_account_id, amount_minor, commodity,
                              cadence_kind, day_of_month, month, active_from, active_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         label = excluded.label, expense_account_id = excluded.expense_account_id,
         funding_account_id = excluded.funding_account_id, amount_minor = excluded.amount_minor,
         commodity = excluded.commodity, cadence_kind = excluded.cadence_kind,
         day_of_month = excluded.day_of_month, month = excluded.month,
         active_from = excluded.active_from, active_to = excluded.active_to`,
      r.id,
      r.label,
      r.expenseAccountId,
      r.fundingAccountId,
      r.amountMinor,
      r.commodity,
      r.cadence.kind,
      r.cadence.dayOfMonth,
      r.cadence.kind === 'yearly' ? r.cadence.month : null,
      r.activeFrom,
      r.activeTo,
    );
    this.#appendAudit('recurring_upsert', r.id, {
      label: r.label,
      amountMinor: r.amountMinor.toString(),
      cadence: r.cadence,
    });
  }

  async listLoans(): Promise<readonly LoanWithSchedule[]> {
    return this.db
      .all<LoanRowRaw>('SELECT * FROM loan ORDER BY account_id')
      .map((l) => ({ loan: mapLoan(l), rows: this.#loanRows(l.account_id) }));
  }

  async getLoan(accountId: AccountId): Promise<LoanWithSchedule | null> {
    const l = this.db.get<LoanRowRaw>('SELECT * FROM loan WHERE account_id = ?', accountId);
    return l ? { loan: mapLoan(l), rows: this.#loanRows(accountId) } : null;
  }

  #loanRows(loanId: string): LoanScheduleRow[] {
    return this.db
      .all<{
        seq: bigint;
        due_date: string;
        opening_minor: bigint;
        principal_minor: bigint;
        interest_minor: bigint;
        closing_minor: bigint;
      }>('SELECT * FROM loan_schedule_row WHERE loan_id = ? ORDER BY seq', loanId)
      .map((r) => ({
        seq: toInt(r.seq),
        dueDate: r.due_date as IsoDate,
        openingMinor: toBigInt(r.opening_minor),
        principalMinor: toBigInt(r.principal_minor),
        interestMinor: toBigInt(r.interest_minor),
        closingMinor: toBigInt(r.closing_minor),
      }));
  }

  async upsertLoan(loan: Loan, rows: readonly LoanScheduleRow[]): Promise<void> {
    const acct = await this.getAccount(loan.accountId);
    if (!acct) throw new Error(`holiday: no such account: ${loan.accountId}`);
    if (acct.type !== 'liability') {
      throw new Error(`holiday: ${acct.code} is a ${acct.type} account — a loan must be a liability`);
    }
    const funding = await this.getAccount(loan.fundingAccountId);
    if (!funding || funding.type !== 'asset') {
      throw new Error(`holiday: a loan is paid from an asset account`);
    }
    const interest = await this.getAccount(loan.interestAccountId);
    if (!interest || interest.type !== 'expense') {
      throw new Error(`holiday: loan interest must be booked to an expense account`);
    }
    // 'interest_only' never amortizes, so its rows legitimately sum to zero.
    // Every other method must repay exactly the loan, or it never reconciles.
    if (loan.method !== 'interest_only') {
      const principal = schedulePrincipal(rows);
      if (principal !== loan.principalMinor) {
        throw new Error(`holiday: schedule repays ${principal} but the loan is ${loan.principalMinor}`);
      }
    }
    if (rows.length !== loan.termMonths) {
      throw new Error(`holiday: loan says ${loan.termMonths} months but got ${rows.length} rows`);
    }

    this.db.run(
      `INSERT INTO loan (account_id, funding_account_id, interest_account_id, principal_minor, commodity,
                         annual_rate_text, method, term_months, first_payment_date, payment_day, label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id) DO UPDATE SET
         funding_account_id = excluded.funding_account_id,
         interest_account_id = excluded.interest_account_id,
         principal_minor = excluded.principal_minor, commodity = excluded.commodity,
         annual_rate_text = excluded.annual_rate_text, method = excluded.method,
         term_months = excluded.term_months, first_payment_date = excluded.first_payment_date,
         payment_day = excluded.payment_day, label = excluded.label`,
      loan.accountId,
      loan.fundingAccountId,
      loan.interestAccountId,
      loan.principalMinor,
      loan.commodity,
      loan.annualRateText,
      loan.method,
      loan.termMonths,
      loan.firstPaymentDate,
      loan.paymentDay,
      loan.label,
    );
    // Wholesale replace: the schedule is a forecast, and forecasts change when the
    // rate resets or you prepay. Only the journal is append-only.
    this.db.run('DELETE FROM loan_schedule_row WHERE loan_id = ?', loan.accountId);
    for (const r of rows) {
      this.db.run(
        `INSERT INTO loan_schedule_row (loan_id, seq, due_date, opening_minor, principal_minor, interest_minor, closing_minor)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        loan.accountId,
        r.seq,
        r.dueDate,
        r.openingMinor,
        r.principalMinor,
        r.interestMinor,
        r.closingMinor,
      );
    }
    this.#appendAudit('loan_upsert', loan.accountId, {
      method: loan.method,
      principalMinor: loan.principalMinor.toString(),
      annualRateText: loan.annualRateText,
      termMonths: loan.termMonths,
    });
  }

  async getCommandResult(idemKey: string): Promise<CommandResult | null> {
    const r = this.db.get<{ idem_key: string; request_sha256: string; response_json: string; created_at: string }>(
      'SELECT * FROM command_log WHERE idem_key = ?',
      idemKey,
    );
    return r
      ? {
          idemKey: r.idem_key,
          requestSha256: r.request_sha256,
          responseJson: r.response_json,
          createdAt: r.created_at,
        }
      : null;
  }

  async recordCommandResult(r: CommandResult): Promise<void> {
    const existing = await this.getCommandResult(r.idemKey);
    if (existing) {
      if (existing.requestSha256 !== r.requestSha256) {
        // Same key, different request. Silently returning the old response would
        // be worse than failing: the caller would believe work happened that did not.
        throw new Error(
          `holiday: idempotency key ${r.idemKey} was already used for a different request. ` +
            `Keys must be unique per distinct operation.`,
        );
      }
      return;
    }
    this.db.run(
      'INSERT INTO command_log (idem_key, request_sha256, response_json, created_at) VALUES (?, ?, ?, ?)',
      r.idemKey,
      r.requestSha256,
      r.responseJson,
      r.createdAt,
    );
  }

  /** Ring 4. Cheap here because it is just SQL — over a Notion-shaped store it would be an hour. */
  async verify(): Promise<VerifyReport> {
    const problems: VerifyProblem[] = [];

    for (const r of this.db.all<{ txn_id: string; residual: bigint }>(
      'SELECT txn_id, SUM(weight_minor) AS residual FROM posting GROUP BY txn_id HAVING SUM(weight_minor) <> 0',
    )) {
      problems.push({
        kind: 'unbalanced_txn',
        subject: r.txn_id,
        detail: `postings sum to ${r.residual}, expected 0`,
      });
    }

    for (const r of this.db.all<{ txn_id: string; seq: bigint; units_minor: bigint; weight_minor: bigint }>(
      `SELECT p.txn_id, p.seq, p.units_minor, p.weight_minor
       FROM posting p JOIN txn t ON t.id = p.txn_id
       WHERE p.commodity = t.booking_commodity AND p.weight_minor <> p.units_minor`,
    )) {
      problems.push({
        kind: 'identity_weight',
        subject: `${r.txn_id}#${r.seq}`,
        detail: `booking-commodity posting has weight ${r.weight_minor} but units ${r.units_minor}`,
      });
    }

    for (const r of this.db.all<{ txn_id: string; seq: bigint; commodity: string; declared: string }>(
      `SELECT p.txn_id, p.seq, p.commodity, a.commodity AS declared
       FROM posting p JOIN account a ON a.id = p.account_id
       WHERE a.commodity IS NOT NULL AND a.commodity <> p.commodity`,
    )) {
      problems.push({
        kind: 'commodity_conformance',
        subject: `${r.txn_id}#${r.seq}`,
        detail: `posting is ${r.commodity} but the account is declared ${r.declared}`,
      });
    }

    for (const r of this.db.all<{ id: string }>('SELECT id FROM txn WHERE sealed = 0')) {
      problems.push({
        kind: 'unbalanced_txn',
        subject: r.id,
        detail: 'transaction was never sealed — it was written but its balance was never asserted',
      });
    }

    problems.push(...this.#verifyChain());

    const counted = this.db.get<{ n: bigint }>('SELECT COUNT(*) AS n FROM txn');
    return { ok: problems.length === 0, checked: counted ? toInt(counted.n) : 0, problems };
  }

  /**
   * Walk the audit chain and recompute it.
   *
   * Two distinct failures live here. A broken link means an audit row itself was
   * altered. A content mismatch means the LEDGER was altered — the transaction
   * still balances (so every other check passes) but it no longer hashes to what
   * the chain recorded when it was written. That second one is the whole reason
   * the chain commits to content rather than to ids.
   */
  #verifyChain(): VerifyProblem[] {
    const problems: VerifyProblem[] = [];
    const rows = this.db.all<{
      seq: bigint;
      at: string;
      event: string;
      subject: string;
      detail: string;
      prev_hash: string;
      hash: string;
    }>('SELECT * FROM audit_log ORDER BY seq');

    let expectedPrev = GENESIS_HASH;
    for (const r of rows) {
      const seq = toInt(r.seq);
      if (r.prev_hash !== expectedPrev) {
        problems.push({
          kind: 'chain_broken',
          subject: `audit#${seq}`,
          detail: `prev_hash is ${r.prev_hash} but the preceding row hashes to ${expectedPrev}`,
        });
      }
      const recomputed = chainHash({
        seq,
        at: r.at,
        event: r.event,
        subject: r.subject,
        detail: r.detail,
        prevHash: r.prev_hash,
      });
      if (recomputed !== r.hash) {
        problems.push({
          kind: 'chain_broken',
          subject: `audit#${seq}`,
          detail: `row does not hash to its recorded value — it was altered after it was written`,
        });
      }
      expectedPrev = r.hash;

      if (r.event === 'txn_append') {
        const detail = JSON.parse(r.detail) as { contentSha256?: string; hashVersion?: number };
        if (detail.contentSha256) {
          const problem = this.#verifyTxnContent(r.subject, detail.contentSha256, detail.hashVersion);
          if (problem) problems.push(problem);
        }
      }
    }
    return problems;
  }

  #verifyTxnContent(txnId: string, expected: string, version?: number): VerifyProblem | null {
    const t = this.db.get<TxnRow>('SELECT * FROM txn WHERE id = ?', txnId);
    if (!t) {
      return {
        kind: 'content_tampered',
        subject: txnId,
        detail: 'the chain records this transaction but it is no longer in the ledger',
      };
    }
    const rows = this.db.all<PostingRowRaw>(
      `SELECT p.*, a.code AS account_code, t.date AS txn_date, t.status AS txn_status
       FROM posting p JOIN account a ON a.id = p.account_id JOIN txn t ON t.id = p.txn_id
       WHERE p.txn_id = ? ORDER BY p.seq`,
      txnId,
    );
    const actual = txnContentHash(mapTxn(t, rows), version ?? CHAIN_HASH_VERSION);
    if (actual !== expected) {
      return {
        kind: 'content_tampered',
        subject: txnId,
        detail:
          `transaction content hashes to ${actual} but the audit chain recorded ${expected} — ` +
          `it balances, but it is not what was originally written`,
      };
    }
    return null;
  }
}

function chainHeadOf(db: Db): { seq: number; hash: string } | null {
  const head = db.get<{ seq: bigint; hash: string }>('SELECT seq, hash FROM audit_log ORDER BY seq DESC LIMIT 1');
  return head ? { seq: toInt(head.seq), hash: head.hash } : null;
}

interface LoanRowRaw {
  account_id: string;
  funding_account_id: string;
  interest_account_id: string;
  principal_minor: bigint;
  commodity: string;
  annual_rate_text: string;
  method: string;
  term_months: bigint;
  first_payment_date: string;
  payment_day: bigint;
  label: string | null;
}

function mapLoan(r: LoanRowRaw): Loan {
  return {
    accountId: r.account_id as AccountId,
    fundingAccountId: r.funding_account_id as AccountId,
    interestAccountId: r.interest_account_id as AccountId,
    principalMinor: toBigInt(r.principal_minor),
    commodity: r.commodity as CommodityCode,
    annualRateText: r.annual_rate_text,
    method: r.method as Loan['method'],
    termMonths: toInt(r.term_months),
    firstPaymentDate: r.first_payment_date as IsoDate,
    paymentDay: toInt(r.payment_day),
    label: r.label,
  };
}

interface RecurringRowRaw {
  id: string;
  label: string;
  expense_account_id: string;
  funding_account_id: string;
  amount_minor: bigint;
  commodity: string;
  cadence_kind: string;
  day_of_month: bigint;
  month: bigint | null;
  active_from: string;
  active_to: string | null;
}

function mapRecurring(r: RecurringRowRaw): RecurringExpense {
  return {
    id: r.id,
    label: r.label,
    expenseAccountId: r.expense_account_id as AccountId,
    fundingAccountId: r.funding_account_id as AccountId,
    amountMinor: toBigInt(r.amount_minor),
    commodity: r.commodity as CommodityCode,
    cadence:
      r.cadence_kind === 'yearly'
        ? { kind: 'yearly', month: toInt(r.month!), dayOfMonth: toInt(r.day_of_month) }
        : { kind: 'monthly', dayOfMonth: toInt(r.day_of_month) },
    activeFrom: r.active_from as IsoDate,
    activeTo: r.active_to as IsoDate | null,
  };
}

interface InstallmentRowRaw {
  id: string;
  card_account_id: string;
  liability_account_id: string;
  txn_id: string | null;
  purchased_on: string;
  months: bigint;
  total_minor: bigint;
  commodity: string;
  interest_free: bigint;
  label: string | null;
}

function mapInstallment(r: InstallmentRowRaw): InstallmentPlan {
  return {
    id: r.id,
    cardAccountId: r.card_account_id as AccountId,
    liabilityAccountId: r.liability_account_id as AccountId,
    txnId: r.txn_id as TxnId | null,
    purchasedOn: r.purchased_on as IsoDate,
    months: toInt(r.months),
    totalMinor: toBigInt(r.total_minor),
    commodity: r.commodity as CommodityCode,
    interestFree: toBool(r.interest_free),
    label: r.label,
  };
}

interface CardRowRaw {
  account_id: string;
  funding_account_id: string;
  cycle_close_day: bigint;
  payment_month_offset: bigint;
  payment_day: bigint;
  label: string | null;
}

function mapCard(r: CardRowRaw): Card {
  return {
    accountId: r.account_id as AccountId,
    fundingAccountId: r.funding_account_id as AccountId,
    rule: {
      cycleCloseDay: toInt(r.cycle_close_day),
      paymentMonthOffset: toInt(r.payment_month_offset),
      paymentDay: toInt(r.payment_day),
    },
    label: r.label,
  };
}

interface AccountRowRaw {
  id: string;
  code: string;
  type: string;
  parent_id: string | null;
  commodity: string | null;
  monetary: bigint;
  cash: bigint;
  placeholder: bigint;
  opened_on: string;
  closed_on: string | null;
}

function mapAccount(r: AccountRowRaw): Account {
  return {
    id: r.id as AccountId,
    code: r.code as AccountCode,
    type: r.type as AccountType,
    parentId: r.parent_id as AccountId | null,
    commodity: r.commodity as CommodityCode | null,
    monetary: toBool(r.monetary),
    cash: toBool(r.cash),
    placeholder: toBool(r.placeholder),
    openedOn: r.opened_on as IsoDate,
    closedOn: r.closed_on as IsoDate | null,
  };
}

function mapTxn(t: TxnRow, rows: readonly PostingRowRaw[]): ValidatedTxn {
  // trustFromStorage, not create(): the seal trigger already proved the balance
  // on the way in, and re-validating here would mean the store owned a business
  // rule it has no business owning.
  return Txn.trustFromStorage({
    id: t.id as TxnId,
    date: t.date as IsoDate,
    bookingCommodity: t.booking_commodity as CommodityCode,
    payee: t.payee,
    narration: t.narration,
    systemKind: t.system_kind as ValidatedTxn['systemKind'],
    correctsTxnId: t.corrects_txn_id as TxnId | null,
    sourceItemId: t.source_item_id,
    fxEstimated: toBool(t.fx_estimated),
    tags: JSON.parse(t.tags_json) as string[],
    meta: JSON.parse(t.meta_json) as Record<string, unknown>,
    postings: rows.map((r) => ({
      seq: toInt(r.seq),
      accountId: r.account_id as AccountId,
      units: { minor: toBigInt(r.units_minor), commodity: r.commodity as CommodityCode },
      weightMinor: toBigInt(r.weight_minor),
      weightSource: r.weight_source as never,
      fxRateText: r.fx_rate_text,
      fxRateId: r.fx_rate_id,
      lotId: r.lot_id,
      kind: r.kind as never,
      memo: r.memo,
    })),
  });
}

function buildWhere(q: PostingQuery, alias: string): { where: string; params: SqlValue[] } {
  const where: string[] = [`${alias}.sealed = 1`];
  const params: SqlValue[] = [];
  // Drafts are excluded from every balance and report unless asked for by name.
  const statuses = q.statuses ?? (['posted'] as const);
  where.push(`${alias}.status IN (${statuses.map(() => '?').join(',')})`);
  params.push(...statuses);
  if (q.from) {
    where.push(`${alias}.date >= ?`);
    params.push(q.from);
  }
  if (q.to) {
    where.push(`${alias}.date <= ?`);
    params.push(q.to);
  }
  return { where: where.join(' AND '), params };
}
