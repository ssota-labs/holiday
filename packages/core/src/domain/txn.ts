import type { AccountId, IsoDate } from './account.js';
import { type Amount, inI64Range } from './amount.js';
import type { CommodityCode } from './commodity.js';
import type { Ulid } from './ids.js';
import { Err, Ok, type Result } from './result.js';

export type TxnId = Ulid & { readonly __txn: unique symbol };

/**
 * Where a posting's KRW measurement came from. This is load-bearing for trust:
 * a balance built from `rate` weights is provisional in a way a balance built
 * from `actual` weights is not, and the reporting layer says so.
 */
export type WeightSource =
  /** commodity === booking commodity; weight === units. Trivially true. */
  | 'identity'
  /** Both sides observed (bank shows -₩1,000,000; Wise shows +$750). The rate is a FACT. */
  | 'actual'
  /** Only one side observed. Weight derived from a rate table. Marks the txn fx_estimated. */
  | 'rate'
  /** The FX residual line — i.e. the spread. See `plug` handling below. */
  | 'plug';

export type PostingKind = 'normal' | 'fx_revaluation' | 'rounding';

declare const VALIDATED: unique symbol;

/**
 * A phantom brand: it exists in the type system and has no runtime representation
 * at all. That is deliberate — a real symbol key would have to survive every
 * clone, codec, and canonical-JSON pass in the system, and it would earn nothing
 * for the trouble.
 */
type Validated = { readonly [VALIDATED]: true };

/**
 * A transaction that has been proven balanced.
 *
 * Constructible ONLY via `Txn.create()`. This is a soft brand: it documents the
 * contract and defeats accidents, not deliberate casts. The SQLite trigger is
 * what defeats malice — see plan §2, the four rings.
 *
 * The point of the brand is that `LedgerStore.appendTxn(tx: ValidatedTxn)` does
 * not need to re-derive the balance. Its only obligation is atomicity. If every
 * adapter re-checked, we'd have as many definitions of "balanced" as adapters.
 */
export type ValidatedTxn = Validated & TxnFields;

export interface TxnFields {
  readonly id: TxnId;
  readonly date: IsoDate;
  /** Always the book's functional currency. See plan Risk 1. */
  readonly bookingCommodity: CommodityCode;
  readonly payee: string | null;
  readonly narration: string;
  readonly systemKind: SystemKind | null;
  readonly correctsTxnId: TxnId | null;
  readonly sourceItemId: string | null;
  /** True when any posting's weight came from a rate rather than an observation. */
  readonly fxEstimated: boolean;
  readonly tags: readonly string[];
  readonly meta: Readonly<Record<string, unknown>>;
  readonly postings: readonly ValidatedPosting[];
}

export type SystemKind = 'fx_revaluation' | 'closing_entry' | 'opening_balance';

export interface ValidatedPosting {
  readonly seq: number;
  readonly accountId: AccountId;
  /** The FACT: what actually moved, in its own commodity. */
  readonly units: Amount;
  /** The MEASUREMENT: the same movement expressed in the booking commodity. */
  readonly weightMinor: bigint;
  readonly weightSource: WeightSource;
  /** Audit only — never the source of truth for balancing. */
  readonly fxRateText: string | null;
  readonly fxRateId: string | null;
  /** Nullable seam for lot/cost-basis tracking. Balancing NEVER consults it. */
  readonly lotId: string | null;
  readonly kind: PostingKind;
  readonly memo: string | null;
}

export interface PostingInput {
  readonly accountId: AccountId;
  readonly units: Amount;
  /**
   * Required unless `units.commodity === bookingCommodity`, in which case it is
   * derived (and must equal `units.minor` if supplied).
   */
  readonly weightMinor?: bigint;
  readonly weightSource?: WeightSource;
  readonly fxRateText?: string | null;
  readonly fxRateId?: string | null;
  readonly lotId?: string | null;
  readonly kind?: PostingKind;
  readonly memo?: string | null;
}

export interface TxnInput {
  readonly id: TxnId;
  readonly date: IsoDate;
  readonly bookingCommodity: CommodityCode;
  readonly payee?: string | null;
  readonly narration?: string;
  readonly systemKind?: SystemKind | null;
  readonly correctsTxnId?: TxnId | null;
  readonly sourceItemId?: string | null;
  readonly tags?: readonly string[];
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly postings: readonly PostingInput[];
}

export type TxnError =
  | { readonly code: 'too_few_postings'; readonly count: number }
  | { readonly code: 'unbalanced'; readonly residualMinor: bigint; readonly bookingCommodity: CommodityCode }
  | { readonly code: 'weight_required'; readonly seq: number; readonly commodity: CommodityCode }
  | {
      readonly code: 'identity_weight_mismatch';
      readonly seq: number;
      readonly unitsMinor: bigint;
      readonly weightMinor: bigint;
    }
  | { readonly code: 'identity_source_mismatch'; readonly seq: number; readonly weightSource: WeightSource }
  | { readonly code: 'weight_out_of_range'; readonly seq: number; readonly weightMinor: bigint }
  | { readonly code: 'sum_out_of_range'; readonly sumMinor: bigint }
  | { readonly code: 'plug_not_in_booking_commodity'; readonly seq: number; readonly commodity: CommodityCode };

export function describeTxnError(e: TxnError): string {
  switch (e.code) {
    case 'too_few_postings':
      return `a transaction needs at least 2 postings, got ${e.count}`;
    case 'unbalanced':
      return (
        `postings do not balance: they sum to ${e.residualMinor} ${e.bookingCommodity} minor units, ` +
        `and must sum to exactly 0. There is no tolerance in this system by design — ` +
        `if this is an FX spread, book it explicitly to an Expenses:FX account.`
      );
    case 'weight_required':
      return (
        `posting ${e.seq} is in ${e.commodity}, not the booking commodity, so its weight ` +
        `cannot be inferred and must be supplied explicitly`
      );
    case 'identity_weight_mismatch':
      return (
        `posting ${e.seq} is already in the booking commodity, so its weight must equal its units ` +
        `(units=${e.unitsMinor}, weight=${e.weightMinor})`
      );
    case 'identity_source_mismatch':
      return `posting ${e.seq} is in the booking commodity, so weightSource must be 'identity', got '${e.weightSource}'`;
    case 'weight_out_of_range':
      return `posting ${e.seq} weight ${e.weightMinor} is outside the representable i64 range`;
    case 'sum_out_of_range':
      return `the sum of posting weights (${e.sumMinor}) overflowed the i64 range`;
    case 'plug_not_in_booking_commodity':
      return `posting ${e.seq} is a plug, which must be denominated in the booking commodity, got ${e.commodity}`;
  }
}

export const Txn = {
  /**
   * The real gate. Pure, synchronous, I/O-free — property-testable with zero mocks.
   *
   * The balance rule:
   *
   *     SUM(weight_minor) = 0, exactly, in integer arithmetic.
   *
   * Note what is NOT here: a tolerance. Deriving a counter-amount by multiplying
   * a stored rate is lossy at integer scale (₩1,000,000 → $750.00 implies
   * 1333.3333…; multiply back and you get ₩999,998), and the usual fix is to
   * invent a tolerance — which then masks errors at exactly the magnitude worth
   * catching, like a missing ₩50 wire fee. So weights are stored as facts, rates
   * are derived for display, and two i64s summing to zero is exact.
   *
   * Returns every error at once rather than throwing on the first, because the
   * caller is usually rendering a review screen to a human.
   */
  create(input: TxnInput): Result<ValidatedTxn, TxnError[]> {
    const errors: TxnError[] = [];
    const { bookingCommodity } = input;

    if (input.postings.length < 2) {
      errors.push({ code: 'too_few_postings', count: input.postings.length });
    }

    const postings: ValidatedPosting[] = [];
    let sum = 0n;
    let fxEstimated = false;

    input.postings.forEach((p, i) => {
      const seq = i;
      const isBooking = p.units.commodity === bookingCommodity;

      let weightMinor: bigint;
      let weightSource: WeightSource;

      if (isBooking) {
        // The identity rule. Weight is not free to disagree with units here.
        weightSource = p.weightSource ?? 'identity';
        if (p.weightSource !== undefined && p.weightSource !== 'identity' && p.weightSource !== 'plug') {
          errors.push({ code: 'identity_source_mismatch', seq, weightSource: p.weightSource });
        }
        weightMinor = p.weightMinor ?? p.units.minor;
        if (weightMinor !== p.units.minor) {
          errors.push({ code: 'identity_weight_mismatch', seq, unitsMinor: p.units.minor, weightMinor });
        }
      } else {
        if (p.weightSource === 'plug') {
          // A plug is the FX residual and is by definition a booking-commodity line.
          errors.push({ code: 'plug_not_in_booking_commodity', seq, commodity: p.units.commodity });
        }
        if (p.weightMinor === undefined) {
          errors.push({ code: 'weight_required', seq, commodity: p.units.commodity });
          weightMinor = 0n;
          weightSource = p.weightSource ?? 'rate';
        } else {
          weightMinor = p.weightMinor;
          weightSource = p.weightSource ?? 'rate';
        }
      }

      if (!inI64Range(weightMinor)) {
        errors.push({ code: 'weight_out_of_range', seq, weightMinor });
      }
      sum += weightMinor;
      if (weightSource === 'rate') fxEstimated = true;

      postings.push({
        seq,
        accountId: p.accountId,
        units: p.units,
        weightMinor,
        weightSource,
        fxRateText: p.fxRateText ?? null,
        fxRateId: p.fxRateId ?? null,
        lotId: p.lotId ?? null,
        kind: p.kind ?? 'normal',
        memo: p.memo ?? null,
      });
    });

    if (!inI64Range(sum)) {
      errors.push({ code: 'sum_out_of_range', sumMinor: sum });
    } else if (sum !== 0n) {
      errors.push({ code: 'unbalanced', residualMinor: sum, bookingCommodity });
    }

    if (errors.length > 0) return Err(errors);

    const fields: TxnFields = {
      id: input.id,
      date: input.date,
      bookingCommodity,
      payee: input.payee ?? null,
      narration: input.narration ?? '',
      systemKind: input.systemKind ?? null,
      correctsTxnId: input.correctsTxnId ?? null,
      sourceItemId: input.sourceItemId ?? null,
      fxEstimated,
      tags: Object.freeze([...(input.tags ?? [])].sort()),
      meta: Object.freeze({ ...(input.meta ?? {}) }),
      postings: Object.freeze(postings),
    };
    // The only sanctioned cast. Everything above this line is the proof.
    return Ok(fields as ValidatedTxn);
  },

  /**
   * Re-attach the brand to a transaction loaded from storage.
   *
   * Adapters need this because rows come back as plain data. It is deliberately
   * named to be conspicuous in review: it asserts the balance rule rather than
   * checking it, and it is only sound because the storage trigger already
   * rejected anything unbalanced on the way in. Never call it on agent input —
   * that is what `create()` is for.
   */
  trustFromStorage(fields: TxnFields): ValidatedTxn {
    return fields as ValidatedTxn;
  },
} as const;

/**
 * The residual left when no leg is in the booking commodity — e.g. USD→JPY, where
 * two independently-sourced rates do not cross-multiply to zero.
 *
 * This residual is NOT an error: it is the FX spread. Beancount would balance the
 * transaction via `@@` and the spread would vanish silently into the implied rate.
 * For a tool whose job is partly "where is your money leaking", surfacing it on the
 * income statement is the right call — so callers compute it and post it explicitly.
 */
export function residualOf(postings: readonly PostingInput[], bookingCommodity: CommodityCode): bigint {
  let sum = 0n;
  for (const p of postings) {
    sum += p.units.commodity === bookingCommodity ? (p.weightMinor ?? p.units.minor) : (p.weightMinor ?? 0n);
  }
  return sum;
}
