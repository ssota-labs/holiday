import type { AmountFactory } from './amount.js';
import type { CommodityCode } from './commodity.js';
import type { IsoDate } from './account.js';
import { Err, Ok, type Result } from './result.js';

/**
 * Direct-pay social-insurance contribution for a calendar month.
 *
 * Observed notice amounts only — no rate estimation (ADR-011 / POLICY-023).
 * Workplace withholdings stay on income_settlement; do not duplicate them here.
 */

export type InsuranceContributionKind =
  | 'national_pension'
  | 'health_insurance'
  | 'long_term_care';

export type InsuranceContributionStatus = 'current' | 'superseded';

export const INSURANCE_CONTRIBUTION_KINDS = [
  'national_pension',
  'health_insurance',
  'long_term_care',
] as const;

declare const VALIDATED: unique symbol;
type Validated = { readonly [VALIDATED]: true };

export type InsuranceContributionId = string & { readonly __insuranceContribution: unique symbol };

/** `YYYY-MM` billing month. */
export type YearMonth = string & { readonly __yearMonth: unique symbol };

const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isYearMonth(s: string): s is YearMonth {
  if (!YEAR_MONTH_RE.test(s)) return false;
  const [y, m] = s.split('-').map(Number) as [number, number];
  // Reject impossible months already covered by regex; keep year sane.
  return y >= 2000 && y <= 2100 && m >= 1 && m <= 12;
}

export function assertYearMonth(s: string): YearMonth {
  if (!isYearMonth(s)) {
    throw new TypeError(`not a valid year-month (YYYY-MM): ${JSON.stringify(s)}`);
  }
  return s;
}

export function isInsuranceContributionKind(s: string): s is InsuranceContributionKind {
  return (INSURANCE_CONTRIBUTION_KINDS as readonly string[]).includes(s);
}

export interface InsuranceContributionLine {
  readonly kind: InsuranceContributionKind;
  readonly amountMinor: bigint;
}

export interface InsuranceContributionFields {
  readonly id: InsuranceContributionId;
  readonly yearMonth: YearMonth;
  readonly recordedOn: IsoDate;
  readonly revision: number;
  readonly status: InsuranceContributionStatus;
  readonly commodity: CommodityCode;
  readonly note: string | null;
  readonly sourcePath: string | null;
  readonly sourceSha256: string | null;
  readonly createdAt: string;
  readonly lines: readonly InsuranceContributionLine[];
  /** When set, store must supersede this id in the same transaction. */
  readonly supersedeId: InsuranceContributionId | null;
}

export type ValidatedInsuranceContribution = Validated & InsuranceContributionFields;

export interface InsuranceContributionHeader {
  readonly id: InsuranceContributionId;
  readonly yearMonth: YearMonth;
  readonly recordedOn: IsoDate;
  readonly revision: number;
  readonly status: InsuranceContributionStatus;
  readonly commodity: CommodityCode;
  readonly note: string | null;
  readonly sourcePath: string | null;
  readonly sourceSha256: string | null;
  readonly createdAt: string;
}

export interface InsuranceContributionDetail extends InsuranceContributionHeader {
  readonly lines: readonly InsuranceContributionLine[];
}

export type InsuranceContributionError =
  | { readonly code: 'invalid_year_month'; readonly yearMonth: string }
  | { readonly code: 'invalid_revision'; readonly revision: number }
  | { readonly code: 'empty_lines' }
  | { readonly code: 'unknown_kind'; readonly kind: string }
  | { readonly code: 'duplicate_kind'; readonly kind: InsuranceContributionKind }
  | { readonly code: 'number_not_allowed'; readonly kind: string }
  | { readonly code: 'invalid_amount'; readonly kind: string; readonly reason: string }
  | { readonly code: 'negative_amount'; readonly kind: InsuranceContributionKind }
  | { readonly code: 'amend_requires_previous' };

export function describeInsuranceContributionError(e: InsuranceContributionError): string {
  switch (e.code) {
    case 'invalid_year_month':
      return `year_month must be YYYY-MM in 2000–2100, got ${JSON.stringify(e.yearMonth)}`;
    case 'invalid_revision':
      return `revision must be >= 1, got ${e.revision}`;
    case 'empty_lines':
      return 'contribution needs at least one line';
    case 'unknown_kind':
      return (
        `unknown contribution kind ${JSON.stringify(e.kind)}; ` +
        `use ${INSURANCE_CONTRIBUTION_KINDS.join(', ')}`
      );
    case 'duplicate_kind':
      return `duplicate contribution kind ${e.kind}`;
    case 'number_not_allowed':
      return `line ${e.kind} amount must be a decimal string, not a JSON number`;
    case 'invalid_amount':
      return `line ${e.kind}: ${e.reason}`;
    case 'negative_amount':
      return `line ${e.kind} amount must be >= 0`;
    case 'amend_requires_previous':
      return 'amend needs a previous current contribution for the same year_month';
  }
}

export interface InsuranceContributionLineInput {
  readonly kind: string;
  readonly amount: string;
}

export interface InsuranceContributionCreateInput {
  readonly id: string;
  readonly yearMonth: string;
  readonly recordedOn: IsoDate;
  readonly revision?: number;
  readonly commodity: CommodityCode;
  readonly note?: string | null;
  readonly sourcePath?: string | null;
  readonly sourceSha256?: string | null;
  readonly createdAt: string;
  readonly lines: readonly InsuranceContributionLineInput[];
  readonly amounts: AmountFactory;
  readonly supersedeId?: string | null;
}

export interface InsuranceContributionAmendInput {
  readonly id: string;
  readonly previous: InsuranceContributionHeader;
  readonly recordedOn: IsoDate;
  readonly commodity: CommodityCode;
  readonly note?: string | null;
  readonly sourcePath?: string | null;
  readonly sourceSha256?: string | null;
  readonly createdAt: string;
  readonly lines: readonly InsuranceContributionLineInput[];
  readonly amounts: AmountFactory;
}

export const InsuranceContribution = {
  create(
    input: InsuranceContributionCreateInput,
  ): Result<ValidatedInsuranceContribution, InsuranceContributionError[]> {
    const errors: InsuranceContributionError[] = [];
    const revision = input.revision ?? 1;

    if (!isYearMonth(input.yearMonth)) {
      errors.push({ code: 'invalid_year_month', yearMonth: input.yearMonth });
    }
    if (!Number.isInteger(revision) || revision < 1) {
      errors.push({ code: 'invalid_revision', revision });
    }
    if (input.lines.length === 0) {
      errors.push({ code: 'empty_lines' });
    }

    const seen = new Set<InsuranceContributionKind>();
    const lines: InsuranceContributionLine[] = [];

    for (const raw of input.lines) {
      if (typeof raw.amount !== 'string') {
        errors.push({ code: 'number_not_allowed', kind: String(raw.kind) });
        continue;
      }
      if (!isInsuranceContributionKind(raw.kind)) {
        errors.push({ code: 'unknown_kind', kind: raw.kind });
        continue;
      }
      if (seen.has(raw.kind)) {
        errors.push({ code: 'duplicate_kind', kind: raw.kind });
        continue;
      }
      seen.add(raw.kind);
      try {
        const amountMinor = input.amounts.parse(raw.amount, input.commodity).minor;
        if (amountMinor < 0n) {
          errors.push({ code: 'negative_amount', kind: raw.kind });
          continue;
        }
        lines.push({ kind: raw.kind, amountMinor });
      } catch (e) {
        errors.push({
          code: 'invalid_amount',
          kind: raw.kind,
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (errors.length > 0) return Err(errors);

    const fields: InsuranceContributionFields = {
      id: input.id as InsuranceContributionId,
      yearMonth: input.yearMonth as YearMonth,
      recordedOn: input.recordedOn,
      revision,
      status: 'current',
      commodity: input.commodity,
      note: input.note ?? null,
      sourcePath: input.sourcePath ?? null,
      sourceSha256: input.sourceSha256 ?? null,
      createdAt: input.createdAt,
      lines,
      supersedeId: (input.supersedeId as InsuranceContributionId | null | undefined) ?? null,
    };
    return Ok(fields as ValidatedInsuranceContribution);
  },

  amend(
    input: InsuranceContributionAmendInput,
  ): Result<ValidatedInsuranceContribution, InsuranceContributionError[]> {
    if (input.previous.status !== 'current') {
      return Err([{ code: 'amend_requires_previous' }]);
    }
    return InsuranceContribution.create({
      id: input.id,
      yearMonth: input.previous.yearMonth,
      recordedOn: input.recordedOn,
      revision: input.previous.revision + 1,
      commodity: input.commodity,
      note: input.note ?? null,
      sourcePath: input.sourcePath ?? null,
      sourceSha256: input.sourceSha256 ?? null,
      createdAt: input.createdAt,
      lines: input.lines,
      amounts: input.amounts,
      supersedeId: input.previous.id,
    });
  },

  trustFromStorage(fields: InsuranceContributionFields): ValidatedInsuranceContribution {
    return fields as ValidatedInsuranceContribution;
  },
};

export function headerOfInsuranceContribution(
  r: InsuranceContributionFields | InsuranceContributionDetail | ValidatedInsuranceContribution,
): InsuranceContributionHeader {
  return {
    id: r.id,
    yearMonth: r.yearMonth,
    recordedOn: r.recordedOn,
    revision: r.revision,
    status: r.status,
    commodity: r.commodity,
    note: r.note,
    sourcePath: r.sourcePath,
    sourceSha256: r.sourceSha256,
    createdAt: r.createdAt,
  };
}
