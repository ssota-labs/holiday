import { describe, expect, it } from 'vitest';

import { BLOCK_TYPES, parseBlockProps } from './catalog.js';

describe('block props catalog', () => {
  it('lists the closed 가계부 vocabulary', () => {
    expect(BLOCK_TYPES).toEqual([
      'Dashboard',
      'Row',
      'CashRunway',
      'BalanceTable',
      'LedgerHealth',
      'CategorizeQueue',
      'Note',
    ]);
  });

  it('accepts filter props and applies defaults', () => {
    expect(parseBlockProps('CashRunway', {})).toEqual({
      title: '현금 런웨이',
      horizonDays: 90,
    });
    expect(parseBlockProps('BalanceTable', { account: 'Assets:Bank', limit: 5 })).toEqual({
      title: '잔액',
      account: 'Assets:Bank',
      limit: 5,
    });
  });

  it('rejects amount / money props (strict schemas)', () => {
    expect(() => parseBlockProps('CashRunway', { amount: '1000' })).toThrow();
    expect(() => parseBlockProps('BalanceTable', { unitsMinor: '5000' })).toThrow();
    expect(() => parseBlockProps('Note', { body: 'ok', balance: '1' })).toThrow();
    expect(() => parseBlockProps('LedgerHealth', { weightMinor: '0' })).toThrow();
  });

  it('rejects unknown block types at the type list boundary', () => {
    expect(BLOCK_TYPES.includes('MysteryCard' as never)).toBe(false);
  });
});
