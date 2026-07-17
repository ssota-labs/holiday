-- Ring 3: invariants enforced at rest.
--
-- Hand-written because drizzle-kit models no triggers at all — its schema DSL has
-- no trigger builder, and `generate` neither creates nor drops them. This is a
-- `generate --custom` migration, which is what the Drizzle docs prescribe for
-- "DDL alternations currently not supported by Drizzle Kit".
--
-- These exist to catch bugs in the domain, unsafe casts, and someone opening the
-- file with the sqlite3 CLI. The domain is the authority; this is the backstop.
-- Only an engine-tier store can offer this at all, which is a standing argument
-- against ever making a Notion-shaped store the system of record.
--
-- WARNING for future migrations: drizzle-kit's SQLite ALTER strategy recreates a
-- table (create new → copy → drop old → rename), and SQLite drops the triggers
-- attached to a dropped table. Any migration that recreates `txn`, `posting`,
-- `account`, `commodity`, or `audit_log` MUST re-create the relevant triggers
-- below, or the invariants silently stop being enforced while every test still
-- passes. `holiday verify` would still catch violations after the fact; nothing
-- would stop them going in.

CREATE TRIGGER txn_seal_requires_balance
BEFORE UPDATE OF sealed ON txn
WHEN NEW.sealed = 1 AND OLD.sealed = 0
BEGIN
  SELECT RAISE(ABORT, 'holiday: transaction has fewer than two postings')
  WHERE (SELECT COUNT(*) FROM posting WHERE txn_id = NEW.id) < 2;

  SELECT RAISE(ABORT, 'holiday: unbalanced transaction — postings must sum to exactly zero')
  WHERE (SELECT COALESCE(SUM(weight_minor), 0) FROM posting WHERE txn_id = NEW.id) <> 0;
END;
--> statement-breakpoint

CREATE TRIGGER posting_rejects_placeholder_account
BEFORE INSERT ON posting
BEGIN
  SELECT RAISE(ABORT, 'holiday: cannot post to a placeholder account')
  WHERE (SELECT placeholder FROM account WHERE id = NEW.account_id) = 1;
END;
--> statement-breakpoint

-- The most likely real error in the whole system: the vision model reads '$' as
-- '₩' and posts USD into a KRW-only account. This is where it dies.
CREATE TRIGGER posting_commodity_conformance
BEFORE INSERT ON posting
BEGIN
  SELECT RAISE(ABORT, 'holiday: posting commodity does not match the account''s declared commodity')
  WHERE (SELECT commodity FROM account WHERE id = NEW.account_id) IS NOT NULL
    AND (SELECT commodity FROM account WHERE id = NEW.account_id) <> NEW.commodity;
END;
--> statement-breakpoint

CREATE TRIGGER posting_identity_weight
BEFORE INSERT ON posting
BEGIN
  SELECT RAISE(ABORT, 'holiday: a posting already in the booking commodity must have weight = units')
  WHERE NEW.commodity = (SELECT booking_commodity FROM txn WHERE id = NEW.txn_id)
    AND NEW.weight_minor <> NEW.units_minor;
END;
--> statement-breakpoint

-- The journal is append-only. Once sealed, postings are facts.
CREATE TRIGGER posting_immutable_insert
BEFORE INSERT ON posting
WHEN (SELECT sealed FROM txn WHERE id = NEW.txn_id) = 1
BEGIN
  SELECT RAISE(ABORT, 'holiday: cannot add a posting to a sealed transaction — write a correction instead');
END;
--> statement-breakpoint

CREATE TRIGGER posting_immutable_update
BEFORE UPDATE ON posting
WHEN (SELECT sealed FROM txn WHERE id = OLD.txn_id) = 1
BEGIN
  SELECT RAISE(ABORT, 'holiday: postings of a sealed transaction are immutable — write a correction instead');
END;
--> statement-breakpoint

CREATE TRIGGER posting_immutable_delete
BEFORE DELETE ON posting
WHEN (SELECT sealed FROM txn WHERE id = OLD.txn_id) = 1
BEGIN
  SELECT RAISE(ABORT, 'holiday: postings of a sealed transaction cannot be deleted — void or correct instead');
END;
--> statement-breakpoint

CREATE TRIGGER txn_never_unseals
BEFORE UPDATE OF sealed ON txn
WHEN OLD.sealed = 1 AND NEW.sealed = 0
BEGIN
  SELECT RAISE(ABORT, 'holiday: a sealed transaction cannot be unsealed');
END;
--> statement-breakpoint

-- An exponent change silently rescales every amount of that commodity. It is a
-- migration, not an edit.
CREATE TRIGGER commodity_exponent_immutable
BEFORE UPDATE OF exponent ON commodity
WHEN OLD.exponent <> NEW.exponent
  AND EXISTS (SELECT 1 FROM posting WHERE commodity = OLD.code)
BEGIN
  SELECT RAISE(ABORT, 'holiday: cannot change the exponent of a commodity that has postings');
END;
--> statement-breakpoint

-- An audit log you can quietly edit is decoration.
CREATE TRIGGER audit_log_immutable_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'holiday: the audit log is append-only');
END;
--> statement-breakpoint

CREATE TRIGGER audit_log_immutable_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'holiday: the audit log is append-only');
END;
