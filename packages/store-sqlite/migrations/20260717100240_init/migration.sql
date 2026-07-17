CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`parent_id` text,
	`commodity` text,
	`monetary` integer DEFAULT 1 NOT NULL,
	`cash` integer DEFAULT 0 NOT NULL,
	`placeholder` integer DEFAULT 0 NOT NULL,
	`opened_on` text NOT NULL,
	`closed_on` text,
	CONSTRAINT `fk_account_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),
	CONSTRAINT "account_type_enum" CHECK("type" IN ('asset','liability','equity','income','expense')),
	CONSTRAINT "account_monetary_bool" CHECK("monetary" IN (0,1)),
	CONSTRAINT "account_cash_bool" CHECK("cash" IN (0,1)),
	CONSTRAINT "account_placeholder_bool" CHECK("placeholder" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`seq` integer PRIMARY KEY,
	`at` text NOT NULL,
	`event` text NOT NULL,
	`subject` text NOT NULL,
	`detail` text DEFAULT '{}' NOT NULL,
	`prev_hash` text NOT NULL,
	`hash` text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE `book` (
	`id` text PRIMARY KEY,
	`schema_version` integer NOT NULL,
	`functional_currency` text NOT NULL,
	`close_grain` text DEFAULT 'month' NOT NULL,
	`timezone` text DEFAULT 'Asia/Seoul' NOT NULL,
	`dedupe_key_version` integer DEFAULT 1 NOT NULL,
	`fx_max_staleness_days` integer DEFAULT 7 NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_book_functional_currency_commodity_code_fk` FOREIGN KEY (`functional_currency`) REFERENCES `commodity`(`code`),
	CONSTRAINT "book_singleton" CHECK("id" = 'book'),
	CONSTRAINT "book_close_grain_enum" CHECK("close_grain" IN ('day','week','month','quarter','year'))
);
--> statement-breakpoint
CREATE TABLE `card` (
	`account_id` text PRIMARY KEY,
	`funding_account_id` text NOT NULL,
	`cycle_close_day` integer NOT NULL,
	`payment_month_offset` integer NOT NULL,
	`payment_day` integer NOT NULL,
	`label` text,
	CONSTRAINT `fk_card_account_id_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_card_funding_account_id_account_id_fk` FOREIGN KEY (`funding_account_id`) REFERENCES `account`(`id`),
	CONSTRAINT "card_close_day_range" CHECK("cycle_close_day" BETWEEN 1 AND 31),
	CONSTRAINT "card_offset_range" CHECK("payment_month_offset" BETWEEN 0 AND 3),
	CONSTRAINT "card_payment_day_range" CHECK("payment_day" = -1 OR "payment_day" BETWEEN 1 AND 31)
);
--> statement-breakpoint
CREATE TABLE `command_log` (
	`idem_key` text PRIMARY KEY,
	`request_sha256` text NOT NULL,
	`response_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `commodity` (
	`code` text PRIMARY KEY,
	`exponent` integer NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	CONSTRAINT "commodity_exponent_range" CHECK("exponent" BETWEEN 0 AND 9),
	CONSTRAINT "commodity_kind_enum" CHECK("kind" IN ('fiat','crypto','security','unit'))
);
--> statement-breakpoint
CREATE TABLE `fx_rate` (
	`id` text PRIMARY KEY,
	`as_of` text NOT NULL,
	`base` text NOT NULL,
	`quote` text NOT NULL,
	`rate` text NOT NULL,
	`source` text NOT NULL,
	`fetched_at` text NOT NULL,
	CONSTRAINT `fk_fx_rate_base_commodity_code_fk` FOREIGN KEY (`base`) REFERENCES `commodity`(`code`),
	CONSTRAINT `fk_fx_rate_quote_commodity_code_fk` FOREIGN KEY (`quote`) REFERENCES `commodity`(`code`)
);
--> statement-breakpoint
CREATE TABLE `installment` (
	`id` text PRIMARY KEY,
	`card_account_id` text NOT NULL,
	`liability_account_id` text NOT NULL,
	`txn_id` text,
	`purchased_on` text NOT NULL,
	`months` integer NOT NULL,
	`total_minor` integer NOT NULL,
	`commodity` text NOT NULL,
	`interest_free` integer DEFAULT 1 NOT NULL,
	`label` text,
	CONSTRAINT `fk_installment_card_account_id_account_id_fk` FOREIGN KEY (`card_account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_installment_liability_account_id_account_id_fk` FOREIGN KEY (`liability_account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_installment_txn_id_txn_id_fk` FOREIGN KEY (`txn_id`) REFERENCES `txn`(`id`),
	CONSTRAINT `fk_installment_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),
	CONSTRAINT "installment_months_positive" CHECK("months" >= 1),
	CONSTRAINT "installment_total_positive" CHECK("total_minor" > 0),
	CONSTRAINT "installment_accounts_differ" CHECK("card_account_id" <> "liability_account_id"),
	CONSTRAINT "installment_interest_free_bool" CHECK("interest_free" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `installment_row` (
	`installment_id` text NOT NULL,
	`seq` integer NOT NULL,
	`payment_date` text NOT NULL,
	`principal_minor` integer NOT NULL,
	`fee_minor` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `installment_row_pk` PRIMARY KEY(`installment_id`, `seq`),
	CONSTRAINT `fk_installment_row_installment_id_installment_id_fk` FOREIGN KEY (`installment_id`) REFERENCES `installment`(`id`) ON DELETE CASCADE,
	CONSTRAINT "installment_row_seq_positive" CHECK("seq" >= 1)
);
--> statement-breakpoint
CREATE TABLE `period` (
	`id` text PRIMARY KEY,
	`grain` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	CONSTRAINT "period_grain_enum" CHECK("grain" IN ('day','week','month','quarter','year')),
	CONSTRAINT "period_status_enum" CHECK("status" IN ('open','closed','locked'))
);
--> statement-breakpoint
CREATE TABLE `posting` (
	`txn_id` text NOT NULL,
	`seq` integer NOT NULL,
	`account_id` text NOT NULL,
	`units_minor` integer NOT NULL,
	`commodity` text NOT NULL,
	`weight_minor` integer NOT NULL,
	`weight_source` text NOT NULL,
	`fx_rate_text` text,
	`fx_rate_id` text,
	`lot_id` text,
	`kind` text DEFAULT 'normal' NOT NULL,
	`memo` text,
	CONSTRAINT `posting_pk` PRIMARY KEY(`txn_id`, `seq`),
	CONSTRAINT `fk_posting_txn_id_txn_id_fk` FOREIGN KEY (`txn_id`) REFERENCES `txn`(`id`),
	CONSTRAINT `fk_posting_account_id_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_posting_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),
	CONSTRAINT "posting_weight_source_enum" CHECK("weight_source" IN ('identity','actual','rate','plug')),
	CONSTRAINT "posting_kind_enum" CHECK("kind" IN ('normal','fx_revaluation','rounding'))
);
--> statement-breakpoint
CREATE TABLE `recurring` (
	`id` text PRIMARY KEY,
	`label` text NOT NULL,
	`expense_account_id` text NOT NULL,
	`funding_account_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`commodity` text NOT NULL,
	`cadence_kind` text NOT NULL,
	`day_of_month` integer NOT NULL,
	`month` integer,
	`active_from` text NOT NULL,
	`active_to` text,
	CONSTRAINT `fk_recurring_expense_account_id_account_id_fk` FOREIGN KEY (`expense_account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_recurring_funding_account_id_account_id_fk` FOREIGN KEY (`funding_account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_recurring_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),
	CONSTRAINT "recurring_amount_positive" CHECK("amount_minor" > 0),
	CONSTRAINT "recurring_cadence_enum" CHECK("cadence_kind" IN ('monthly','yearly')),
	CONSTRAINT "recurring_day_range" CHECK("day_of_month" = -1 OR "day_of_month" BETWEEN 1 AND 31),
	CONSTRAINT "recurring_month_range" CHECK("month" IS NULL OR "month" BETWEEN 1 AND 12),
	CONSTRAINT "recurring_yearly_needs_month" CHECK("cadence_kind" <> 'yearly' OR "month" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE `txn` (
	`id` text PRIMARY KEY,
	`date` text NOT NULL,
	`booking_commodity` text NOT NULL,
	`payee` text,
	`narration` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`system_kind` text,
	`corrects_txn_id` text,
	`source_item_id` text,
	`fx_estimated` integer DEFAULT 0 NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`meta_json` text DEFAULT '{}' NOT NULL,
	`sealed` integer DEFAULT 0 NOT NULL,
	`reason` text,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_txn_booking_commodity_commodity_code_fk` FOREIGN KEY (`booking_commodity`) REFERENCES `commodity`(`code`),
	CONSTRAINT "txn_status_enum" CHECK("status" IN ('draft','posted','void','rejected')),
	CONSTRAINT "txn_system_kind_enum" CHECK("system_kind" IS NULL OR "system_kind" IN ('fx_revaluation','closing_entry','opening_balance')),
	CONSTRAINT "txn_fx_estimated_bool" CHECK("fx_estimated" IN (0,1)),
	CONSTRAINT "txn_sealed_bool" CHECK("sealed" IN (0,1))
);
--> statement-breakpoint
CREATE INDEX `account_by_code` ON `account` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `fx_rate_unique` ON `fx_rate` (`as_of`,`base`,`quote`,`source`);--> statement-breakpoint
CREATE INDEX `installment_by_card` ON `installment` (`card_account_id`);--> statement-breakpoint
CREATE INDEX `installment_row_by_date` ON `installment_row` (`payment_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `period_grain_start` ON `period` (`grain`,`start`);--> statement-breakpoint
CREATE INDEX `posting_by_account` ON `posting` (`account_id`);--> statement-breakpoint
CREATE INDEX `recurring_by_funding` ON `recurring` (`funding_account_id`);--> statement-breakpoint
CREATE INDEX `txn_by_date` ON `txn` (`date`,`id`);--> statement-breakpoint
CREATE INDEX `txn_by_status` ON `txn` (`status`);