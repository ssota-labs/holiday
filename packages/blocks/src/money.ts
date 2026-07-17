/**
 * Money formatting, and the one rule that matters: amounts arrive as STRINGS.
 *
 * Every amount in this ledger is an i64 in minor units. JSON has no i64 — so
 * `JSON.stringify` on a bigint throws, and the ledger serialises to a decimal
 * string instead. `Number("9007199254740993")` silently gives ...992.
 *
 * So nothing here parses a string into a number. Formatting is done on the digits
 * themselves: insert a decimal point `exponent` places from the right. It is
 * exact for any magnitude, and it cannot be wrong in the way a float can.
 */
export interface Amount {
  /** Minor units as a decimal string. NEVER a number. */
  readonly minor: string;
  readonly commodity: string;
}

/** Decimal places for a commodity. KRW has none — ₩1 is the smallest unit. */
const EXPONENT: Record<string, number> = { KRW: 0, JPY: 0, USD: 2, EUR: 2 };

export function exponentOf(commodity: string): number {
  return EXPONENT[commodity] ?? 2;
}

/**
 * `"3000000"` + KRW → `"₩3,000,000"`. String in, string out, no float in between.
 */
export function formatAmount(minor: string, commodity: string): string {
  const exp = exponentOf(commodity);
  const neg = minor.startsWith('-');
  const digits = (neg ? minor.slice(1) : minor).padStart(exp + 1, '0');
  const whole = digits.slice(0, digits.length - exp) || '0';
  const frac = exp > 0 ? '.' + digits.slice(digits.length - exp) : '';
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const symbol = commodity === 'KRW' ? '₩' : commodity === 'USD' ? '$' : '';
  const body = symbol ? `${symbol}${grouped}${frac}` : `${grouped}${frac} ${commodity}`;
  return neg ? `-${body}` : body;
}

/** Sign, for colouring. Reads the string; does not parse it. */
export function signOf(minor: string): -1 | 0 | 1 {
  if (minor.startsWith('-')) return -1;
  return /^0+$/.test(minor) ? 0 : 1;
}
