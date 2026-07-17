import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { AmountFactory, AmountScaleError } from './amount.js';
import { CommodityRegistry, WELL_KNOWN_COMMODITIES } from './commodity.js';

const registry = CommodityRegistry.from(WELL_KNOWN_COMMODITIES);
const amounts = new AmountFactory(registry);

describe('AmountFactory.parse', () => {
  it('scales by the commodity exponent, not by the input', () => {
    expect(amounts.parse('1234.56', 'USD').minor).toBe(123456n);
    expect(amounts.parse('1234', 'KRW').minor).toBe(1234n);
    expect(amounts.parse('0.00000001', 'BTC').minor).toBe(1n);
  });

  it('accepts fewer decimals than the exponent', () => {
    // "$1234.5" is unambiguously $1234.50.
    expect(amounts.parse('1234.5', 'USD').minor).toBe(123450n);
  });

  it('REJECTS more decimals than the commodity can represent', () => {
    // The headline guarantee. A vision model that reads "₩1,234.56" off a
    // screenshot is hallucinating a minor unit KRW does not have, and we would
    // rather fail loudly than silently store 1234 or 123456.
    expect(() => amounts.parse('1234.56', 'KRW')).toThrow(AmountScaleError);
    expect(() => amounts.parse('1.234', 'USD')).toThrow(AmountScaleError);
  });

  it('rejects anything that is not a plain decimal', () => {
    for (const bad of ['1e3', '1_000', '₩1234', '1,234', '+5', '', ' ', 'NaN', 'Infinity', '.5', '5.']) {
      expect(() => amounts.parse(bad, 'USD'), bad).toThrow(TypeError);
    }
  });

  it('handles negatives and zero', () => {
    expect(amounts.parse('-4500', 'KRW').minor).toBe(-4500n);
    expect(amounts.parse('-0.01', 'USD').minor).toBe(-1n);
    expect(amounts.parse('0', 'KRW').minor).toBe(0n);
  });

  it('throws on an unregistered commodity rather than guessing a scale', () => {
    expect(() => amounts.parse('100', 'XYZ')).toThrow(/unknown commodity/);
  });
});

describe('AmountFactory.format', () => {
  it('renders at the commodity exponent', () => {
    expect(amounts.format(amounts.fromMinor(123456n, 'USD'))).toBe('1234.56');
    expect(amounts.format(amounts.fromMinor(1234n, 'KRW'))).toBe('1234');
    expect(amounts.format(amounts.fromMinor(1n, 'USD'))).toBe('0.01');
    expect(amounts.format(amounts.fromMinor(-1n, 'USD'))).toBe('-0.01');
    expect(amounts.format(amounts.fromMinor(0n, 'USD'))).toBe('0.00');
    expect(amounts.format(amounts.fromMinor(1n, 'BTC'))).toBe('0.00000001');
  });

  it('round-trips parse ∘ format for every commodity', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...WELL_KNOWN_COMMODITIES.map((c) => c.code as string)),
        fc.bigInt({ min: -(2n ** 62n), max: 2n ** 62n }),
        (code, minor) => {
          const a = amounts.fromMinor(minor, code);
          const text = amounts.format(a);
          expect(amounts.parse(text, code).minor).toBe(minor);
        },
      ),
    );
  });
});

describe('range', () => {
  it('rejects amounts outside i64', () => {
    expect(() => amounts.fromMinor(2n ** 63n, 'KRW')).toThrow(/i64/);
    expect(() => amounts.fromMinor(-(2n ** 63n) - 1n, 'KRW')).toThrow(/i64/);
  });
});

describe('CommodityRegistry', () => {
  it('refuses to change an exponent, because that silently rescales history', () => {
    const r = CommodityRegistry.from(WELL_KNOWN_COMMODITIES);
    expect(() => r.register({ code: 'KRW' as never, exponent: 2, kind: 'fiat', name: 'Won' })).toThrow(
      /immutable/,
    );
  });

  it('rejects an exponent past the i64 ceiling (no 18-decimal tokens)', () => {
    const r = new CommodityRegistry();
    expect(() => r.register({ code: 'WEI' as never, exponent: 18, kind: 'crypto', name: 'wei' })).toThrow(
      /\[0, 9\]/,
    );
  });

  it('is deterministically ordered', () => {
    const r = CommodityRegistry.from([...WELL_KNOWN_COMMODITIES].reverse());
    expect(r.all().map((c) => c.code)).toEqual([...r.all().map((c) => c.code)].sort());
  });
});
