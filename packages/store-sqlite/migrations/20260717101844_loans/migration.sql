CREATE TABLE `loan` (
	`account_id` text PRIMARY KEY,
	`funding_account_id` text NOT NULL,
	`interest_account_id` text NOT NULL,
	`principal_minor` integer NOT NULL,
	`commodity` text NOT NULL,
	`annual_rate_text` text NOT NULL,
	`method` text NOT NULL,
	`term_months` integer NOT NULL,
	`first_payment_date` text NOT NULL,
	`payment_day` integer NOT NULL,
	`label` text,
	CONSTRAINT `fk_loan_account_id_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_loan_funding_account_id_account_id_fk` FOREIGN KEY (`funding_account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_loan_interest_account_id_account_id_fk` FOREIGN KEY (`interest_account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_loan_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),
	CONSTRAINT "loan_principal_positive" CHECK("principal_minor" > 0),
	CONSTRAINT "loan_term_positive" CHECK("term_months" >= 1),
	CONSTRAINT "loan_method_enum" CHECK("method" IN ('annuity','equal_principal','bullet','interest_only')),
	CONSTRAINT "loan_payment_day_range" CHECK("payment_day" = -1 OR "payment_day" BETWEEN 1 AND 31),
	CONSTRAINT "loan_accounts_differ" CHECK("account_id" <> "funding_account_id")
);
--> statement-breakpoint
CREATE TABLE `loan_schedule_row` (
	`loan_id` text NOT NULL,
	`seq` integer NOT NULL,
	`due_date` text NOT NULL,
	`opening_minor` integer NOT NULL,
	`principal_minor` integer NOT NULL,
	`interest_minor` integer NOT NULL,
	`closing_minor` integer NOT NULL,
	CONSTRAINT `loan_schedule_row_pk` PRIMARY KEY(`loan_id`, `seq`),
	CONSTRAINT `fk_loan_schedule_row_loan_id_loan_account_id_fk` FOREIGN KEY (`loan_id`) REFERENCES `loan`(`account_id`) ON DELETE CASCADE,
	CONSTRAINT "loan_schedule_seq_positive" CHECK("seq" >= 1)
);
--> statement-breakpoint
CREATE INDEX `loan_schedule_by_date` ON `loan_schedule_row` (`due_date`);