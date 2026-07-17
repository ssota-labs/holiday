/**
 * Fixed-point rate arithmetic on bigint.
 *
 * Rates are scaled integers, never floats — the same rule the rest of this ledger
 * follows, for the same reason. `0.1 + 0.2 !== 0.3` is funny in a blog post and
 * not funny in an amortization schedule compounded 360 times.
 *
 * decimal.js would also work and is pure JS. It is not used because @holiday/core
 * gets inlined into a single-file plugin binary with no install step, and this is
 * forty lines.
 */

/** 18 decimal places. Chosen so that compounding stays exact enough to be boring. */
export const RATE_SCALE = 10n ** 18n;
export const RATE_ONE = RATE_SCALE;

export class RateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateError';
  }
}

const PERCENT_RE = /^(\d+)(?:\.(\d+))?$/;

/**
 * Parse an annual percentage into a scaled monthly rate.
 *
 * `"4.2"` means 4.2% per year, which is how a loan contract and a human both say
 * it. Divided by 12 for a monthly rate — the simple convention Korean lenders use
 * for 원리금균등, not an effective-annual conversion.
 */
export function parseAnnualPercent(text: string): bigint {
  const m = PERCENT_RE.exec(text.trim());
  if (!m) {
    throw new RateError(
      `${JSON.stringify(text)} is not an annual percentage. Write it the way the contract does, e.g. "4.2" for 4.2%.`,
    );
  }
  const [, whole, frac = ''] = m;
  if (frac.length > 12) throw new RateError(`${text}: more than 12 decimal places in a rate is noise`);
  const scaled = BigInt(`${whole}${frac.padEnd(18, '0')}`);
  // percent → fraction
  return scaled / 100n;
}

export function monthlyFromAnnual(annualScaled: bigint): bigint {
  return annualScaled / 12n;
}

/** a × b, both scaled. Truncates — see roundDiv for where rounding actually matters. */
export function mulRate(a: bigint, b: bigint): bigint {
  return (a * b) / RATE_SCALE;
}

/** base^n by repeated multiplication. n is a loan term, so at most a few hundred. */
export function powRate(base: bigint, n: number): bigint {
  if (!Number.isInteger(n) || n < 0) throw new RateError(`exponent must be a non-negative integer, got ${n}`);
  let result = RATE_ONE;
  let b = base;
  let e = n;
  // Exponentiation by squaring: fewer multiplications means less accumulated
  // truncation than a naive loop, and it is the same four lines.
  while (e > 0) {
    if (e & 1) result = mulRate(result, b);
    b = mulRate(b, b);
    e >>= 1;
  }
  return result;
}

/** Apply a scaled rate to an integer amount, rounding half away from zero. */
export function applyRate(amountMinor: bigint, rateScaled: bigint): bigint {
  return roundDiv(amountMinor * rateScaled, RATE_SCALE);
}

/**
 * Divide and round half away from zero.
 *
 * Half away from zero — not banker's rounding — because that is what lenders do
 * and this number gets compared against their statement. Being clever here means
 * `loan check` reports a ₩1 discrepancy every month forever.
 */
export function roundDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new RateError('division by zero');
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = n / d;
  const r = n % d;
  const rounded = r * 2n >= d ? q + 1n : q;
  return negative ? -rounded : rounded;
}

/** Render a scaled rate as a percentage string, for display only. */
export function formatAnnualPercent(annualScaled: bigint, places = 3): string {
  const pct = annualScaled * 100n;
  const divisor = RATE_SCALE / 10n ** BigInt(places);
  const v = roundDiv(pct, divisor);
  const s = v.toString().padStart(places + 1, '0');
  const cut = s.length - places;
  return places === 0 ? s : `${s.slice(0, cut)}.${s.slice(cut)}`;
}
