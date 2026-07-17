/**
 * "Commodity", not "currency": BTC and AAPL are not currencies, and the
 * distinction is load-bearing — it drives the IAS 21 monetary/non-monetary split
 * that decides what gets revalued at close.
 */

export type CommodityCode = string & { readonly __commodity: unique symbol };

export type CommodityKind = 'fiat' | 'crypto' | 'security' | 'unit';

export interface Commodity {
  readonly code: CommodityCode;
  /** Decimal places. KRW=0, USD=2, JPY=0, BTC=8. */
  readonly exponent: number;
  readonly kind: CommodityKind;
  readonly name: string;
}

/**
 * i64 caps the representable range, so the exponent is capped too.
 *
 * This is the documented, accepted limit from plan §10: 18-decimal ERC-20 tokens
 * are NOT representable (1 ETH = 1e18 wei; i64 tops out around 9.2 ETH). Define
 * ETH as exponent 8 and truncate wei. Fine for personal net worth, wrong for
 * on-chain reconciliation. Better to fail loudly here than to discover it in
 * year two.
 */
export const MAX_EXPONENT = 9;
export const I64_MIN = -(2n ** 63n);
export const I64_MAX = 2n ** 63n - 1n;

const CODE_RE = /^[A-Z][A-Z0-9._]{0,23}$/;

export function isCommodityCode(s: string): s is CommodityCode {
  return CODE_RE.test(s);
}

export function assertCommodityCode(s: string): CommodityCode {
  if (!isCommodityCode(s)) {
    throw new TypeError(`invalid commodity code: ${JSON.stringify(s)} (want /^[A-Z][A-Z0-9._]{0,23}$/)`);
  }
  return s;
}

export class UnknownCommodityError extends Error {
  constructor(readonly code: string) {
    super(`unknown commodity: ${code}. Register it before use.`);
    this.name = 'UnknownCommodityError';
  }
}

/**
 * The single place an exponent lives. Amounts never carry their own scale — if
 * they did, two Amounts of the same commodity could disagree about what their
 * integers mean, which is the bug this whole design exists to make unthinkable.
 */
export class CommodityRegistry {
  readonly #byCode = new Map<string, Commodity>();

  static from(commodities: readonly Commodity[]): CommodityRegistry {
    const r = new CommodityRegistry();
    for (const c of commodities) r.register(c);
    return r;
  }

  register(c: Commodity): void {
    assertCommodityCode(c.code);
    if (!Number.isInteger(c.exponent) || c.exponent < 0 || c.exponent > MAX_EXPONENT) {
      throw new RangeError(
        `commodity ${c.code}: exponent must be an integer in [0, ${MAX_EXPONENT}], got ${c.exponent}`,
      );
    }
    const existing = this.#byCode.get(c.code);
    if (existing && existing.exponent !== c.exponent) {
      // Changing an exponent silently rescales every stored amount for that
      // commodity. It is a migration, not an edit.
      throw new Error(
        `commodity ${c.code}: exponent is immutable once registered (${existing.exponent} → ${c.exponent}). ` +
          `Changing it requires rewriting every amount in the journal.`,
      );
    }
    this.#byCode.set(c.code, c);
  }

  get(code: string): Commodity {
    const c = this.#byCode.get(code);
    if (!c) throw new UnknownCommodityError(code);
    return c;
  }

  has(code: string): boolean {
    return this.#byCode.has(code);
  }

  exponentOf(code: string): number {
    return this.get(code).exponent;
  }

  /** Sorted by code so any derived output is deterministic. */
  all(): readonly Commodity[] {
    return [...this.#byCode.values()].sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  }
}

/** Seeds for `holiday init`. Users add their own; these just avoid a cold start. */
export const WELL_KNOWN_COMMODITIES: readonly Commodity[] = [
  { code: 'KRW' as CommodityCode, exponent: 0, kind: 'fiat', name: 'South Korean Won' },
  { code: 'USD' as CommodityCode, exponent: 2, kind: 'fiat', name: 'US Dollar' },
  { code: 'EUR' as CommodityCode, exponent: 2, kind: 'fiat', name: 'Euro' },
  { code: 'JPY' as CommodityCode, exponent: 0, kind: 'fiat', name: 'Japanese Yen' },
  { code: 'GBP' as CommodityCode, exponent: 2, kind: 'fiat', name: 'Pound Sterling' },
  { code: 'CNY' as CommodityCode, exponent: 2, kind: 'fiat', name: 'Chinese Yuan' },
  { code: 'BTC' as CommodityCode, exponent: 8, kind: 'crypto', name: 'Bitcoin' },
  // Deliberately 8, not 18. See MAX_EXPONENT above.
  { code: 'ETH' as CommodityCode, exponent: 8, kind: 'crypto', name: 'Ether (truncated to 8dp)' },
];
