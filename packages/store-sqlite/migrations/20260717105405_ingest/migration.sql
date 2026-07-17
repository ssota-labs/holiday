CREATE TABLE `ingest_batch` (
	`id` text PRIMARY KEY,
	`source_sha256` text NOT NULL UNIQUE,
	`source_name` text,
	`submitted_at` text NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ingest_batch_count_nonneg" CHECK("item_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE `ingest_item` (
	`id` text PRIMARY KEY,
	`batch_id` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`dedupe_authority` text NOT NULL,
	`external_ref` text,
	`merchant` text,
	`txn_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reason` text,
	`parsed_json` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_ingest_item_batch_id_ingest_batch_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `ingest_batch`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_ingest_item_txn_id_txn_id_fk` FOREIGN KEY (`txn_id`) REFERENCES `txn`(`id`),
	CONSTRAINT "ingest_item_status_enum" CHECK("status" IN ('pending','accepted','rejected')),
	CONSTRAINT "ingest_item_authority_enum" CHECK("dedupe_authority" IN ('image','external_ref','natural'))
);
--> statement-breakpoint
CREATE INDEX `ingest_item_by_dedupe` ON `ingest_item` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `ingest_item_by_batch` ON `ingest_item` (`batch_id`);