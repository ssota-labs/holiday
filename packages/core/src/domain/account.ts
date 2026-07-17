import type { CommodityCode } from './commodity.js';
import type { Ulid } from './ids.js';

export type AccountId = Ulid & { readonly __account: unique symbol };

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

/**
 * Colon-delimited, Beancount-style: `Assets:Bank:KB:Checking`.
 *
 * The code IS a materialized path, so a subtree query is
 * `code = ? OR code GLOB ? || ':*'` — no closure table, no recursive CTE.
 */
export type AccountCode = string & { readonly __accountCode: unique symbol };

export const ROOT_BY_TYPE: Readonly<Record<AccountType, string>> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expenses',
};

export const TYPE_BY_ROOT: Readonly<Record<string, AccountType>> = Object.freeze(
  Object.fromEntries(Object.entries(ROOT_BY_TYPE).map(([t, r]) => [r, t as AccountType])),
);

export interface Account {
  readonly id: AccountId;
  readonly code: AccountCode;
  readonly type: AccountType;
  readonly parentId: AccountId | null;
  /**
   * Non-null: this account holds exactly one commodity, enforced on every
   * posting. This is the default and it should cover ~95% of accounts — it
   * catches the single most common real error, which is the vision model
   * posting USD into a KRW checking account because it misread a symbol.
   *
   * Null: opt-in multi-commodity. Only for brokerages, crypto wallets, and
   * multi-currency neobank wallets. Balances become a vector, not a scalar.
   * A generically multi-commodity model is strictly weaker at catching errors
   * and buys nothing for an account that will only ever hold KRW.
   */
  readonly commodity: CommodityCode | null;
  /**
   * IAS 21 monetary/non-monetary. Monetary items (cash, receivables, debt) are
   * revalued at close; non-monetary ones (equipment, prepaid) are not.
   * This cannot be inferred from the type, so it has to be a flag.
   */
  readonly monetary: boolean;
  /** Placeholders exist only to hold children and cannot be posted to. */
  readonly placeholder: boolean;
  readonly openedOn: IsoDate;
  readonly closedOn: IsoDate | null;
}

export type IsoDate = string & { readonly __isoDate: unique symbol };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: string): s is IsoDate {
  if (!ISO_DATE_RE.test(s)) return false;
  // Reject 2026-02-31: Date normalizes silently, so round-trip to detect it.
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function assertIsoDate(s: string): IsoDate {
  if (!isIsoDate(s)) throw new TypeError(`not a valid ISO date (YYYY-MM-DD): ${JSON.stringify(s)}`);
  return s;
}

const SEGMENT_RE = /^[A-Z][A-Za-z0-9-]*$/;

export function parseAccountCode(code: string): { type: AccountType; segments: string[] } {
  const segments = code.split(':');
  if (segments.length < 2) {
    throw new TypeError(
      `account code must have at least two segments, e.g. "Assets:Cash" — got ${JSON.stringify(code)}`,
    );
  }
  const [root] = segments;
  const type = TYPE_BY_ROOT[root!];
  if (!type) {
    throw new TypeError(
      `account code must start with one of ${Object.values(ROOT_BY_TYPE).join(', ')} — got ${JSON.stringify(root)}`,
    );
  }
  for (const s of segments) {
    if (!SEGMENT_RE.test(s)) {
      throw new TypeError(
        `invalid account code segment ${JSON.stringify(s)} in ${JSON.stringify(code)} — ` +
          `segments must start with an uppercase letter and contain only letters, digits, and '-'`,
      );
    }
  }
  return { type, segments };
}

export function assertAccountCode(code: string): AccountCode {
  parseAccountCode(code);
  return code as AccountCode;
}

/**
 * A subtree prefix, which is NOT a full account code.
 *
 * `Liabilities` is a legal prefix but an illegal account code — you cannot post
 * to a bare root. Validating a prefix with assertAccountCode() therefore has to
 * be wrong in one direction or the other, so it gets its own function.
 */
export function assertAccountPrefix(prefix: string): AccountCode {
  const segments = prefix.split(':');
  const [root] = segments;
  if (!root || !TYPE_BY_ROOT[root]) {
    throw new TypeError(
      `an account prefix must start with one of ${Object.values(ROOT_BY_TYPE).join(', ')} — got ${JSON.stringify(root)}`,
    );
  }
  for (const s of segments) {
    if (!SEGMENT_RE.test(s)) {
      throw new TypeError(
        `invalid segment ${JSON.stringify(s)} in prefix ${JSON.stringify(prefix)} — ` +
          `segments must start with an uppercase letter and contain only letters, digits, and '-'`,
      );
    }
  }
  return prefix as AccountCode;
}

export function accountTypeOf(code: AccountCode): AccountType {
  return parseAccountCode(code).type;
}

export function parentCodeOf(code: AccountCode): AccountCode | null {
  const i = code.lastIndexOf(':');
  if (i < 0) return null;
  const parent = code.slice(0, i);
  return parent.includes(':') ? (parent as AccountCode) : null;
}

export function isDescendantOf(code: AccountCode, ancestor: AccountCode): boolean {
  return code === ancestor || code.startsWith(`${ancestor}:`);
}

/**
 * Debit-positive across all five types, uniformly. An income account's balance is
 * naturally negative and the reporting layer flips it for display.
 *
 * The payoff: the ledger invariant is one `SUM(...) = 0` instead of
 * `SUM(dr) = SUM(cr)` plus a type-dependent normal-balance table. One number,
 * one sum, one trigger.
 */
export function displaySignOf(type: AccountType): 1 | -1 {
  return type === 'liability' || type === 'equity' || type === 'income' ? -1 : 1;
}
