import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import type { AccountId, IsoDate } from './account.js';
import { AmountFactory } from './amount.js';
import { type CommodityCode, CommodityRegistry, WELL_KNOWN_COMMODITIES } from './commodity.js';
import { createUlidFactory, type UlidClock } from './ids.js';
import { Txn, type TxnId } from './txn.js';

const registry = CommodityRegistry.from(WELL_KNOWN_COMMODITIES);
const amounts = new AmountFactory(registry);
const KRW = 'KRW' as CommodityCode;

const nextId = createUlidFactory();
const id = () => nextId() as TxnId;
const acct = (n: number) => `ACCT${String(n).padStart(22, '0')}` as AccountId;
const DATE = '2026-07-17' as IsoDate;

const base = { date: DATE, bookingCommodity: KRW, narration: 'test' } as const;

describe('Txn.create — the balance rule', () => {
  it('accepts a plain KRW transaction and derives identity weights', () => {
    const r = Txn.create({
      ...base,
      id: id(),
      postings: [
        { accountId: acct(1), units: amounts.parse('-12500', 'KRW') },
        { accountId: acct(2), units: amounts.parse('12500', 'KRW') },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.postings.map((p) => p.weightMinor)).toEqual([-12500n, 12500n]);
    expect(r.value.postings.map((p) => p.weightSource)).toEqual(['identity', 'identity']);
    expect(r.value.fxEstimated).toBe(false);
  });

  it('rejects an unbalanced transaction with the exact residual, and no tolerance', () => {
    const r = Txn.create({
      ...base,
      id: id(),
      postings: [
        { accountId: acct(1), units: amounts.parse('-12500', 'KRW') },
        { accountId: acct(2), units: amounts.parse('12450', 'KRW') },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    // A ₩50 gap is exactly the magnitude a tolerance would hide, and exactly the
    // magnitude worth catching. It is reported, not absorbed.
    expect(r.error).toContainEqual({ code: 'unbalanced', residualMinor: -50n, bookingCommodity: KRW });
  });

  it('rejects fewer than two postings', () => {
    const r = Txn.create({
      ...base,
      id: id(),
      postings: [{ accountId: acct(1), units: amounts.parse('0', 'KRW') }],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContainEqual({ code: 'too_few_postings', count: 1 });
  });

  it('reports every error at once, not just the first', () => {
    const r = Txn.create({
      ...base,
      id: id(),
      postings: [
        { accountId: acct(1), units: amounts.parse('-100', 'KRW'), weightMinor: -999n },
        { accountId: acct(2), units: amounts.parse('50.00', 'USD') },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.map((e) => e.code).sort()).toEqual(['identity_weight_mismatch', 'unbalanced', 'weight_required']);
  });
});

describe('Txn.create — the identity rule', () => {
  it('refuses a booking-commodity posting whose weight disagrees with its units', () => {
    const r = Txn.create({
      ...base,
      id: id(),
      postings: [
        { accountId: acct(1), units: amounts.parse('-100', 'KRW'), weightMinor: -101n },
        { accountId: acct(2), units: amounts.parse('100', 'KRW') },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error[0]).toMatchObject({ code: 'identity_weight_mismatch', unitsMinor: -100n, weightMinor: -101n });
  });

  it('requires an explicit weight for a non-booking commodity', () => {
    const r = Txn.create({
      ...base,
      id: id(),
      postings: [
        { accountId: acct(1), units: amounts.parse('-750.00', 'USD') },
        { accountId: acct(2), units: amounts.parse('1000000', 'KRW') },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContainEqual({ code: 'weight_required', seq: 0, commodity: 'USD' });
  });
});

// The three worked FX cases from the design. These are the reason the whole
// units/weight split exists, so they are pinned as tests rather than prose.
describe('Txn.create — multi-currency', () => {
  it('case 1: KRW→USD with both amounts observed balances EXACTLY at a non-terminating rate', () => {
    // ₩1,000,000 → $750.00 implies 1333.3333…. Storing that rate and multiplying
    // back gives ₩999,998 and an invented tolerance. Storing the counter-amount
    // as a fact gives exactly zero.
    const r = Txn.create({
      ...base,
      id: id(),
      narration: 'Wise transfer',
      postings: [
        { accountId: acct(1), units: amounts.parse('-1000000', 'KRW') },
        {
          accountId: acct(2),
          units: amounts.parse('750.00', 'USD'),
          weightMinor: 1000000n,
          weightSource: 'actual',
          fxRateText: '1333.333333',
        },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.postings.reduce((s, p) => s + p.weightMinor, 0n)).toBe(0n);
    // Observed on both sides, so nothing here is an estimate.
    expect(r.value.fxEstimated).toBe(false);
  });

  it('case 2: a USD card charge balances because the SAME rate cancels across both legs', () => {
    const r = Txn.create({
      ...base,
      id: id(),
      payee: 'Blue Bottle',
      postings: [
        {
          accountId: acct(1),
          units: amounts.parse('12.50', 'USD'),
          weightMinor: 16667n,
          weightSource: 'rate',
          fxRateText: '1333.33',
        },
        {
          accountId: acct(2),
          units: amounts.parse('-12.50', 'USD'),
          weightMinor: -16667n,
          weightSource: 'rate',
          fxRateText: '1333.33',
        },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.postings.reduce((s, p) => s + p.weightMinor, 0n)).toBe(0n);
    // The KRW settlement is unknown until the statement arrives, so the
    // measurement is provisional and the ledger says so.
    expect(r.value.fxEstimated).toBe(true);
  });

  it('case 3: USD→JPY needs an explicit plug, because two rates do not cross to zero', () => {
    const r = Txn.create({
      ...base,
      id: id(),
      narration: 'Wise USD→JPY',
      postings: [
        { accountId: acct(1), units: amounts.parse('-1000.00', 'USD'), weightMinor: -1300000n, weightSource: 'rate' },
        { accountId: acct(2), units: amounts.parse('150000', 'JPY'), weightMinor: 1300500n, weightSource: 'rate' },
        // The residual is not an error — it is the FX spread, and it belongs on
        // the income statement rather than hidden inside an implied rate.
        { accountId: acct(3), units: amounts.parse('-500', 'KRW'), weightSource: 'plug' },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.postings.reduce((s, p) => s + p.weightMinor, 0n)).toBe(0n);
  });

  it('a plug must be denominated in the booking commodity', () => {
    const r = Txn.create({
      ...base,
      id: id(),
      postings: [
        { accountId: acct(1), units: amounts.parse('-1000.00', 'USD'), weightMinor: -1300000n, weightSource: 'rate' },
        { accountId: acct(2), units: amounts.parse('150000', 'JPY'), weightMinor: 1300000n, weightSource: 'rate' },
        { accountId: acct(3), units: amounts.parse('0.01', 'USD'), weightMinor: 0n, weightSource: 'plug' },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContainEqual({ code: 'plug_not_in_booking_commodity', seq: 2, commodity: 'USD' });
  });

  it('supports a revaluation posting: zero units, non-zero weight', () => {
    // The move that makes revaluation-only FX work. It changes the KRW carrying
    // value without touching the foreign-currency balance — only possible because
    // weight is stored rather than derived from units × rate.
    const r = Txn.create({
      ...base,
      id: id(),
      systemKind: 'fx_revaluation',
      postings: [
        {
          accountId: acct(1),
          units: amounts.fromMinor(0n, 'USD'),
          weightMinor: 100000n,
          weightSource: 'actual',
          kind: 'fx_revaluation',
        },
        { accountId: acct(2), units: amounts.parse('-100000', 'KRW') },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.postings[0]!.units.minor).toBe(0n);
    expect(r.value.postings[0]!.weightMinor).toBe(100000n);
  });
});

describe('Txn.create — properties', () => {
  const weights = fc.array(fc.bigInt({ min: -(2n ** 40n), max: 2n ** 40n }), { minLength: 1, maxLength: 8 });

  it('any weights summing to zero validate', () => {
    fc.assert(
      fc.property(weights, (ws) => {
        // Close the set with a balancing leg, so the sum is zero by construction.
        const all = [...ws, -ws.reduce((a, b) => a + b, 0n)];
        const r = Txn.create({
          ...base,
          id: id(),
          postings: all.map((w, i) => ({ accountId: acct(i), units: amounts.fromMinor(w, 'KRW') })),
        });
        expect(r.ok).toBe(true);
      }),
    );
  });

  it('any weights NOT summing to zero are rejected, at every magnitude', () => {
    fc.assert(
      fc.property(weights, fc.bigInt({ min: 1n, max: 2n ** 30n }), (ws, drift) => {
        const all = [...ws, -ws.reduce((a, b) => a + b, 0n) + drift];
        const r = Txn.create({
          ...base,
          id: id(),
          postings: all.map((w, i) => ({ accountId: acct(i), units: amounts.fromMinor(w, 'KRW') })),
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.error).toContainEqual({ code: 'unbalanced', residualMinor: drift, bookingCommodity: KRW });
      }),
    );
  });
});

describe('ULID', () => {
  it('is monotonic within a millisecond, so the journal sorts deterministically', () => {
    const frozen: UlidClock = { now: () => 1_700_000_000_000, randomBytes: (n) => new Uint8Array(n) };
    const next = createUlidFactory(frozen);
    const ids = Array.from({ length: 1000 }, () => next());
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(1000);
  });
});
