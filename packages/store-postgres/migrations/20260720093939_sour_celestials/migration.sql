CREATE TABLE "insurance_contribution" (
	"id" text PRIMARY KEY,
	"year_month" text NOT NULL,
	"recorded_on" text NOT NULL,
	"revision" integer NOT NULL,
	"status" text NOT NULL,
	"commodity" text NOT NULL,
	"note" text,
	"source_path" text,
	"source_sha256" text,
	"created_at" text NOT NULL,
	CONSTRAINT "insurance_contribution_status_enum" CHECK ("status" IN ('current','superseded')),
	CONSTRAINT "insurance_contribution_revision_positive" CHECK ("revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "insurance_contribution_line" (
	"contribution_id" text,
	"kind" text,
	"amount_minor" bigint NOT NULL,
	CONSTRAINT "insurance_contribution_line_pk" PRIMARY KEY("contribution_id","kind"),
	CONSTRAINT "insurance_contribution_line_kind_enum" CHECK ("kind" IN ('national_pension','health_insurance','long_term_care')),
	CONSTRAINT "insurance_contribution_line_amount_nonneg" CHECK ("amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "insurance_enrollment" (
	"id" text PRIMARY KEY,
	"scheme" text NOT NULL,
	"status" text NOT NULL,
	"starts_on" text NOT NULL,
	"ends_on" text,
	"note" text,
	"created_at" text NOT NULL,
	CONSTRAINT "insurance_enrollment_scheme_enum" CHECK ("scheme" IN ('health','national_pension')),
	CONSTRAINT "insurance_enrollment_status_enum" CHECK ("status" IN ('workplace','regional','voluntary')),
	CONSTRAINT "insurance_enrollment_voluntary_pension" CHECK (NOT ("status" = 'voluntary' AND "scheme" != 'national_pension')),
	CONSTRAINT "insurance_enrollment_date_order" CHECK ("ends_on" IS NULL OR "starts_on" <= "ends_on")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "insurance_contribution_unique" ON "insurance_contribution" ("year_month","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "insurance_contribution_one_current" ON "insurance_contribution" ("year_month") WHERE "status" = 'current';--> statement-breakpoint
CREATE INDEX "insurance_contribution_by_month" ON "insurance_contribution" ("year_month");--> statement-breakpoint
CREATE INDEX "insurance_enrollment_by_scheme" ON "insurance_enrollment" ("scheme");--> statement-breakpoint
CREATE INDEX "insurance_enrollment_by_starts" ON "insurance_enrollment" ("starts_on");--> statement-breakpoint
ALTER TABLE "insurance_contribution" ADD CONSTRAINT "insurance_contribution_commodity_commodity_code_fkey" FOREIGN KEY ("commodity") REFERENCES "commodity"("code");--> statement-breakpoint
ALTER TABLE "insurance_contribution_line" ADD CONSTRAINT "insurance_contribution_line_JRdluMcuBCkJ_fkey" FOREIGN KEY ("contribution_id") REFERENCES "insurance_contribution"("id") ON DELETE CASCADE;