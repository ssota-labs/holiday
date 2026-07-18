CREATE TABLE `rule` (
	`id` text PRIMARY KEY,
	`pattern` text NOT NULL,
	`match` text DEFAULT 'contains' NOT NULL,
	`category` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "rule_match_kind" CHECK("match" IN ('contains', 'regex'))
);
