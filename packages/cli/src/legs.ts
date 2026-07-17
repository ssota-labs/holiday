import { type Amount, type AmountFactory, type CommodityCode, type PostingInput, type Account } from '@holiday/core';

/**
 * Leg syntax, borrowed from Beancount because it is the notation people who keep
 * plain-text ledgers already read:
 *
 *   Expenses:Food:Dining  12500 KRW
 *   Assets:Bank:Wise:USD  750.00 USD @@ 1000000
 *
 * `@@` is a TOTAL price, not a rate — which is exactly what a weight is. There is
 * deliberately no `@` (per-unit rate) form: a rate multiplied back out is lossy at
 * integer scale, and accepting one here would smuggle the tolerance problem in
 * through the front door. If you know the rate but not the counter-amount, that is
 * what `holiday fx` will be for.
 */
/**
 * Turns a foreign amount into a functional-currency weight using a rate.
 *
 * The caller resolves the rate ONCE per transaction and hands the same closure to
 * every leg. That is not an optimisation — it is what makes a same-currency
 * charge balance. A USD purchase on a USD card has two legs of ±$12.50; if each
 * resolved its own rate they could disagree by a won and the transaction would
 * not sum to zero. One rate cancels exactly.
 */
export type DeriveWeight = (units: Amount) => {
  weightMinor: bigint;
  fxRateText: string;
  fxRateId: string | null;
};

export function parseLeg(
  leg: string,
  amounts: AmountFactory,
  functionalCurrency: CommodityCode,
  resolveAccount: (code: string) => Account,
  deriveWeight?: DeriveWeight,
): PostingInput {
  const parts = leg.trim().split(/\s+/);
  const [code, amountText, commodity, at, weightText] = parts;

  if (!code || !amountText || !commodity) {
    throw new UsageError(
      `cannot parse leg ${JSON.stringify(leg)}. Expected "ACCOUNT AMOUNT COMMODITY" ` +
        `or "ACCOUNT AMOUNT COMMODITY @@ TOTAL_IN_${functionalCurrency}".`,
    );
  }
  if (at !== undefined && at !== '@@') {
    if (at === '@') {
      throw new UsageError(
        `leg ${JSON.stringify(leg)} uses '@' (a per-unit rate). This ledger only accepts '@@' ` +
          `(a total amount), because deriving a counter-amount by multiplying a rate does not ` +
          `land on an exact integer and would force a tolerance. Write the total you actually paid.`,
      );
    }
    throw new UsageError(`unexpected token ${JSON.stringify(at)} in leg ${JSON.stringify(leg)}`);
  }

  const account = resolveAccount(code);
  const units = amounts.parse(amountText, commodity);
  const isFunctional = units.commodity === functionalCurrency;

  if (at === '@@') {
    if (!weightText) throw new UsageError(`leg ${JSON.stringify(leg)} has '@@' with no total after it`);
    if (isFunctional) {
      throw new UsageError(
        `leg ${JSON.stringify(leg)} is already in ${functionalCurrency}, so '@@' is meaningless — ` +
          `its weight is its amount.`,
      );
    }
    return {
      accountId: account.id,
      units,
      weightMinor: amounts.parse(weightText, functionalCurrency).minor,
      // Both sides observed, so the implied rate is a fact rather than a lookup.
      weightSource: 'actual',
    };
  }

  if (!isFunctional) {
    // Derivable from the rate table, if the caller gave us one. The caller does
    // that ONCE per transaction and passes the same rate to every leg — see
    // deriveWeight's contract.
    if (deriveWeight) {
      const { weightMinor, fxRateText, fxRateId } = deriveWeight(units);
      return { accountId: account.id, units, weightMinor, weightSource: 'rate', fxRateText, fxRateId };
    }
    throw new UsageError(
      `leg ${JSON.stringify(leg)} is in ${units.commodity}, not ${functionalCurrency}, so its ` +
        `${functionalCurrency} value cannot be inferred. Add "@@ <total in ${functionalCurrency}>", ` +
        `or record a rate with \`holiday fx add\`.`,
    );
  }
  return { accountId: account.id, units };
}

export class UsageError extends Error {
  readonly code = 'usage';
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}
