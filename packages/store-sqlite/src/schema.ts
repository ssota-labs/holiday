/**
 * The DDL, as a TypeScript string rather than a .sql file.
 *
 * This is not a style choice. The CLI ships as `plugin/bin/holiday.mjs`, a single
 * dependency-free bundle, because Claude Code plugins get no build or install
 * step. A `readFile('./schema/001_init.sql')` would resolve relative to whatever
 * cwd the agent happened to be in and would not exist next to the bundle at all.
 * Inlining the schema is what makes the bundle actually self-contained.
 */

export const SCHEMA_VERSION = 2;

export const PRAGMAS = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
-- A personal ledger writes a few rows a day. Correctness beats throughput.
PRAGMA synchronous = FULL;
`;

export const MIGRATION_001 = `
CREATE TABLE book (
  id                    TEXT PRIMARY KEY CHECK (id = 'book'),   -- singleton
  schema_version        INTEGER NOT NULL,
  functional_currency   TEXT NOT NULL REFERENCES commodity(code),
  -- Exactly ONE hard-close grain. A day sits inside a month; revaluing FX at
  -- both grains double-counts it. Daily/weekly are checkpoints, not closes.
  close_grain           TEXT NOT NULL DEFAULT 'month'
                          CHECK (close_grain IN ('day','week','month','quarter','year')),
  timezone              TEXT NOT NULL DEFAULT 'Asia/Seoul',
  dedupe_key_version    INTEGER NOT NULL DEFAULT 1,
  fx_max_staleness_days INTEGER NOT NULL DEFAULT 7,
  created_at            TEXT NOT NULL
) STRICT;

CREATE TABLE commodity (
  code     TEXT PRIMARY KEY,
  -- Capped at 9 because amounts are i64. 18-decimal ERC-20s are therefore not
  -- representable; ETH is defined at 8dp and truncates wei. Documented, accepted.
  exponent INTEGER NOT NULL CHECK (exponent BETWEEN 0 AND 9),
  kind     TEXT NOT NULL CHECK (kind IN ('fiat','crypto','security','unit')),
  name     TEXT NOT NULL
) STRICT;

CREATE TABLE account (
  id          TEXT PRIMARY KEY,
  -- A materialized path. Subtree query = code = ? OR code GLOB ? || ':*'.
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN ('asset','liability','equity','income','expense')),
  parent_id   TEXT REFERENCES account(id),
  -- NULL means opt-in multi-commodity (brokerage, crypto, Wise). Non-null is the
  -- default and is enforced on every posting.
  commodity   TEXT REFERENCES commodity(code),
  monetary    INTEGER NOT NULL DEFAULT 1 CHECK (monetary IN (0,1)),
  placeholder INTEGER NOT NULL DEFAULT 0 CHECK (placeholder IN (0,1)),
  opened_on   TEXT NOT NULL,
  closed_on   TEXT
) STRICT;

CREATE TABLE period (
  id     TEXT PRIMARY KEY,
  grain  TEXT NOT NULL CHECK (grain IN ('day','week','month','quarter','year')),
  start  TEXT NOT NULL,
  end    TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','locked')),
  UNIQUE (grain, start)
) STRICT;

CREATE TABLE txn (
  id                TEXT PRIMARY KEY,
  date              TEXT NOT NULL,
  booking_commodity TEXT NOT NULL REFERENCES commodity(code),
  payee             TEXT,
  narration         TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL CHECK (status IN ('draft','posted','void','rejected')),
  system_kind       TEXT CHECK (system_kind IN ('fx_revaluation','closing_entry','opening_balance')),
  corrects_txn_id   TEXT REFERENCES txn(id),
  source_item_id    TEXT,
  fx_estimated      INTEGER NOT NULL DEFAULT 0 CHECK (fx_estimated IN (0,1)),
  tags_json         TEXT NOT NULL DEFAULT '[]',
  meta_json         TEXT NOT NULL DEFAULT '{}',
  -- SQLite has no deferred CHECK constraints, so the balance rule cannot be a
  -- trigger on posting insert (the sum is legitimately non-zero mid-write).
  -- Instead: write postings against an unsealed txn, then seal it. The seal is
  -- the enforcement point, and nothing unsealed is ever readable as a fact.
  sealed            INTEGER NOT NULL DEFAULT 0 CHECK (sealed IN (0,1)),
  reason            TEXT,
  created_at        TEXT NOT NULL
) STRICT;

CREATE TABLE posting (
  txn_id        TEXT NOT NULL REFERENCES txn(id),
  seq           INTEGER NOT NULL,
  account_id    TEXT NOT NULL REFERENCES account(id),
  -- The FACT: what moved, in its own commodity.
  units_minor   INTEGER NOT NULL,
  commodity     TEXT NOT NULL REFERENCES commodity(code),
  -- The MEASUREMENT: the same movement in the booking commodity. Stored, never
  -- derived from a rate — that is what makes SUM(weight_minor) = 0 exact.
  weight_minor  INTEGER NOT NULL,
  weight_source TEXT NOT NULL CHECK (weight_source IN ('identity','actual','rate','plug')),
  -- Audit only. Never the source of truth for balancing.
  fx_rate_text  TEXT,
  fx_rate_id    TEXT,
  -- Nullable seam for cost-basis lots. Balancing never consults it.
  lot_id        TEXT,
  kind          TEXT NOT NULL DEFAULT 'normal' CHECK (kind IN ('normal','fx_revaluation','rounding')),
  memo          TEXT,
  PRIMARY KEY (txn_id, seq)
) STRICT;

CREATE INDEX posting_by_account ON posting(account_id);
CREATE INDEX txn_by_date        ON txn(date, id);
CREATE INDEX txn_by_status      ON txn(status);
CREATE INDEX account_by_code    ON account(code);

-- Schedule metadata for a liability account. Deliberately NOT in the journal.
--
-- A billing rule is a FORECAST, not a fact: it says when money will move, and it
-- changes when you switch cards or the issuer moves your payment date. Putting it
-- in the journal would mean every such change rewrites history. Facts go in
-- posting; predictions go here; they meet in the projection.
--
-- This is the same shape a loan's amortization schedule will take. A card, a
-- loan, and an installment plan are all the same thing to the ledger — a
-- liability — and differ only in the shape of their schedule.
CREATE TABLE card (
  account_id           TEXT PRIMARY KEY REFERENCES account(id),
  -- Where the cash actually comes from on the payment date.
  funding_account_id   TEXT NOT NULL REFERENCES account(id),
  -- Inclusive. A purchase on this day is on the bill closing that day.
  -- 31 means "closes at month end" and clamps in February.
  cycle_close_day      INTEGER NOT NULL CHECK (cycle_close_day BETWEEN 1 AND 31),
  payment_month_offset INTEGER NOT NULL CHECK (payment_month_offset BETWEEN 0 AND 3),
  -- -1 means the last day of the month (말일).
  payment_day          INTEGER NOT NULL CHECK (payment_day = -1 OR payment_day BETWEEN 1 AND 31),
  label                TEXT
) STRICT;

-- 할부. A purchase split across N bills.
--
-- liability_account_id is deliberately NOT the ordinary card account. Ordinary
-- billing sums the postings inside a cycle, and an installment posts its whole
-- amount on the purchase date — sharing an account would put ₩1,200,000 on the
-- first bill when ₩100,000 is due. Keeping them apart makes ordinary billing skip
-- installments for free; the rows below are projected instead, and the two rejoin
-- at the payment date the way a real statement shows them.
CREATE TABLE installment (
  id                   TEXT PRIMARY KEY,
  -- Whose statement carries the rows. Decides the payment dates.
  card_account_id      TEXT NOT NULL REFERENCES account(id),
  liability_account_id TEXT NOT NULL REFERENCES account(id),
  txn_id               TEXT REFERENCES txn(id),
  purchased_on         TEXT NOT NULL,
  months               INTEGER NOT NULL CHECK (months >= 1),
  total_minor          INTEGER NOT NULL CHECK (total_minor > 0),
  commodity            TEXT NOT NULL REFERENCES commodity(code),
  interest_free        INTEGER NOT NULL DEFAULT 1 CHECK (interest_free IN (0,1)),
  label                TEXT,
  CHECK (card_account_id <> liability_account_id)
) STRICT;

CREATE TABLE installment_row (
  installment_id  TEXT NOT NULL REFERENCES installment(id) ON DELETE CASCADE,
  -- 1-based, the way a statement numbers them (1/12, 2/12 …).
  seq             INTEGER NOT NULL CHECK (seq >= 1),
  payment_date    TEXT NOT NULL,
  principal_minor INTEGER NOT NULL,
  -- 할부수수료. Always 0 for interest-free plans; reserved for when the issuer's
  -- declining-balance formula is actually implemented rather than guessed.
  fee_minor       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (installment_id, seq)
) STRICT;

CREATE INDEX installment_row_by_date ON installment_row(payment_date);
CREATE INDEX installment_by_card     ON installment(card_account_id);

-- 정기지출. Rent, subscriptions, insurance, telecom.
--
-- The third schedule in this file, and a forecast like the other two. Most
-- hand-rolled trackers model recurring spend as an ACCOUNT; that corrupts history
-- the moment a price changes or you cancel, because the past then disagrees with
-- the definition. Netflix is *expected* to take ₩17,000 next month. When it
-- actually does, that is an ordinary transaction like any other.
--
-- funding_account_id carries the whole subtlety: a bank account means cash leaves
-- on the due date; a CARD means the due date only creates debt and the cash
-- leaves later, through that card's billing cycle.
CREATE TABLE recurring (
  id                 TEXT PRIMARY KEY,
  label              TEXT NOT NULL,
  expense_account_id TEXT NOT NULL REFERENCES account(id),
  funding_account_id TEXT NOT NULL REFERENCES account(id),
  amount_minor       INTEGER NOT NULL CHECK (amount_minor > 0),
  commodity          TEXT NOT NULL REFERENCES commodity(code),
  cadence_kind       TEXT NOT NULL CHECK (cadence_kind IN ('monthly','yearly')),
  -- -1 means the last day of the month (말일).
  day_of_month       INTEGER NOT NULL CHECK (day_of_month = -1 OR day_of_month BETWEEN 1 AND 31),
  -- Only meaningful for 'yearly'.
  month              INTEGER CHECK (month IS NULL OR month BETWEEN 1 AND 12),
  active_from        TEXT NOT NULL,
  active_to          TEXT,
  CHECK (cadence_kind <> 'yearly' OR month IS NOT NULL)
) STRICT;

CREATE INDEX recurring_by_funding ON recurring(funding_account_id);

CREATE TABLE command_log (
  idem_key       TEXT PRIMARY KEY,
  request_sha256 TEXT NOT NULL,
  response_json  TEXT NOT NULL,
  created_at     TEXT NOT NULL
) STRICT;

-- The audit trail, as a hash chain.
--
-- The chain exists because this ledger does NOT use git history as its audit
-- mechanism. Without git there is no external tamper evidence, so the chain has
-- to supply it: each row commits to its predecessor, and a txn_append row also
-- commits to a content hash of the sealed transaction and its postings. Editing
-- a posting with the sqlite3 CLI therefore breaks verification even though the
-- ledger would still balance.
--
-- Honest limit: this detects casual and accidental tampering — a hand edit, a
-- buggy adapter, a partial restore. It does NOT stop someone with write access
-- from recomputing the whole chain. Closing that requires anchoring the head
-- hash somewhere outside the file (print it, commit it, mail it to yourself);
-- "holiday verify --head" exists for that.
CREATE TABLE audit_log (
  -- Assigned explicitly, not AUTOINCREMENT: the hash covers the seq, so the seq
  -- has to be known before the row is built.
  seq        INTEGER PRIMARY KEY,
  at         TEXT NOT NULL,
  event      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  detail     TEXT NOT NULL DEFAULT '{}',
  prev_hash  TEXT NOT NULL,
  hash       TEXT NOT NULL UNIQUE
) STRICT;

-- Append-only, enforced. An audit trail you can quietly edit is decoration.
CREATE TRIGGER audit_log_immutable_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'holiday: the audit log is append-only');
END;

CREATE TRIGGER audit_log_immutable_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'holiday: the audit log is append-only');
END;

CREATE TABLE fx_rate (
  id         TEXT PRIMARY KEY,
  as_of      TEXT NOT NULL,
  base       TEXT NOT NULL REFERENCES commodity(code),
  quote      TEXT NOT NULL REFERENCES commodity(code),
  -- A decimal STRING. Never a float. Floats do not belong anywhere near money.
  rate       TEXT NOT NULL,
  source     TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  UNIQUE (as_of, base, quote, source)
) STRICT;

-- ─────────────────────────────────────────────────── ring 3: invariants at rest
-- These exist to catch bugs in the domain, unsafe casts, and someone opening the
-- file with the sqlite3 CLI. The domain is the authority; this is the backstop.
-- Only an engine-tier store can offer this at all, which is a standing argument
-- against ever making a Notion-shaped store the system of record.

CREATE TRIGGER txn_seal_requires_balance
BEFORE UPDATE OF sealed ON txn
WHEN NEW.sealed = 1 AND OLD.sealed = 0
BEGIN
  SELECT RAISE(ABORT, 'holiday: transaction has fewer than two postings')
  WHERE (SELECT COUNT(*) FROM posting WHERE txn_id = NEW.id) < 2;

  SELECT RAISE(ABORT, 'holiday: unbalanced transaction — postings must sum to exactly zero')
  WHERE (SELECT COALESCE(SUM(weight_minor), 0) FROM posting WHERE txn_id = NEW.id) <> 0;
END;

CREATE TRIGGER posting_rejects_placeholder_account
BEFORE INSERT ON posting
BEGIN
  SELECT RAISE(ABORT, 'holiday: cannot post to a placeholder account')
  WHERE (SELECT placeholder FROM account WHERE id = NEW.account_id) = 1;
END;

CREATE TRIGGER posting_commodity_conformance
BEFORE INSERT ON posting
BEGIN
  -- The most likely real error in the whole system: the vision model reads '$'
  -- as '₩' and posts USD into a KRW-only account. This is where it dies.
  SELECT RAISE(ABORT, 'holiday: posting commodity does not match the account''s declared commodity')
  WHERE (SELECT commodity FROM account WHERE id = NEW.account_id) IS NOT NULL
    AND (SELECT commodity FROM account WHERE id = NEW.account_id) <> NEW.commodity;
END;

CREATE TRIGGER posting_identity_weight
BEFORE INSERT ON posting
BEGIN
  SELECT RAISE(ABORT, 'holiday: a posting already in the booking commodity must have weight = units')
  WHERE NEW.commodity = (SELECT booking_commodity FROM txn WHERE id = NEW.txn_id)
    AND NEW.weight_minor <> NEW.units_minor;
END;

-- The journal is append-only. Once sealed, postings are facts.
CREATE TRIGGER posting_immutable_insert
BEFORE INSERT ON posting
WHEN (SELECT sealed FROM txn WHERE id = NEW.txn_id) = 1
BEGIN
  SELECT RAISE(ABORT, 'holiday: cannot add a posting to a sealed transaction — write a correction instead');
END;

CREATE TRIGGER posting_immutable_update
BEFORE UPDATE ON posting
WHEN (SELECT sealed FROM txn WHERE id = OLD.txn_id) = 1
BEGIN
  SELECT RAISE(ABORT, 'holiday: postings of a sealed transaction are immutable — write a correction instead');
END;

CREATE TRIGGER posting_immutable_delete
BEFORE DELETE ON posting
WHEN (SELECT sealed FROM txn WHERE id = OLD.txn_id) = 1
BEGIN
  SELECT RAISE(ABORT, 'holiday: postings of a sealed transaction cannot be deleted — void or correct instead');
END;

CREATE TRIGGER txn_never_unseals
BEFORE UPDATE OF sealed ON txn
WHEN OLD.sealed = 1 AND NEW.sealed = 0
BEGIN
  SELECT RAISE(ABORT, 'holiday: a sealed transaction cannot be unsealed');
END;

-- An exponent change silently rescales every amount of that commodity. It is a
-- migration, not an edit.
CREATE TRIGGER commodity_exponent_immutable
BEFORE UPDATE OF exponent ON commodity
WHEN OLD.exponent <> NEW.exponent
  AND EXISTS (SELECT 1 FROM posting WHERE commodity = OLD.code)
BEGIN
  SELECT RAISE(ABORT, 'holiday: cannot change the exponent of a commodity that has postings');
END;
`;

/**
 * `account.cash` — is this account spendable cash?
 *
 * Replaces a hardcoded prefix rule (`Assets:Bank*` / `Assets:Cash*`) in the
 * cashflow projection. The prefix was a convention masquerading as a fact: an
 * account holding real cash under any other name was **silently** left out of the
 * projection, which is the worst way to be wrong — the number looks fine.
 *
 * The backfill applies the old convention once, so existing ledgers keep working
 * and anything outside it surfaces as a question rather than a silent omission.
 */
export const MIGRATION_002 = `
ALTER TABLE account ADD COLUMN cash INTEGER NOT NULL DEFAULT 0 CHECK (cash IN (0,1));

UPDATE account
   SET cash = 1
 WHERE type = 'asset'
   AND (code GLOB 'Assets:Bank:*' OR code = 'Assets:Cash' OR code GLOB 'Assets:Cash:*');
`;

/** Append-only. Editing a past entry rewrites history on machines that already ran it. */
export const MIGRATIONS: readonly { version: number; sql: string }[] = [
  { version: 1, sql: MIGRATION_001 },
  { version: 2, sql: MIGRATION_002 },
];
