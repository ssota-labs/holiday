CREATE TABLE `recurring_income` (
	`id` text PRIMARY KEY,
	`label` text NOT NULL,
	`income_account_id` text NOT NULL,
	`deposit_account_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`commodity` text NOT NULL,
	`cadence_kind` text NOT NULL,
	`day_of_month` integer NOT NULL,
	`month` integer,
	`active_from` text NOT NULL,
	`active_to` text,
	CONSTRAINT `fk_recurring_income_income_account_id_account_id_fk` FOREIGN KEY (`income_account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_recurring_income_deposit_account_id_account_id_fk` FOREIGN KEY (`deposit_account_id`) REFERENCES `account`(`id`),
	CONSTRAINT `fk_recurring_income_commodity_commodity_code_fk` FOREIGN KEY (`commodity`) REFERENCES `commodity`(`code`),
	CONSTRAINT "recurring_income_amount_positive" CHECK("amount_minor" > 0),
	CONSTRAINT "recurring_income_cadence_enum" CHECK("cadence_kind" IN ('monthly','yearly')),
	CONSTRAINT "recurring_income_day_range" CHECK("day_of_month" = -1 OR "day_of_month" BETWEEN 1 AND 31),
	CONSTRAINT "recurring_income_month_range" CHECK("month" IS NULL OR "month" BETWEEN 1 AND 12),
	CONSTRAINT "recurring_income_yearly_needs_month" CHECK("cadence_kind" <> 'yearly' OR "month" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `recurring_income_by_deposit` ON `recurring_income` (`deposit_account_id`);