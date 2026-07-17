import { describe, expect, it } from 'vitest';

import type { IsoDate } from './account.js';
import type { CommodityCode } from './commodity.js';
import { type FxRate, FxError, convert, formatRate, parseRate, resolveRate } from './fx.js';
import { RATE_SCALE } from './rate.js';

const d = (s: string) => s as IsoDate;
const KRW = 'KRW' as CommodityCode;
const USD = 'USD' as CommodityCode;
const JPY = 'JPY' as CommodityCode;
const EUR = 'EUR' as CommodityCode;

const rate = (over: Partial<FxRate> & Pick<FxRate, 'id' | 'base' | 'quote' | 'rate' | 'asOf'>): FxRate => ({
  source: 'koreaexim',
  fetchedAt: '2026-07-17T00:00:00.000Z',
  ...over,
});

const q = (over: Partial<Parameters<typeof resolveRate>[1]> = {}) => ({
  base: USD,
  quote: KRW,
  asOf: d('2026-07-17'),
  maxStalenessDays: 7,
  functional: KRW,
  ...over,
});

describe('parseRate', () => {
  it('parses a plain decimal', () => {
    expect(parseRate('1333.33')).toBe(1_333_330_000_000_000_000_000n);
    expect(parseRate('1')).toBe(RATE_SCALE);
  });

  it('rejects anything that is not one', () => {
    for (const bad of ['1,333.33', '1.3e3', '-1', '', '₩1333', '0', '0.0']) {
      expect(() => parseRate(bad), bad).toThrow(FxError);
    }
  });

  it('round-trips for display', () => {
    expect(formatRate(parseRate('1333.333333'))).toBe('1333.333333');
    expect(formatRate(parseRate('1300'))).toBe('1300');
  });
});

describe('resolveRate', () => {
  const rates = [
    rate({ id: 'R1', base: USD, quote: KRW, rate: '1333.33', asOf: d('2026-07-17') }),
    rate({ id: 'R2', base: USD, quote: KRW, rate: '1320.00', asOf: d('2026-07-14') }),
    rate({ id: 'R3', base: KRW, quote: JPY, rate: '0.11', asOf: d('2026-07-17') }),
  ];

  it('prefers an exact hit', () => {
    const r = resolveRate(rates, q());
    expect(r.kind).toBe('exact');
    expect(r.rateIds).toEqual(['R1']);
    expect(r.rate).toBe(parseRate('1333.33'));
  });

  it('falls back to the most recent within the staleness window, and says so', () => {
    const r = resolveRate(rates, q({ asOf: d('2026-07-18') }));
    // Nothing on the 18th, so yesterday's 1333.33 — not the older 1320.
    expect(r.kind).toBe('stale');
    expect(r.rateIds).toEqual(['R1']);
    expect(r.explanation).toMatch(/1일 전/);
  });

  it('never reaches back past maxStalenessDays', () => {
    expect(() => resolveRate(rates, q({ asOf: d('2026-08-01') }))).toThrow(FxError);
  });

  it('inverts the opposite pair when that is all there is', () => {
    const r = resolveRate([rate({ id: 'R9', base: KRW, quote: USD, rate: '0.00075', asOf: d('2026-07-17') })], q());
    expect(r.kind).toBe('inverse');
    // 1 / 0.00075 = 1333.33…
    expect(Number(r.rate) / Number(RATE_SCALE)).toBeCloseTo(1333.33, 1);
  });

  it('triangulates through the functional currency', () => {
    // USD→JPY exists nowhere; USD→KRW and KRW→JPY do.
    const r = resolveRate(rates, q({ base: USD, quote: JPY }));
    expect(r.kind).toBe('triangulated');
    expect(r.rateIds).toEqual(['R1', 'R3']);
    // 1333.33 × 0.11 ≈ 146.67
    expect(Number(r.rate) / Number(RATE_SCALE)).toBeCloseTo(146.67, 1);
  });

  it('is a no-op for the same commodity', () => {
    expect(resolveRate([], q({ base: KRW, quote: KRW })).rate).toBe(RATE_SCALE);
  });

  it('NEVER substitutes 1.0 — a missing rate throws', () => {
    // The whole point. Treating USD as KRW would produce a balanced, plausible,
    // catastrophically wrong ledger that nothing downstream would notice.
    expect(() => resolveRate([], q({ base: EUR, quote: KRW }))).toThrow(/will not guess 1\.0/);
  });

  it('ignores rates dated after the transaction', () => {
    // Using tomorrow's rate for today is time travel, and it makes the same
    // transaction resolve differently depending on when you ask.
    const future = [rate({ id: 'F1', base: EUR, quote: KRW, rate: '1500', asOf: d('2026-07-20') })];
    expect(() => resolveRate(future, q({ base: EUR, asOf: d('2026-07-17') }))).toThrow(FxError);
  });

  it('honours a preferred source', () => {
    const mixed = [
      rate({ id: 'A', base: USD, quote: KRW, rate: '1333.33', asOf: d('2026-07-17'), source: 'koreaexim' }),
      rate({ id: 'B', base: USD, quote: KRW, rate: '1340.00', asOf: d('2026-07-17'), source: 'manual' }),
    ];
    expect(resolveRate(mixed, q({ preferredSource: 'manual' })).rateIds).toEqual(['B']);
  });

  it('stamps the rows it used, so a derived weight is reproducible forever', () => {
    // A weight derived from a rate is stored as a fact. This is what lets someone
    // ask, five years later, exactly which rate produced it.
    expect(resolveRate(rates, q({ base: USD, quote: JPY })).rateIds).toHaveLength(2);
  });
});

describe('convert', () => {
  it('converts across different exponents', () => {
    // $750.00 (exp 2) at 1333.33 → ₩999,997.5 → rounds to ₩999,998 (exp 0).
    expect(convert(75000n, parseRate('1333.33'), 2, 0)).toBe(999998n);
  });

  it('converts KRW → USD', () => {
    // ₩1,000,000 (exp 0) at 0.00075 → $750.00 (exp 2)
    expect(convert(1000000n, parseRate('0.00075'), 0, 2)).toBe(75000n);
  });

  it('is exactly why weights are stored rather than derived', () => {
    // ₩1,000,000 → $750.00 → back through the PUBLISHED rate loses ₩2.
    //
    // The loss depends entirely on the rate's precision, which is the point: a
    // rate table publishes what it publishes. At the two decimals Korea Eximbank
    // actually quotes, the round trip does not close, and the ledger would need a
    // tolerance to accept it. Storing the counter-amount as a fact is what makes
    // SUM(weight) = 0 exact regardless of how coarse the quoted rate is.
    const usd = convert(1000000n, parseRate('0.00075'), 0, 2);
    expect(usd).toBe(75000n);

    const back = convert(usd, parseRate('1333.33'), 2, 0);
    expect(back).toBe(999998n);
    expect(back).not.toBe(1000000n);
  });

  it('closes only when the rate happens to carry enough precision', () => {
    // Same trip at six decimals recovers exactly — which is the trap. It works
    // often enough to look fine, and fails on whatever pair your bank quotes
    // coarsely.
    const usd = convert(1000000n, parseRate('0.00075'), 0, 2);
    expect(convert(usd, parseRate('1333.333333'), 2, 0)).toBe(1000000n);
  });
});
