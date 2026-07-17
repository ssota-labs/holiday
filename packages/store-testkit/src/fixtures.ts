import {
  type Account,
  type AccountCode,
  type AccountId,
  AmountFactory,
  CommodityRegistry,
  type CommodityCode,
  createUlidFactory,
  type IsoDate,
  type LedgerUow,
  Txn,
  type TxnId,
  type ValidatedTxn,
  WELL_KNOWN_COMMODITIES,
  accountTypeOf,
  assertAccountCode,
  unwrap,
} from '@holiday/core';

export const registry = CommodityRegistry.from(WELL_KNOWN_COMMODITIES);
export const amounts = new AmountFactory(registry);
export const KRW = 'KRW' as CommodityCode;
export const DATE = '2026-07-17' as IsoDate;

const nextUlid = createUlidFactory();
export const newTxnId = (): TxnId => nextUlid() as TxnId;
export const newAccountId = (): AccountId => nextUlid() as AccountId;

export interface Fixture {
  readonly checking: Account;
  readonly wiseUsd: Account;
  readonly card: Account;
  readonly dining: Account;
  readonly fxSpread: Account;
}

function account(code: string, commodity: CommodityCode | null, cash = false): Account {
  const c = assertAccountCode(code);
  return {
    id: newAccountId(),
    code: c,
    type: accountTypeOf(c),
    parentId: null,
    commodity,
    monetary: true,
    cash,
    placeholder: false,
    openedOn: '2020-01-01' as IsoDate,
    closedOn: null,
  };
}

/** Seeds the commodities and accounts every conformance case needs. */
export async function seed(uow: LedgerUow): Promise<Fixture> {
  for (const c of registry.all()) await uow.upsertCommodity(c);

  const fixture: Fixture = {
    checking: account('Assets:Bank:KB:Checking', KRW, true),
    wiseUsd: account('Assets:Bank:Wise:USD', 'USD' as CommodityCode, true),
    card: account('Liabilities:Card:Shinhan', KRW),
    dining: account('Expenses:Food:Dining', KRW),
    fxSpread: account('Expenses:FX:Conversion', KRW),
  };
  for (const a of Object.values(fixture)) await uow.upsertAccount(a);
  return fixture;
}

/** A plain balanced KRW transaction. */
export function simpleTxn(f: Fixture, minor: bigint, date: IsoDate = DATE): ValidatedTxn {
  return unwrap(
    Txn.create({
      id: newTxnId(),
      date,
      bookingCommodity: KRW,
      payee: 'Test Payee',
      narration: 'conformance',
      postings: [
        { accountId: f.dining.id, units: amounts.fromMinor(minor, 'KRW') },
        { accountId: f.card.id, units: amounts.fromMinor(-minor, 'KRW') },
      ],
    }),
  );
}

/** KRW→USD with both sides observed — the case that only balances because
 *  the counter-amount is stored as a fact rather than derived from a rate. */
export function fxTxn(f: Fixture, date: IsoDate = DATE): ValidatedTxn {
  return unwrap(
    Txn.create({
      id: newTxnId(),
      date,
      bookingCommodity: KRW,
      narration: 'Wise transfer',
      postings: [
        { accountId: f.checking.id, units: amounts.parse('-1000000', 'KRW') },
        {
          accountId: f.wiseUsd.id,
          units: amounts.parse('750.00', 'USD'),
          weightMinor: 1000000n,
          weightSource: 'actual',
          fxRateText: '1333.333333',
        },
      ],
    }),
  );
}

/**
 * An unbalanced transaction, forced past the domain via a cast.
 *
 * `Txn.create()` cannot produce this. The only way to get one is to lie to the
 * type system — which is exactly what an engine-tier store's triggers exist to
 * catch. This is ring 3 of plan §2, and this fixture is how we prove it is real.
 */
export function forgedUnbalancedTxn(f: Fixture): ValidatedTxn {
  return Txn.trustFromStorage({
    id: newTxnId(),
    date: DATE,
    bookingCommodity: KRW,
    payee: null,
    narration: 'forged — must be rejected at storage',
    systemKind: null,
    correctsTxnId: null,
    sourceItemId: null,
    fxEstimated: false,
    tags: [],
    meta: {},
    postings: [
      {
        seq: 0,
        accountId: f.dining.id,
        units: amounts.fromMinor(1000n, 'KRW'),
        weightMinor: 1000n,
        weightSource: 'identity',
        fxRateText: null,
        fxRateId: null,
        lotId: null,
        kind: 'normal',
        memo: null,
      },
      {
        seq: 1,
        accountId: f.card.id,
        units: amounts.fromMinor(-999n, 'KRW'), // ← off by one
        weightMinor: -999n,
        weightSource: 'identity',
        fxRateText: null,
        fxRateId: null,
        lotId: null,
        kind: 'normal',
        memo: null,
      },
    ],
  });
}

export const codeOf = (a: Account): AccountCode => a.code;
