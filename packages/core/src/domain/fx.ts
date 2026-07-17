import type { IsoDate } from './account.js';
import type { CommodityCode } from './commodity.js';
import { RATE_SCALE, roundDiv } from './rate.js';

/**
 * FX rates.
 *
 * The single most important property here is what rates CANNOT do: they can never
 * retroactively change a posted number. A weight is stored as a fact at write
 * time; a rate is only ever consulted to derive that weight once, or to revalue
 * at close. So a new rate arriving from a data source — or a correction to an old
 * one — cannot corrupt history. That falls straight out of the decision to store
 * counter-amounts instead of multiplying rates back out.
 *
 * Rates are decimal STRINGS in storage and scaled bigints in arithmetic. Never
 * floats. A float rate compounded or applied across a portfolio drifts, and this
 * is money.
 */

export interface FxRate {
  readonly id: string;
  readonly asOf: IsoDate;
  readonly base: CommodityCode;
  readonly quote: CommodityCode;
  /** Decimal string. 1 base = <rate> quote. */
  readonly rate: string;
  readonly source: string;
  readonly fetchedAt: string;
}

export class FxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FxError';
  }
}

const RATE_RE = /^(\d+)(?:\.(\d+))?$/;

/** Parse a rate string to a scaled bigint. Rejects anything that is not a plain decimal. */
export function parseRate(text: string): bigint {
  const m = RATE_RE.exec(text.trim());
  if (!m) {
    throw new FxError(
      `${JSON.stringify(text)} is not a plain decimal rate. No exponents, no separators, no currency symbols.`,
    );
  }
  const [, whole, frac = ''] = m;
  if (frac.length > 18) throw new FxError(`${text}: more than 18 decimal places in a rate is noise`);
  const scaled = BigInt(`${whole}${frac.padEnd(18, '0')}`);
  if (scaled === 0n) throw new FxError('a zero exchange rate is not a rate');
  return scaled;
}

export function formatRate(scaled: bigint, places = 6): string {
  const divisor = RATE_SCALE / 10n ** BigInt(places);
  const v = roundDiv(scaled, divisor);
  const s = v.toString().padStart(places + 1, '0');
  const cut = s.length - places;
  return places === 0 ? s : `${s.slice(0, cut)}.${s.slice(cut)}`.replace(/\.?0+$/, '');
}

/** How a rate was arrived at. Stamped on the posting so a derived weight is reproducible. */
export type FxResolutionKind = 'exact' | 'stale' | 'inverse' | 'triangulated';

export interface ResolvedFxRate {
  readonly kind: FxResolutionKind;
  /** Scaled. 1 base = <rate> quote. */
  readonly rate: bigint;
  /** The rows this came from. Stamped onto the posting — reproducible forever. */
  readonly rateIds: readonly string[];
  readonly asOf: IsoDate;
  readonly explanation: string;
}

export interface FxQuery {
  readonly base: CommodityCode;
  readonly quote: CommodityCode;
  readonly asOf: IsoDate;
  readonly maxStalenessDays: number;
  /** The book's functional currency — the hub for triangulation. */
  readonly functional: CommodityCode;
  readonly preferredSource?: string;
}

/**
 * Find a rate, deterministically, or fail loudly.
 *
 * The order matters and each step is a strictly worse answer than the last:
 *
 *   1. exact         — a rate for this pair on this date
 *   2. stale         — the most recent one within maxStalenessDays
 *   3. inverse       — 1 / the opposite pair
 *   4. triangulated  — via the functional currency
 *   5. throw
 *
 * **Never substitutes 1.0.** A missing rate is a question, not a default. Silently
 * treating USD as KRW would produce a balanced, plausible, catastrophically wrong
 * ledger — and nothing downstream would notice.
 */
export function resolveRate(rates: readonly FxRate[], q: FxQuery): ResolvedFxRate {
  if (q.base === q.quote) {
    return { kind: 'exact', rate: RATE_SCALE, rateIds: [], asOf: q.asOf, explanation: 'same commodity' };
  }

  const usable = rates.filter((r) => r.asOf <= q.asOf && (!q.preferredSource || r.source === q.preferredSource));
  const newestFirst = [...usable].sort((a, b) => (a.asOf < b.asOf ? 1 : a.asOf > b.asOf ? -1 : 0));

  const direct = newestFirst.find((r) => r.base === q.base && r.quote === q.quote);
  if (direct?.asOf === q.asOf) {
    return {
      kind: 'exact',
      rate: parseRate(direct.rate),
      rateIds: [direct.id],
      asOf: direct.asOf,
      explanation: `${direct.source} ${direct.asOf}`,
    };
  }
  if (direct && daysBetween(direct.asOf, q.asOf) <= q.maxStalenessDays) {
    return {
      kind: 'stale',
      rate: parseRate(direct.rate),
      rateIds: [direct.id],
      asOf: direct.asOf,
      explanation: `${direct.source} ${direct.asOf}, ${daysBetween(direct.asOf, q.asOf)}일 전`,
    };
  }

  const inverse = newestFirst.find(
    (r) => r.base === q.quote && r.quote === q.base && daysBetween(r.asOf, q.asOf) <= q.maxStalenessDays,
  );
  if (inverse) {
    return {
      kind: 'inverse',
      rate: invert(parseRate(inverse.rate)),
      rateIds: [inverse.id],
      asOf: inverse.asOf,
      explanation: `1 / (${inverse.base}→${inverse.quote} ${inverse.asOf})`,
    };
  }

  // base → functional → quote
  if (q.base !== q.functional && q.quote !== q.functional) {
    const leg1 = findAnyDirection(newestFirst, q.base, q.functional, q.asOf, q.maxStalenessDays);
    const leg2 = findAnyDirection(newestFirst, q.functional, q.quote, q.asOf, q.maxStalenessDays);
    if (leg1 && leg2) {
      return {
        kind: 'triangulated',
        rate: (leg1.rate * leg2.rate) / RATE_SCALE,
        rateIds: [...leg1.ids, ...leg2.ids],
        asOf: leg1.asOf < leg2.asOf ? leg1.asOf : leg2.asOf,
        explanation: `${q.base}→${q.functional}→${q.quote}`,
      };
    }
  }

  throw new FxError(
    `no ${q.base}→${q.quote} rate for ${q.asOf} within ${q.maxStalenessDays} days, and none to triangulate ` +
      `through ${q.functional}. Add one with \`holiday fx add\`, or supply the total directly with '@@'. ` +
      `A missing rate is a question — this will not guess 1.0.`,
  );
}

function findAnyDirection(
  rates: readonly FxRate[],
  base: CommodityCode,
  quote: CommodityCode,
  asOf: IsoDate,
  maxStalenessDays: number,
): { rate: bigint; ids: string[]; asOf: IsoDate } | null {
  const fwd = rates.find((r) => r.base === base && r.quote === quote && daysBetween(r.asOf, asOf) <= maxStalenessDays);
  if (fwd) return { rate: parseRate(fwd.rate), ids: [fwd.id], asOf: fwd.asOf };
  const rev = rates.find((r) => r.base === quote && r.quote === base && daysBetween(r.asOf, asOf) <= maxStalenessDays);
  if (rev) return { rate: invert(parseRate(rev.rate)), ids: [rev.id], asOf: rev.asOf };
  return null;
}

function invert(scaled: bigint): bigint {
  return roundDiv(RATE_SCALE * RATE_SCALE, scaled);
}

function daysBetween(a: IsoDate, b: IsoDate): number {
  const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Convert an amount at a resolved rate, rounding to the target's minor units.
 *
 * Used for `weight_source='rate'` weights and for revaluation. NOT used for
 * balancing — a weight derived here is stored as a fact, and the balance rule
 * only ever sums stored weights.
 */
export function convert(amountMinor: bigint, rate: bigint, fromExponent: number, toExponent: number): bigint {
  const scaleShift = 10n ** BigInt(Math.abs(toExponent - fromExponent));
  const raw = amountMinor * rate;
  const adjusted = toExponent >= fromExponent ? raw * scaleShift : raw / scaleShift;
  return roundDiv(adjusted, RATE_SCALE);
}
