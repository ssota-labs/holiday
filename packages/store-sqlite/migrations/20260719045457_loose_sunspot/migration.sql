CREATE TABLE `income_source` (
	`id` text PRIMARY KEY,
	`label` text NOT NULL UNIQUE,
	`income_account_id` text NOT NULL,
	`deposit_account_id` text NOT NULL,
	`regime` text NOT NULL,
	`commodity` text NOT NULL,
	`active_from` text NOT NULL,
	`active_to` text,
	CONSTRAINT `fk_income_source_income_account_id_account_id_fk` FOREIGN KEY (`income_account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_income_source_deposit_account_id_account_id_fk` FOREIGN KEY (`deposit_account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_income_source_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),
	CONSTRAINT "income_source_regime_enum" CHECK("regime" IN ('business_withholding','business_vat','salary','allowance'))
);
--> statement-breakpoint
CREATE TABLE `income_settlement` (
	`id` text PRIMARY KEY,
	`source_id` text NOT NULL,
	`paid_on` text NOT NULL,
	`gross_minor` integer NOT NULL,
	`net_minor` integer NOT NULL,
	`commodity` text NOT NULL,
	`statute_as_of` text NOT NULL,
	`txn_id` text,
	`label` text,
	CONSTRAINT `fk_income_settlement_source_id_income_source_id_fk` FOREIGN KEY (`source_id`) REFERENCES `income_source`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_income_settlement_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),
	CONSTRAINT `fk_income_settlement_txn_id_txn_id_fk` FOREIGN KEY (`txn_id`) REFERENCES `txn`(`id`),
	CONSTRAINT "income_settlement_gross_positive" CHECK("gross_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE `income_settlement_line` (
	`settlement_id` text NOT NULL,
	`seq` integer NOT NULL,
	`kind` text NOT NULL,
	`amount_minor` integer NOT NULL,
	CONSTRAINT `income_settlement_line_pk` PRIMARY KEY(`settlement_id`, `seq`),
	CONSTRAINT `fk_income_settlement_line_settlement_id_income_settlement_id_fk` FOREIGN KEY (`settlement_id`) REFERENCES `income_settlement`(`id`) ON DELETE CASCADE,
	CONSTRAINT "income_settlement_line_seq_positive" CHECK("seq" >= 1),
	CONSTRAINT "income_settlement_line_amount_nonneg" CHECK("amount_minor" >= 0),
	CONSTRAINT "income_settlement_line_kind_enum" CHECK("kind" IN ('income_tax_3','local_tax_0_3','vat_10','national_pension','health_insurance','long_term_care','employment_insurance','earned_income_tax','local_income_tax'))
);
--> statement-breakpoint
CREATE INDEX `income_source_by_income` ON `income_source` (`income_account_id`);--> statement-breakpoint
CREATE INDEX `income_settlement_by_source` ON `income_settlement` (`source_id`);--> statement-breakpoint
CREATE INDEX `income_settlement_by_date` ON `income_settlement` (`paid_on`);
