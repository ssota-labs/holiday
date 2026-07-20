import type { IsoDate } from './account.js';
import { Err, Ok, type Result } from './result.js';

/**
 * Social-insurance enrollment intervals — observed membership, not journal.
 *
 * See ADR-011 / POLICY-023. Workplace deductions stay on income_settlement;
 * this table only answers "workplace / regional / voluntary, from when to when".
 */

export type InsuranceScheme = 'health' | 'national_pension';
export type InsuranceEnrollmentStatus = 'workplace' | 'regional' | 'voluntary';

export const INSURANCE_SCHEMES = ['health', 'national_pension'] as const;
export const INSURANCE_ENROLLMENT_STATUSES = ['workplace', 'regional', 'voluntary'] as const;

declare const VALIDATED: unique symbol;
type Validated = { readonly [VALIDATED]: true };

export type InsuranceEnrollmentId = string & { readonly __insuranceEnrollment: unique symbol };

export interface InsuranceEnrollmentFields {
  readonly id: InsuranceEnrollmentId;
  readonly scheme: InsuranceScheme;
  readonly status: InsuranceEnrollmentStatus;
  readonly startsOn: IsoDate;
  /** Null = open interval (still current). */
  readonly endsOn: IsoDate | null;
  readonly note: string | null;
  readonly createdAt: string;
  /**
   * When set, `addInsuranceEnrollment` must close this id (set ends_on) in the
   * same transaction before inserting the new row.
   */
  readonly closeId: InsuranceEnrollmentId | null;
  readonly closeEndsOn: IsoDate | null;
}

export type ValidatedInsuranceEnrollment = Validated & InsuranceEnrollmentFields;

export type InsuranceEnrollmentError =
  | { readonly code: 'invalid_scheme'; readonly scheme: string }
  | { readonly code: 'invalid_status'; readonly status: string }
  | {
      readonly code: 'invalid_status_for_scheme';
      readonly scheme: InsuranceScheme;
      readonly status: InsuranceEnrollmentStatus;
    }
  | { readonly code: 'invalid_date_order'; readonly startsOn: IsoDate; readonly endsOn: IsoDate }
  | {
      readonly code: 'overlap';
      readonly scheme: InsuranceScheme;
      readonly existingId: string;
      readonly existingStartsOn: IsoDate;
      readonly existingEndsOn: IsoDate | null;
    }
  | { readonly code: 'auto_close_impossible'; readonly reason: string };

export function describeInsuranceEnrollmentError(e: InsuranceEnrollmentError): string {
  switch (e.code) {
    case 'invalid_scheme':
      return `unknown scheme ${JSON.stringify(e.scheme)}; use health or national_pension`;
    case 'invalid_status':
      return `unknown status ${JSON.stringify(e.status)}; use workplace, regional, or voluntary`;
    case 'invalid_status_for_scheme':
      return `status ${e.status} is not allowed for scheme ${e.scheme}`;
    case 'invalid_date_order':
      return `starts_on ${e.startsOn} must be <= ends_on ${e.endsOn}`;
    case 'overlap':
      return (
        `scheme ${e.scheme} overlaps existing enrollment ${e.existingId} ` +
        `(${e.existingStartsOn}–${e.existingEndsOn ?? 'open'})`
      );
    case 'auto_close_impossible':
      return e.reason;
  }
}

export function isInsuranceScheme(s: string): s is InsuranceScheme {
  return (INSURANCE_SCHEMES as readonly string[]).includes(s);
}

export function isInsuranceEnrollmentStatus(s: string): s is InsuranceEnrollmentStatus {
  return (INSURANCE_ENROLLMENT_STATUSES as readonly string[]).includes(s);
}

export function statusAllowedForScheme(
  scheme: InsuranceScheme,
  status: InsuranceEnrollmentStatus,
): boolean {
  if (status === 'voluntary') return scheme === 'national_pension';
  return true;
}

/** Inclusive date-range overlap. Null end = +∞. */
export function enrollmentRangesOverlap(
  aStart: IsoDate,
  aEnd: IsoDate | null,
  bStart: IsoDate,
  bEnd: IsoDate | null,
): boolean {
  const aOpen = aEnd === null || aStart <= aEnd;
  const bOpen = bEnd === null || bStart <= bEnd;
  if (!aOpen || !bOpen) return false;
  const aEndsAfterBStarts = aEnd === null || aEnd >= bStart;
  const bEndsAfterAStarts = bEnd === null || bEnd >= aStart;
  return aEndsAfterBStarts && bEndsAfterAStarts;
}

/** Calendar day before `date` (UTC). */
export function dayBeforeIso(date: IsoDate): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10) as IsoDate;
}

export interface InsuranceEnrollmentCreateInput {
  readonly id: string;
  readonly scheme: InsuranceScheme;
  readonly status: InsuranceEnrollmentStatus;
  readonly startsOn: IsoDate;
  readonly endsOn?: IsoDate | null;
  readonly note?: string | null;
  readonly createdAt: string;
  /** Existing intervals for the same scheme (any status). Used for overlap. */
  readonly existing: readonly {
    readonly id: string;
    readonly startsOn: IsoDate;
    readonly endsOn: IsoDate | null;
  }[];
  /**
   * When true (default), a single open prior interval that starts before the
   * new startsOn is closed at day-before rather than rejected as overlap.
   */
  readonly autoCloseOpen?: boolean;
}

export const InsuranceEnrollment = {
  create(input: InsuranceEnrollmentCreateInput): Result<ValidatedInsuranceEnrollment, InsuranceEnrollmentError[]> {
    const errors: InsuranceEnrollmentError[] = [];
    const endsOn = input.endsOn ?? null;

    if (!statusAllowedForScheme(input.scheme, input.status)) {
      errors.push({
        code: 'invalid_status_for_scheme',
        scheme: input.scheme,
        status: input.status,
      });
    }
    if (endsOn !== null && input.startsOn > endsOn) {
      errors.push({
        code: 'invalid_date_order',
        startsOn: input.startsOn,
        endsOn,
      });
    }
    if (errors.length > 0) return Err(errors);

    const autoClose = input.autoCloseOpen !== false;
    let closeId: InsuranceEnrollmentId | null = null;
    let closeEndsOn: IsoDate | null = null;

    const effectiveExisting = input.existing.map((e) => ({ ...e }));

    if (autoClose) {
      const openPriors = effectiveExisting.filter(
        (e) => e.endsOn === null && e.startsOn < input.startsOn,
      );
      if (openPriors.length === 1) {
        const prior = openPriors[0]!;
        const proposedEnd = dayBeforeIso(input.startsOn);
        if (prior.startsOn > proposedEnd) {
          return Err([
            {
              code: 'auto_close_impossible',
              reason:
                `cannot auto-close enrollment ${prior.id}: starts_on ${prior.startsOn} ` +
                `would be after proposed ends_on ${proposedEnd}`,
            },
          ]);
        }
        closeId = prior.id as InsuranceEnrollmentId;
        closeEndsOn = proposedEnd;
        prior.endsOn = proposedEnd;
      } else if (openPriors.length > 1) {
        return Err([
          {
            code: 'auto_close_impossible',
            reason: `scheme has ${openPriors.length} open enrollments; close explicitly before adding`,
          },
        ]);
      }
    }

    for (const e of effectiveExisting) {
      if (enrollmentRangesOverlap(input.startsOn, endsOn, e.startsOn, e.endsOn)) {
        errors.push({
          code: 'overlap',
          scheme: input.scheme,
          existingId: e.id,
          existingStartsOn: e.startsOn,
          existingEndsOn: e.endsOn,
        });
      }
    }

    if (errors.length > 0) return Err(errors);

    const fields: InsuranceEnrollmentFields = {
      id: input.id as InsuranceEnrollmentId,
      scheme: input.scheme,
      status: input.status,
      startsOn: input.startsOn,
      endsOn,
      note: input.note ?? null,
      createdAt: input.createdAt,
      closeId,
      closeEndsOn,
    };
    return Ok(fields as ValidatedInsuranceEnrollment);
  },

  trustFromStorage(
    fields: Omit<InsuranceEnrollmentFields, 'closeId' | 'closeEndsOn'> & {
      closeId?: null;
      closeEndsOn?: null;
    },
  ): ValidatedInsuranceEnrollment {
    return {
      ...fields,
      closeId: null,
      closeEndsOn: null,
    } as ValidatedInsuranceEnrollment;
  },
};

/** Whether an enrollment covers `asOf` (inclusive). */
export function enrollmentCovers(e: { startsOn: IsoDate; endsOn: IsoDate | null }, asOf: IsoDate): boolean {
  if (asOf < e.startsOn) return false;
  if (e.endsOn !== null && asOf > e.endsOn) return false;
  return true;
}
