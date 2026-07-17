import { type CommodityCode, type CommodityRegistry, I64_MAX, I64_MIN } from './commodity.js';

/**
 * An amount is an integer count of minor units plus the commodity those units
 * belong to. The scale is NOT here — it lives once, in the CommodityRegistry.
 *
 * `minor` is a bigint, not a number. SQLite's INTEGER is i64 and `number` is only
 * exact to 2^53. KRW would probably survive that (2^53 ≈ ₩9 quadrillion), but one
 * JPY-denominated position or a satoshi conversion would not. Using bigint costs
 * some ergonomics and buys never having to think about it again.
 */
export interface Amount {
  readonly minor: bigint;
  readonly commodity: CommodityCode;
}

export class AmountScaleError extends Error {
  constructor(
    readonly text: string,
    readonly commodity: string,
    readonly exponent: number,
    readonly given: number,
  ) {
    super(
      `${JSON.stringify(text)} has ${given} decimal place(s) but ${commodity} has exponent ${exponent}. ` +
        (exponent === 0
          ? `${commodity} has no minor unit — write it as a whole number.`
          : `At most ${exponent} decimal place(s) are representable.`),
    );
    this.name = 'AmountScaleError';
  }
}

export class AmountRangeError extends Error {
  constructor(readonly minor: bigint) {
    super(`amount ${minor} is outside the representable i64 range [${I64_MIN}, ${I64_MAX}]`);
    this.name = 'AmountRangeError';
  }
}

// Deliberately no exponent notation, no leading '+', no thousands separators.
// A ledger that accepts "1e3" accepts a typo that means something else.
const DECIMAL_RE = /^(-?)(\d+)(?:\.(\d+))?$/;

/**
 * The only way to build an Amount from user/agent input.
 *
 * Constructing amounts through a factory bound to a registry — rather than a free
 * function — is what makes `parse("1234.56", "KRW")` a *type-level* impossibility
 * to get wrong rather than a convention. The vision model reading a screenshot is
 * the weakest link in this system; this is the first ring that catches it.
 */
export class AmountFactory {
  constructor(private readonly registry: CommodityRegistry) {}

  /**
   * Parse a decimal string. Throws on a scale the commodity cannot represent.
   *
   *   parse("1234.56", "USD")  →  123456n
   *   parse("1234",    "KRW")  →    1234n
   *   parse("1234.5",  "USD")  →  123450n   (fewer decimals than exponent is fine)
   *   parse("1234.56", "KRW")  →  throws    (KRW has no minor unit)
   */
  parse(text: string, commodityCode: string): Amount {
    const commodity = this.registry.get(commodityCode);
    const m = DECIMAL_RE.exec(text.trim());
    if (!m) {
      throw new TypeError(
        `${JSON.stringify(text)} is not a plain decimal number. ` +
          `Expected e.g. "1234", "-1234.56". No exponents, no separators, no currency symbols.`,
      );
    }
    const [, sign, whole, frac = ''] = m;
    if (frac.length > commodity.exponent) {
      throw new AmountScaleError(text, commodityCode, commodity.exponent, frac.length);
    }
    const padded = frac.padEnd(commodity.exponent, '0');
    const minor = BigInt(`${sign}${whole}${padded}`);
    return this.fromMinor(minor, commodityCode);
  }

  /** Build from an already-scaled integer. Range-checked; scale is trusted. */
  fromMinor(minor: bigint, commodityCode: string): Amount {
    const commodity = this.registry.get(commodityCode);
    if (minor < I64_MIN || minor > I64_MAX) throw new AmountRangeError(minor);
    return { minor, commodity: commodity.code };
  }

  zero(commodityCode: string): Amount {
    return this.fromMinor(0n, commodityCode);
  }

  /** Render for humans. Never for the journal — the journal stores minor units. */
  format(a: Amount): string {
    const exponent = this.registry.exponentOf(a.commodity);
    const neg = a.minor < 0n;
    const digits = (neg ? -a.minor : a.minor).toString().padStart(exponent + 1, '0');
    const cut = digits.length - exponent;
    const body = exponent === 0 ? digits : `${digits.slice(0, cut)}.${digits.slice(cut)}`;
    return `${neg ? '-' : ''}${body}`;
  }

  formatWithCode(a: Amount): string {
    return `${this.format(a)} ${a.commodity}`;
  }
}

export function sameCommodity(a: Amount, b: Amount): boolean {
  return a.commodity === b.commodity;
}

export function negate(a: Amount): Amount {
  return { minor: -a.minor, commodity: a.commodity };
}

export function isZero(a: Amount): boolean {
  return a.minor === 0n;
}

export function addSameCommodity(a: Amount, b: Amount): Amount {
  if (a.commodity !== b.commodity) {
    throw new TypeError(`cannot add ${a.commodity} to ${b.commodity} — convert explicitly`);
  }
  const sum = a.minor + b.minor;
  if (sum < I64_MIN || sum > I64_MAX) throw new AmountRangeError(sum);
  return { minor: sum, commodity: a.commodity };
}

export function inI64Range(v: bigint): boolean {
  return v >= I64_MIN && v <= I64_MAX;
}
