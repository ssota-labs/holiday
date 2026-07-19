import { bigint, check, index, integer, pgTable, primaryKey, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * The same ledger, in Postgres. A SEPARATE file from the SQLite schema, not a
 * shared one — `sqliteTable` and `pgTable` are different builders with
 * non-overlapping column types, and there is no unified builder. That is the
 * finding recorded in ADR-005, and it is why "use Drizzle so it works for sqlite
 * or supabase" did not hold.
 *
 * What Postgres does better: amounts are real `bigint` (int8). SQLite needed a
 * wrapper forcing setReadBigInts(true) on every statement because node:sqlite
 * reads INTEGER as a JS number and throws past 2^53. Here the type system and the
 * storage agree.
 *
 * What is identical: the meaning. units is the fact, weight is the measurement,
 * SUM(weight) = 0 exactly. The port does not care which engine is underneath, and
 * the conformance suite proves it by running against both.
 *
 * Triggers live in a hand-written migration, as with SQLite — but in plpgsql,
 * because RAISE(ABORT) is SQLite-only. Same invariants, different dialect.
 */

export const commodity = pgTable(
  'commodity',
  {
    code: text('code').primaryKey(),
    // Capped at 9 because amounts are i64: 18-decimal ERC-20s are not
    // representable, and ETH is defined at 8dp. Documented, accepted.
    exponent: integer('exponent').notNull(),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
  },
  (t) => [
    check('commodity_exponent_range', sql`${t.exponent} BETWEEN 0 AND 9`),
    check('commodity_kind_enum', sql`${t.kind} IN ('fiat','crypto','security','unit')`),
  ],
);

export const book = pgTable(
  'book',
  {
    id: text('id').primaryKey(),
    schemaVersion: integer('schema_version').notNull(),
    functionalCurrency: text('functional_currency')
      .notNull()
      .references(() => commodity.code),
    // Exactly ONE hard-close grain. A day sits inside a month; revaluing FX at
    // both double-counts it. Daily/weekly are checkpoints, not closes.
    closeGrain: text('close_grain').notNull().default('month'),
    timezone: text('timezone').notNull().default('Asia/Seoul'),
    dedupeKeyVersion: integer('dedupe_key_version').notNull().default(1),
    fxMaxStalenessDays: integer('fx_max_staleness_days').notNull().default(7),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    check('book_singleton', sql`${t.id} = 'book'`),
    check('book_close_grain_enum', sql`${t.closeGrain} IN ('day','week','month','quarter','year')`),
  ],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    // A materialized path. Subtree query = code = ? OR code GLOB ? || ':*'.
    code: text('code').notNull().unique(),
    type: text('type').notNull(),
    parentId: text('parent_id'),
    // NULL means opt-in multi-commodity (brokerage, crypto, Wise). Non-null is
    // the default and is enforced on every posting by trigger.
    commodity: text('commodity').references(() => commodity.code),
    monetary: integer('monetary').notNull().default(1),
    // Spendable cash. A flag, not a code prefix: the prefix was a convention
    // pretending to be a fact, and cash held elsewhere vanished from the
    // projection silently.
    cash: integer('cash').notNull().default(0),
    placeholder: integer('placeholder').notNull().default(0),
    openedOn: text('opened_on').notNull(),
    closedOn: text('closed_on'),
  },
  (t) => [
    index('account_by_code').on(t.code),
    check('account_type_enum', sql`${t.type} IN ('asset','liability','equity','income','expense')`),
    check('account_monetary_bool', sql`${t.monetary} IN (0,1)`),
    check('account_cash_bool', sql`${t.cash} IN (0,1)`),
    check('account_placeholder_bool', sql`${t.placeholder} IN (0,1)`),
  ],
);

export const period = pgTable(
  'period',
  {
    id: text('id').primaryKey(),
    grain: text('grain').notNull(),
    start: text('start').notNull(),
    end: text('end').notNull(),
    status: text('status').notNull().default('open'),
  },
  (t) => [
    uniqueIndex('period_grain_start').on(t.grain, t.start),
    check('period_grain_enum', sql`${t.grain} IN ('day','week','month','quarter','year')`),
    check('period_status_enum', sql`${t.status} IN ('open','closed','locked')`),
  ],
);

export const txn = pgTable(
  'txn',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    bookingCommodity: text('booking_commodity')
      .notNull()
      .references(() => commodity.code),
    payee: text('payee'),
    narration: text('narration').notNull().default(''),
    status: text('status').notNull(),
    systemKind: text('system_kind'),
    correctsTxnId: text('corrects_txn_id'),
    sourceItemId: text('source_item_id'),
    fxEstimated: integer('fx_estimated').notNull().default(0),
    tagsJson: text('tags_json').notNull().default('[]'),
    metaJson: text('meta_json').notNull().default('{}'),
    // SQLite has no deferred CHECK constraints, and a running sum is legitimately
    // non-zero mid-write, so the balance rule cannot be a trigger on posting
    // insert. Instead: write postings against an unsealed txn, then seal it. The
    // seal is the enforcement point; nothing unsealed is readable as a fact.
    sealed: integer('sealed').notNull().default(0),
    reason: text('reason'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('txn_by_date').on(t.date, t.id),
    index('txn_by_status').on(t.status),
    check('txn_status_enum', sql`${t.status} IN ('draft','posted','void','rejected')`),
    check(
      'txn_system_kind_enum',
      sql`${t.systemKind} IS NULL OR ${t.systemKind} IN ('fx_revaluation','closing_entry','opening_balance')`,
    ),
    check('txn_fx_estimated_bool', sql`${t.fxEstimated} IN (0,1)`),
    check('txn_sealed_bool', sql`${t.sealed} IN (0,1)`),
  ],
);

export const posting = pgTable(
  'posting',
  {
    txnId: text('txn_id')
      .notNull()
      .references(() => txn.id),
    seq: integer('seq').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => account.id),
    // The FACT: what moved, in its own commodity. i64 — read through Db, not Drizzle.
    unitsMinor: bigint('units_minor', { mode: 'bigint' }).notNull(),
    commodity: text('commodity')
      .notNull()
      .references(() => commodity.code),
    // The MEASUREMENT: the same movement in the booking commodity. Stored, never
    // derived from a rate — that is what makes SUM(weight_minor) = 0 exact.
    weightMinor: bigint('weight_minor', { mode: 'bigint' }).notNull(),
    weightSource: text('weight_source').notNull(),
    // Audit only. Never the source of truth for balancing.
    fxRateText: text('fx_rate_text'),
    fxRateId: text('fx_rate_id'),
    // Nullable seam for cost-basis lots. Balancing never consults it.
    lotId: text('lot_id'),
    kind: text('kind').notNull().default('normal'),
    memo: text('memo'),
  },
  (t) => [
    primaryKey({ columns: [t.txnId, t.seq] }),
    index('posting_by_account').on(t.accountId),
    check('posting_weight_source_enum', sql`${t.weightSource} IN ('identity','actual','rate','plug')`),
    check('posting_kind_enum', sql`${t.kind} IN ('normal','fx_revaluation','rounding')`),
  ],
);

export const card = pgTable(
  'card',
  {
    accountId: text('account_id')
      .primaryKey()
      .references(() => account.id),
    fundingAccountId: text('funding_account_id')
      .notNull()
      .references(() => account.id),
    // Inclusive. 31 means "closes at month end" and clamps in February.
    cycleCloseDay: integer('cycle_close_day').notNull(),
    paymentMonthOffset: integer('payment_month_offset').notNull(),
    // -1 means the last day of the month (말일).
    paymentDay: integer('payment_day').notNull(),
    label: text('label'),
  },
  (t) => [
    check('card_close_day_range', sql`${t.cycleCloseDay} BETWEEN 1 AND 31`),
    check('card_offset_range', sql`${t.paymentMonthOffset} BETWEEN 0 AND 3`),
    check('card_payment_day_range', sql`${t.paymentDay} = -1 OR ${t.paymentDay} BETWEEN 1 AND 31`),
  ],
);

export const installment = pgTable(
  'installment',
  {
    id: text('id').primaryKey(),
    // Whose statement carries the rows. Decides the payment dates.
    cardAccountId: text('card_account_id')
      .notNull()
      .references(() => account.id),
    // Deliberately NOT the ordinary card account: ordinary billing sums postings
    // inside a cycle, and an installment posts its whole amount on the purchase
    // date, so sharing would bill ₩1,200,000 when ₩100,000 is due.
    liabilityAccountId: text('liability_account_id')
      .notNull()
      .references(() => account.id),
    txnId: text('txn_id').references(() => txn.id),
    purchasedOn: text('purchased_on').notNull(),
    months: integer('months').notNull(),
    totalMinor: bigint('total_minor', { mode: 'bigint' }).notNull(),
    commodity: text('commodity')
      .notNull()
      .references(() => commodity.code),
    interestFree: integer('interest_free').notNull().default(1),
    label: text('label'),
  },
  (t) => [
    index('installment_by_card').on(t.cardAccountId),
    check('installment_months_positive', sql`${t.months} >= 1`),
    check('installment_total_positive', sql`${t.totalMinor} > 0`),
    check('installment_accounts_differ', sql`${t.cardAccountId} <> ${t.liabilityAccountId}`),
    check('installment_interest_free_bool', sql`${t.interestFree} IN (0,1)`),
  ],
);

export const installmentRow = pgTable(
  'installment_row',
  {
    installmentId: text('installment_id')
      .notNull()
      .references(() => installment.id, { onDelete: 'cascade' }),
    // 1-based, the way a statement numbers them (1/12, 2/12 …).
    seq: integer('seq').notNull(),
    paymentDate: text('payment_date').notNull(),
    principalMinor: bigint('principal_minor', { mode: 'bigint' }).notNull(),
    // 할부수수료. Observed off a statement, never computed — see POLICY-006.
    feeMinor: bigint('fee_minor', { mode: 'bigint' }).notNull().default(0n),
  },
  (t) => [
    primaryKey({ columns: [t.installmentId, t.seq] }),
    index('installment_row_by_date').on(t.paymentDate),
    check('installment_row_seq_positive', sql`${t.seq} >= 1`),
  ],
);

export const recurring = pgTable(
  'recurring',
  {
    id: text('id').primaryKey(),
    label: text('label').notNull(),
    expenseAccountId: text('expense_account_id')
      .notNull()
      .references(() => account.id),
    // Carries the whole subtlety: a bank account debits on the due date; a CARD
    // only creates debt then, and the cash leaves through its billing cycle.
    fundingAccountId: text('funding_account_id')
      .notNull()
      .references(() => account.id),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    commodity: text('commodity')
      .notNull()
      .references(() => commodity.code),
    cadenceKind: text('cadence_kind').notNull(),
    // -1 means the last day of the month (말일).
    dayOfMonth: integer('day_of_month').notNull(),
    // Only meaningful for 'yearly'.
    month: integer('month'),
    activeFrom: text('active_from').notNull(),
    activeTo: text('active_to'),
  },
  (t) => [
    index('recurring_by_funding').on(t.fundingAccountId),
    check('recurring_amount_positive', sql`${t.amountMinor} > 0`),
    check('recurring_cadence_enum', sql`${t.cadenceKind} IN ('monthly','yearly')`),
    check('recurring_day_range', sql`${t.dayOfMonth} = -1 OR ${t.dayOfMonth} BETWEEN 1 AND 31`),
    check('recurring_month_range', sql`${t.month} IS NULL OR ${t.month} BETWEEN 1 AND 12`),
    check('recurring_yearly_needs_month', sql`${t.cadenceKind} <> 'yearly' OR ${t.month} IS NOT NULL`),
  ],
);

/**
 * 정기수입. Same forecast shape as `recurring`, opposite direction: cash arrives
 * in a deposit account on the occurrence date. No card-cycle branch — salary does
 * not ride a billing cycle.
 */
export const recurringIncome = pgTable(
  'recurring_income',
  {
    id: text('id').primaryKey(),
    label: text('label').notNull(),
    incomeAccountId: text('income_account_id')
      .notNull()
      .references(() => account.id),
    depositAccountId: text('deposit_account_id')
      .notNull()
      .references(() => account.id),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    commodity: text('commodity')
      .notNull()
      .references(() => commodity.code),
    cadenceKind: text('cadence_kind').notNull(),
    // -1 means the last day of the month (말일).
    dayOfMonth: integer('day_of_month').notNull(),
    // Only meaningful for 'yearly'.
    month: integer('month'),
    activeFrom: text('active_from').notNull(),
    activeTo: text('active_to'),
  },
  (t) => [
    index('recurring_income_by_deposit').on(t.depositAccountId),
    check('recurring_income_amount_positive', sql`${t.amountMinor} > 0`),
    check('recurring_income_cadence_enum', sql`${t.cadenceKind} IN ('monthly','yearly')`),
    check('recurring_income_day_range', sql`${t.dayOfMonth} = -1 OR ${t.dayOfMonth} BETWEEN 1 AND 31`),
    check('recurring_income_month_range', sql`${t.month} IS NULL OR ${t.month} BETWEEN 1 AND 12`),
    check(
      'recurring_income_yearly_needs_month',
      sql`${t.cadenceKind} <> 'yearly' OR ${t.month} IS NOT NULL`,
    ),
  ],
);

/**
 * 수입 원천 — Income 계정에 붙는 대한민국 정산 regime.
 * See sqlite schema for the design note.
 */
export const incomeSource = pgTable(
  'income_source',
  {
    id: text('id').primaryKey(),
    label: text('label').notNull().unique(),
    incomeAccountId: text('income_account_id')
      .notNull()
      .references(() => account.id),
    depositAccountId: text('deposit_account_id')
      .notNull()
      .references(() => account.id),
    regime: text('regime').notNull(),
    commodity: text('commodity')
      .notNull()
      .references(() => commodity.code),
    activeFrom: text('active_from').notNull(),
    activeTo: text('active_to'),
  },
  (t) => [
    index('income_source_by_income').on(t.incomeAccountId),
    check(
      'income_source_regime_enum',
      sql`${t.regime} IN ('business_withholding','business_vat','salary','allowance')`,
    ),
  ],
);

export const incomeSettlement = pgTable(
  'income_settlement',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => incomeSource.id, { onDelete: 'cascade' }),
    paidOn: text('paid_on').notNull(),
    grossMinor: bigint('gross_minor', { mode: 'bigint' }).notNull(),
    netMinor: bigint('net_minor', { mode: 'bigint' }).notNull(),
    commodity: text('commodity')
      .notNull()
      .references(() => commodity.code),
    statuteAsOf: text('statute_as_of').notNull(),
    txnId: text('txn_id').references(() => txn.id),
    label: text('label'),
  },
  (t) => [
    index('income_settlement_by_source').on(t.sourceId),
    index('income_settlement_by_date').on(t.paidOn),
    check('income_settlement_gross_positive', sql`${t.grossMinor} > 0`),
  ],
);

export const incomeSettlementLine = pgTable(
  'income_settlement_line',
  {
    settlementId: text('settlement_id')
      .notNull()
      .references(() => incomeSettlement.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    kind: text('kind').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.settlementId, t.seq] }),
    check('income_settlement_line_seq_positive', sql`${t.seq} >= 1`),
    check('income_settlement_line_amount_nonneg', sql`${t.amountMinor} >= 0`),
    check(
      'income_settlement_line_kind_enum',
      sql`${t.kind} IN ('income_tax_3','local_tax_0_3','vat_10','national_pension','health_insurance','long_term_care','employment_insurance','earned_income_tax','local_income_tax')`,
    ),
  ],
);

export const fxRate = pgTable(
  'fx_rate',
  {
    id: text('id').primaryKey(),
    asOf: text('as_of').notNull(),
    base: text('base')
      .notNull()
      .references(() => commodity.code),
    quote: text('quote')
      .notNull()
      .references(() => commodity.code),
    // A decimal STRING. Never a float. Floats do not belong near money.
    rate: text('rate').notNull(),
    source: text('source').notNull(),
    fetchedAt: text('fetched_at').notNull(),
  },
  (t) => [uniqueIndex('fx_rate_unique').on(t.asOf, t.base, t.quote, t.source)],
);

export const commandLog = pgTable('command_log', {
  idemKey: text('idem_key').primaryKey(),
  requestSha256: text('request_sha256').notNull(),
  responseJson: text('response_json').notNull(),
  createdAt: text('created_at').notNull(),
});

export const auditLog = pgTable('audit_log', {
  // Assigned explicitly, not autoincrement: the hash covers the seq, so the seq
  // must be known before the row is built.
  seq: integer('seq').primaryKey(),
  at: text('at').notNull(),
  event: text('event').notNull(),
  subject: text('subject').notNull(),
  detail: text('detail').notNull().default('{}'),
  prevHash: text('prev_hash').notNull(),
  hash: text('hash').notNull().unique(),
});

/**
 * 대출. The fourth and last schedule, same shape as the other three: a forecast,
 * outside the journal, meeting the ledger at pre-fill and reconciliation.
 *
 * `interest_account_id` is here because a loan payment is the one transaction a
 * user cannot split themselves — a statement says "₩1,247,300 paid to KB" and
 * nothing else. The schedule knows the principal/interest breakdown; this says
 * where the interest half is booked.
 */
export const loan = pgTable(
  'loan',
  {
    accountId: text('account_id')
      .primaryKey()
      .references(() => account.id),
    fundingAccountId: text('funding_account_id')
      .notNull()
      .references(() => account.id),
    interestAccountId: text('interest_account_id')
      .notNull()
      .references(() => account.id),
    principalMinor: bigint('principal_minor', { mode: 'bigint' }).notNull(),
    commodity: text('commodity')
      .notNull()
      .references(() => commodity.code),
    // Annual percentage as a decimal STRING. Never a float — this gets compounded
    // 360 times.
    annualRateText: text('annual_rate_text').notNull(),
    method: text('method').notNull(),
    termMonths: integer('term_months').notNull(),
    firstPaymentDate: text('first_payment_date').notNull(),
    // -1 means 말일.
    paymentDay: integer('payment_day').notNull(),
    label: text('label'),
  },
  (t) => [
    check('loan_principal_positive', sql`${t.principalMinor} > 0`),
    check('loan_term_positive', sql`${t.termMonths} >= 1`),
    check('loan_method_enum', sql`${t.method} IN ('annuity','equal_principal','bullet','interest_only')`),
    check('loan_payment_day_range', sql`${t.paymentDay} = -1 OR ${t.paymentDay} BETWEEN 1 AND 31`),
    check('loan_accounts_differ', sql`${t.accountId} <> ${t.fundingAccountId}`),
  ],
);

export const loanScheduleRow = pgTable(
  'loan_schedule_row',
  {
    loanId: text('loan_id')
      .notNull()
      .references(() => loan.accountId, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    dueDate: text('due_date').notNull(),
    openingMinor: bigint('opening_minor', { mode: 'bigint' }).notNull(),
    principalMinor: bigint('principal_minor', { mode: 'bigint' }).notNull(),
    interestMinor: bigint('interest_minor', { mode: 'bigint' }).notNull(),
    closingMinor: bigint('closing_minor', { mode: 'bigint' }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.loanId, t.seq] }),
    index('loan_schedule_by_date').on(t.dueDate),
    check('loan_schedule_seq_positive', sql`${t.seq} >= 1`),
  ],
);

/**
 * Ingest provenance: which image became which transaction.
 *
 * A batch is one screenshot. `source_sha256` is the image bytes, and it is UNIQUE
 * — dropping the identical file twice is always a mistake, and that is the one
 * duplicate check that can block without ever being wrong.
 */
export const ingestBatch = pgTable(
  'ingest_batch',
  {
    id: text('id').primaryKey(),
    // UNIQUE: the same bytes are the same screenshot. Blocks.
    sourceSha256: text('source_sha256').notNull().unique(),
    sourceName: text('source_name'),
    submittedAt: text('submitted_at').notNull(),
    itemCount: integer('item_count').notNull().default(0),
  },
  (t) => [check('ingest_batch_count_nonneg', sql`${t.itemCount} >= 0`)],
);

/**
 * One parsed transaction from a screenshot, and what became of it.
 *
 * Rows are RETAINED after rejection, deliberately: a rejected item is dedup
 * memory. Delete it and the same screenshot gets re-proposed forever.
 *
 * `dedupe_key` is NOT unique. Its authority varies — see `dedupe_authority`. An
 * issuer's transaction id can block; account+date+amount+merchant cannot, because
 * two ₩4,500 americanos on one Tuesday share it and are both real.
 */
export const ingestItem = pgTable(
  'ingest_item',
  {
    id: text('id').primaryKey(),
    batchId: text('batch_id')
      .notNull()
      .references(() => ingestBatch.id, { onDelete: 'cascade' }),
    dedupeKey: text('dedupe_key').notNull(),
    dedupeAuthority: text('dedupe_authority').notNull(),
    externalRef: text('external_ref'),
    merchant: text('merchant'),
    // The transaction this became. Null while pending or if rejected.
    txnId: text('txn_id').references(() => txn.id),
    status: text('status').notNull().default('pending'),
    reason: text('reason'),
    /** What the vision model actually said, verbatim. The audit trail for a misread. */
    parsedJson: text('parsed_json').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('ingest_item_by_dedupe').on(t.dedupeKey),
    index('ingest_item_by_batch').on(t.batchId),
    check('ingest_item_status_enum', sql`${t.status} IN ('pending','accepted','rejected')`),
    check('ingest_item_authority_enum', sql`${t.dedupeAuthority} IN ('image','external_ref','natural')`),
  ],
);

/**
 * 잔고 단언 — "on this date, this account held exactly this."
 *
 * The only real defense against the weakest link in the system. Everything else
 * here guards structure: the balance rule, the commodity triggers, the audit
 * chain. None of them can tell that the vision model read ₩1,240,00 instead of
 * ₩1,240,000 — both produce a perfectly balanced, perfectly conformant ledger.
 *
 * An assertion is the one place a number from OUTSIDE the ledger enters and gets
 * compared. It turns "the model might be wrong" into "the ledger disagrees with
 * your bank by ₩X on this date", which is actionable.
 *
 * That is why `close` gates on it: a month whose balances were never checked
 * against reality is not closed, it is only frozen.
 */
export const balanceAssertion = pgTable(
  'balance_assertion',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => account.id),
    asOf: text('as_of').notNull(),
    commodity: text('commodity')
      .notNull()
      .references(() => commodity.code),
    /** What the statement says. i64 minor units. */
    expectedMinor: bigint('expected_minor', { mode: 'bigint' }).notNull(),
    note: text('note'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    // One claim per account per date per commodity. Two different answers to the
    // same question is not a record, it is a bug.
    uniqueIndex('balance_assertion_unique').on(t.accountId, t.asOf, t.commodity),
    index('balance_assertion_by_date').on(t.asOf),
  ],
);

/**
 * A closed period, and what it was worth.
 *
 * `close` writes the FX revaluation while the period is still open (so the
 * closed-period guard never has to be bypassed), snapshots every balance, then
 * flips the status. The snapshot is what gives carry-forward and a self-contained
 * balance sheet WITHOUT posting closing entries into equity — those exist because
 * paper ledgers could not compute a period-scoped sum. We have SQL.
 */
export const snapshot = pgTable(
  'snapshot',
  {
    id: text('id').primaryKey(),
    periodId: text('period_id')
      .notNull()
      .references(() => period.id),
    kind: text('kind').notNull(),
    asOf: text('as_of').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('snapshot_unique').on(t.periodId, t.kind),
    check('snapshot_kind_enum', sql`${t.kind} IN ('close','checkpoint')`),
  ],
);

export const snapshotBalance = pgTable(
  'snapshot_balance',
  {
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshot.id, { onDelete: 'cascade' }),
    accountId: text('account_id')
      .notNull()
      .references(() => account.id),
    commodity: text('commodity')
      .notNull()
      .references(() => commodity.code),
    /** Closing units in the account's own commodity. */
    unitsMinor: bigint('units_minor', { mode: 'bigint' }).notNull(),
    /** Closing KRW carrying value — free, it is just SUM(weight_minor). */
    weightMinor: bigint('weight_minor', { mode: 'bigint' }).notNull(),
    /** Movement during the period, for a period-scoped report without a query. */
    periodUnitsMinor: bigint('period_units_minor', { mode: 'bigint' }).notNull().default(0n),
    periodWeightMinor: bigint('period_weight_minor', { mode: 'bigint' }).notNull().default(0n),
  },
  (t) => [primaryKey({ columns: [t.snapshotId, t.accountId, t.commodity] })],
);

/**
 * Classification rules: payee pattern → category account.
 *
 * Rules live in the ledger DB — they travel with the money they classify — but
 * they are CONFIG, not journal: adding, editing, or deleting a rule never touches
 * a posted transaction. A rule changes what the NEXT import decides, exactly like
 * a card cycle changes the next projection (fact/forecast, same side).
 *
 * `category` stores the account CODE, not id: rules are read and edited by
 * humans, and codes are what humans recognise. A rename can orphan a rule; the
 * applier treats an unresolvable code as no-match and warns rather than guessing.
 */
export const rule = pgTable(
  'rule',
  {
    id: text('id').primaryKey(),
    pattern: text('pattern').notNull(),
    match: text('match').notNull().default('contains'),
    category: text('category').notNull(),
    priority: integer('priority').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (t) => [check('rule_match_kind', sql`${t.match} IN ('contains', 'regex')`)],
);
