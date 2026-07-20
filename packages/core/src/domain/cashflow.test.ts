import { describe, expect, it } from 'vitest';

import type { AccountCode, AccountId, AccountType, IsoDate } from './account.js';
import type { CommodityCode } from './commodity.js';
import type { SystemKind, TxnId } from './txn.js';
import {
  type CardForProjection,
  type ProjectionPosting,
  cashRunway,
  projectCardBills,
  projectInstallments,
} from './cashflow.js';

const CARD = 'card-acct' as AccountId;
const BANK = 'bank-acct' as AccountId;
const DINING = 'dining-acct' as AccountId;
const EQUITY = 'equity-acct' as AccountId;
const KRW = 'KRW' as CommodityCode;

const TYPE: Record<string, AccountType> = {
  [CARD]: 'liability',
  [BANK]: 'asset',
  [DINING]: 'expense',
  [EQUITY]: 'equity',
};

// 전월 15일~당월 14일 사용, 익월 1일 결제.
const card: CardForProjection = {
  accountId: CARD,
  accountCode: 'Liabilities:Card:Shinhan' as AccountCode,
  fundingAccountId: BANK,
  rule: { cycleCloseDay: 14, paymentMonthOffset: 1, paymentDay: 1 },
  label: '신한',
};

let n = 0;
const txn = (
  date: string,
  legs: readonly [AccountId, bigint][],
  meta: { readonly correctsTxnId?: TxnId | null; readonly systemKind?: SystemKind | null } = {},
): ProjectionPosting[] => {
  const txnId = `T${n++}` as TxnId;
  return legs.map(([accountId, weightMinor]) => ({
    txnId,
    txnDate: date as IsoDate,
    accountId,
    accountType: TYPE[accountId] ?? 'expense',
    weightMinor,
    commodity: KRW,
    correctsTxnId: meta.correctsTxnId ?? null,
    systemKind: meta.systemKind ?? null,
  }));
};

const purchase = (date: string, amount: bigint) => txn(date, [[DINING, amount], [CARD, -amount]]);
const refund = (date: string, amount: bigint) => txn(date, [[DINING, -amount], [CARD, amount]]);
const payment = (date: string, amount: bigint) => txn(date, [[CARD, amount], [BANK, -amount]]);
/** Card − / Equity + — double-posting undo or untitled opening, without a corrects link. */
const equityOffset = (date: string, amount: bigint) => txn(date, [[CARD, -amount], [EQUITY, amount]]);

describe('projectCardBills', () => {
  it('puts a purchase on the bill that actually takes the cash', () => {
    // Bought on 7/17 → cycle closes 8/14 → cash leaves 9/1. Not in July at all.
    const bills = projectCardBills({
      cards: [card],
      postings: purchase('2026-07-17', 12500n),
      today: '2026-07-17' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    expect(bills).toHaveLength(1);
    expect(bills[0]).toMatchObject({ paymentDate: '2026-09-01', closeDate: '2026-08-14', amountMinor: 12500n });
  });

  it('includes the already-closed bill you have not paid yet', () => {
    // The most imminent outflow: spent 7/10, cycle already closed 7/14, cash
    // leaves 8/1. Omitting this is how a projection lies about next week.
    const bills = projectCardBills({
      cards: [card],
      postings: purchase('2026-07-10', 30000n),
      today: '2026-07-17' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    expect(bills).toHaveLength(1);
    expect(bills[0]!.paymentDate).toBe('2026-08-01');
  });

  it('does NOT let a payment of a previous bill cancel out this cycle', () => {
    // The trap. On the card account a purchase is negative but BOTH a refund and
    // a payment are positive. If the 8/1 payment (which falls inside the cycle
    // running 7/15–8/14) were summed in, the 9/1 bill would read 12,500 − 30,000
    // = negative and vanish — understating exactly the way that overdraws you.
    const bills = projectCardBills({
      cards: [card],
      postings: [...purchase('2026-07-10', 30000n), ...purchase('2026-07-17', 12500n), ...payment('2026-08-01', 30000n)],
      today: '2026-07-17' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    expect(bills.map((b) => [b.paymentDate, b.amountMinor])).toEqual([
      ['2026-08-01', 30000n],
      ['2026-09-01', 12500n],
    ]);
  });

  it('DOES let a refund reduce the bill', () => {
    // Same sign as a payment, opposite meaning. Told apart by the counter leg.
    const bills = projectCardBills({
      cards: [card],
      postings: [...purchase('2026-07-17', 50000n), ...refund('2026-07-20', 20000n)],
      today: '2026-07-17' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    expect(bills).toHaveLength(1);
    expect(bills[0]!.amountMinor).toBe(30000n);
  });

  it('splits purchases across cycles at the closing day', () => {
    const bills = projectCardBills({
      cards: [card],
      postings: [...purchase('2026-07-14', 1000n), ...purchase('2026-07-15', 2000n)],
      today: '2026-07-01' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    expect(bills.map((b) => [b.paymentDate, b.amountMinor])).toEqual([
      ['2026-08-01', 1000n],
      ['2026-09-01', 2000n],
    ]);
  });

  it('omits a cycle with no activity rather than reporting a zero bill', () => {
    const bills = projectCardBills({
      cards: [card],
      postings: purchase('2026-07-17', 12500n),
      today: '2026-07-17' as IsoDate,
      until: '2027-06-30' as IsoDate,
    });
    expect(bills).toHaveLength(1);
  });

  it('excludes a linked correction from the card bill regardless of counter-leg', () => {
    // POLICY-022: corrects_txn_id means bookkeeping undo, not merchant usage.
    const original = purchase('2026-07-17', 50000n);
    const correction = txn(
      '2026-07-18',
      [[CARD, 50000n], [DINING, -50000n]],
      { correctsTxnId: original[0]!.txnId },
    );
    const bills = projectCardBills({
      cards: [card],
      postings: [...original, ...correction],
      today: '2026-07-17' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    expect(bills).toHaveLength(1);
    expect(bills[0]!.amountMinor).toBe(50000n);
  });

  it('excludes equity-only counter-leg postings from the card bill', () => {
    // Repro: cycle has only Card − / Equity + (double-post undo without corrects link).
    // That must not invent a multi-million bill line.
    const bills = projectCardBills({
      cards: [card],
      postings: equityOffset('2026-07-18', 3_500_000n),
      today: '2026-07-17' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    expect(bills).toHaveLength(0);
  });

  it('keeps merchant usage when an equity-only correction sits in the same cycle', () => {
    const bills = projectCardBills({
      cards: [card],
      postings: [...purchase('2026-07-17', 12500n), ...equityOffset('2026-07-18', 3_500_000n)],
      today: '2026-07-17' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    expect(bills).toHaveLength(1);
    expect(bills[0]!.amountMinor).toBe(12500n);
  });

  it('excludes opening_balance system postings from the card bill', () => {
    const opening = txn(
      '2026-07-15',
      [[CARD, -2_000_000n], [EQUITY, 2_000_000n]],
      { systemKind: 'opening_balance' },
    );
    const bills = projectCardBills({
      cards: [card],
      postings: [...opening, ...purchase('2026-07-17', 12500n)],
      today: '2026-07-17' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    expect(bills).toHaveLength(1);
    expect(bills[0]!.amountMinor).toBe(12500n);
  });
});

describe('cashRunway', () => {
  it('answers the actual question: does the balance survive', () => {
    const bills = projectCardBills({
      cards: [card],
      postings: [...purchase('2026-07-10', 800000n), ...purchase('2026-07-20', 500000n)],
      today: '2026-07-17' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    const runway = cashRunway(1000000n, bills);
    expect(runway.map((p) => [p.date, p.outflowMinor, p.balanceAfterMinor])).toEqual([
      ['2026-08-01', 800000n, 200000n],
      ['2026-09-01', 500000n, -300000n], // ← the warning worth having
    ]);
    expect(runway.some((p) => p.balanceAfterMinor < 0n)).toBe(true);
  });

  it('groups multiple cards landing on the same day', () => {
    const card2 = 'card2' as AccountId;
    TYPE[card2] = 'liability';
    const other: CardForProjection = { ...card, accountId: card2, accountCode: 'Liabilities:Card:KB' as AccountCode, label: 'KB' };
    const bills = projectCardBills({
      cards: [card, other],
      postings: [
        ...purchase('2026-07-10', 100n),
        ...txn('2026-07-10', [[DINING, 200n], [card2, -200n]]),
      ],
      today: '2026-07-17' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    const runway = cashRunway(1000n, bills);
    expect(runway).toHaveLength(1);
    expect(runway[0]!.outflowMinor).toBe(300n);
    expect(runway[0]!.items).toHaveLength(2);
  });
});

describe('projectInstallments', () => {
  const plan = {
    id: 'INST1',
    cardAccountId: CARD,
    liabilityAccountId: 'card-inst' as AccountId,
    label: '냉장고 12개월',
    months: 12,
    rows: Array.from({ length: 12 }, (_, i) => ({
      seq: i + 1,
      paymentDate: `2026-${String(9 + Math.floor(i / 1)).padStart(2, '0')}-01` as IsoDate,
      principalMinor: 100000n,
      feeMinor: 0n,
    })).slice(0, 4),
  };
  const fundingByCard = new Map([[CARD, BANK]]);

  it('projects only rows that have not been paid', () => {
    const rows = projectInstallments({
      installments: [plan],
      fundingByCard,
      today: '2026-10-15' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    expect(rows.map((r) => [r.paymentDate, r.seq])).toEqual([['2026-11-01', 3], ['2026-12-01', 4]]);
  });

  it('merges with ordinary card bills on the same payment date', () => {
    // What a real statement does: one withdrawal on the 1st made of this month's
    // charges plus every installment row that came due.
    const bills = projectCardBills({
      cards: [card],
      postings: purchase('2026-07-17', 12500n),
      today: '2026-07-17' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    const inst = projectInstallments({
      installments: [plan],
      fundingByCard,
      today: '2026-07-17' as IsoDate,
      until: '2026-12-31' as IsoDate,
    });
    const runway = cashRunway(1000000n, [...bills, ...inst]);
    const sept = runway.find((p) => p.date === '2026-09-01')!;
    expect(sept.items).toHaveLength(2); // 일반 사용분 + 할부 1회차
    expect(sept.outflowMinor).toBe(112500n);
  });
});
