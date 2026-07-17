import { describe, expect, it } from 'vitest';

import type { AccountId, IsoDate } from './account.js';
import type { CommodityCode } from './commodity.js';
import { type ExistingTxn, type ParsedTxn, dedupeKey, findNearDuplicates, normalizeMerchant } from './ingest.js';

const CARD = 'card-acct' as AccountId;
const OTHER = 'other-acct' as AccountId;
const KRW = 'KRW' as CommodityCode;
const d = (s: string) => s as IsoDate;

const parsed = (over: Partial<ParsedTxn> = {}): ParsedTxn => ({
  accountId: CARD,
  date: d('2026-07-17'),
  unitsMinor: -4500n,
  commodity: KRW,
  merchant: '스타벅스 강남점',
  externalRef: null,
  ...over,
});

describe('normalizeMerchant', () => {
  it('strips the corporate form the issuer adds', () => {
    expect(normalizeMerchant('(주)이마트')).toBe('이마트');
    expect(normalizeMerchant('이마트(주)')).toBe('이마트');
    expect(normalizeMerchant('주식회사 카카오')).toBe('카카오');
    expect(normalizeMerchant('(유)한국물산')).toBe('한국물산');
  });

  it('strips card-network separators and collapses whitespace', () => {
    expect(normalizeMerchant('스타벅스*강남점')).toBe('스타벅스 강남점');
    expect(normalizeMerchant('  GS25   역삼점  ')).toBe('gs25 역삼점');
  });

  it('normalizes fullwidth and case, because the same name arrives both ways', () => {
    expect(normalizeMerchant('ＧＳ２５')).toBe('gs25');
    expect(normalizeMerchant('Starbucks')).toBe(normalizeMerchant('STARBUCKS'));
  });

  it('does NOT collapse different branches of the same chain', () => {
    // GS25 역삼점 and GS25 강남점 are different places. Collapsing them makes two
    // real purchases look like one — and this key feeds a duplicate check.
    expect(normalizeMerchant('GS25 역삼점')).not.toBe(normalizeMerchant('GS25 강남점'));
  });

  it('handles nothing at all', () => {
    expect(normalizeMerchant(null)).toBe('');
    expect(normalizeMerchant('   ')).toBe('');
  });
});

describe('dedupeKey', () => {
  it("uses the issuer's transaction id when there is one, and ignores everything else", async () => {
    // The one thing that can tell two identical purchases apart. When present it
    // is authoritative and the merchant string stops mattering.
    const a = await dedupeKey(parsed({ externalRef: 'TX-99' }));
    const b = await dedupeKey(parsed({ externalRef: 'TX-99', merchant: 'totally different' }));
    expect(a.authority).toBe('external_ref');
    expect(a.key).toBe(b.key);
  });

  it('distinguishes different transaction ids', async () => {
    const a = await dedupeKey(parsed({ externalRef: 'TX-1' }));
    const b = await dedupeKey(parsed({ externalRef: 'TX-2' }));
    expect(a.key).not.toBe(b.key);
  });

  it('falls back to a natural key, marked as a guess', async () => {
    const a = await dedupeKey(parsed());
    expect(a.authority).toBe('natural');
    expect(a.key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches the same purchase written two ways', async () => {
    const a = await dedupeKey(parsed({ merchant: '(주)이마트' }));
    const b = await dedupeKey(parsed({ merchant: '이마트' }));
    expect(a.key).toBe(b.key);
  });

  it('separates by account, date, amount and commodity', async () => {
    const base = (await dedupeKey(parsed())).key;
    expect((await dedupeKey(parsed({ accountId: OTHER }))).key).not.toBe(base);
    expect((await dedupeKey(parsed({ date: d('2026-07-18') }))).key).not.toBe(base);
    expect((await dedupeKey(parsed({ unitsMinor: -4501n }))).key).not.toBe(base);
    expect((await dedupeKey(parsed({ commodity: 'USD' as CommodityCode }))).key).not.toBe(base);
  });

  it('gives two identical americanos the SAME natural key — which is why it must not block', async () => {
    // The contradiction in the original plan: it wanted UNIQUE on this key AND
    // acknowledged that two ₩4,500 americanos on one Tuesday is normal. Both
    // cannot hold. The key is identical here, so 'natural' warns and never blocks.
    const a = await dedupeKey(parsed());
    const b = await dedupeKey(parsed());
    expect(a.key).toBe(b.key);
    expect(a.authority).toBe('natural');
  });
});

describe('findNearDuplicates', () => {
  const existing: ExistingTxn[] = [
    { txnId: 'T1', accountId: CARD, date: d('2026-07-15'), unitsMinor: -4500n, commodity: KRW, merchant: '스타벅스 강남점' },
    { txnId: 'T2', accountId: CARD, date: d('2026-07-17'), unitsMinor: -99000n, commodity: KRW, merchant: '이마트' },
    { txnId: 'T3', accountId: OTHER, date: d('2026-07-17'), unitsMinor: -4500n, commodity: KRW, merchant: '스타벅스 강남점' },
  ];

  it('catches the same purchase with the date shifted', () => {
    // The case the exact key cannot see: a card app shows a purchase days before
    // the statement does, and the two arrive as different dates.
    const hits = findNearDuplicates(parsed(), existing);
    expect(hits.map((h) => h.txnId)).toEqual(['T1']);
    expect(hits[0]!.reason).toMatch(/2 day\(s\) apart/);
  });

  it('ignores a different account', () => {
    // T3 is the same amount and merchant but on another card. Not a duplicate.
    expect(findNearDuplicates(parsed(), existing).some((h) => h.txnId === 'T3')).toBe(false);
  });

  it('ignores a different amount', () => {
    expect(findNearDuplicates(parsed({ unitsMinor: -99000n }), existing).map((h) => h.txnId)).toEqual(['T2']);
  });

  it('ignores anything outside the window', () => {
    expect(findNearDuplicates(parsed({ date: d('2026-07-25') }), existing)).toEqual([]);
  });

  it('flags an exact same-day repeat, but says it may be real', () => {
    const twice: ExistingTxn[] = [
      { txnId: 'T9', accountId: CARD, date: d('2026-07-17'), unitsMinor: -4500n, commodity: KRW, merchant: '스타벅스 강남점' },
    ];
    const hits = findNearDuplicates(parsed(), twice);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.reason).toMatch(/may genuinely be a second purchase/);
  });

  it('returns nothing on an empty ledger', () => {
    expect(findNearDuplicates(parsed(), [])).toEqual([]);
  });
});
