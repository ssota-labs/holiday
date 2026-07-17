import type { AccountId, IsoDate } from './account.js';
import type { CommodityCode } from './commodity.js';

/**
 * Ingest — turning a screenshot into a ledger entry.
 *
 * The CLI never does OCR. The agent's vision model reads the image and hands over
 * parsed JSON; this decides whether it is new, and the review gate decides whether
 * it is right. That split matters: the model is the least reliable component in
 * the system, and everything here exists to keep its mistakes recoverable.
 */

/** Bump when normalizeMerchant or the key shape changes — it invalidates every stored key. */
export const DEDUPE_KEY_VERSION = 1;

/**
 * How sure are we that this is the same transaction we already have?
 *
 * The plan this was built from had these as one thing, and it contradicted
 * itself: it wanted a UNIQUE constraint on (account, date, amount, merchant)
 * *and* acknowledged that two ₩4,500 americanos at the same cafe on the same day
 * is a normal Tuesday. Both cannot be true — that key is identical for the two
 * americanos, and blocking on it means refusing a real purchase.
 *
 * So authority is tiered:
 */
export type DedupeAuthority =
  /** The identical image bytes, already ingested. Blocks — you dropped the same file twice. */
  | 'image'
  /** The issuer's own transaction id. Blocks — nothing is more authoritative about their record. */
  | 'external_ref'
  /** account+date+amount+merchant. WARNS ONLY. Two identical purchases are a real thing. */
  | 'natural';

export interface ParsedTxn {
  readonly accountId: AccountId;
  readonly date: IsoDate;
  /** Signed, in minor units of `commodity`, from the funded account's point of view. */
  readonly unitsMinor: bigint;
  readonly commodity: CommodityCode;
  readonly merchant: string | null;
  /** The issuer's transaction id, if the model could read one. Authoritative when present. */
  readonly externalRef: string | null;
}

const KOREAN_CORP_PATTERNS: readonly RegExp[] = [
  /\(주\)/g,
  /\（주\）/g,
  /주식회사/g,
  /\(유\)/g,
  /유한회사/g,
];

/**
 * Normalize a merchant name for comparison.
 *
 * Deliberately conservative. This feeds a key that is only ever used to *warn*,
 * so being too loose costs a false warning the user dismisses — annoying. Being
 * too loose on a key that *blocked* would refuse real purchases, which is why the
 * natural key does not block.
 *
 * What is stripped is noise the issuer adds and the user did not choose: the
 * corporate form (주식회사, (주)) and the card network's separators. Store
 * branches are NOT stripped: `GS25 역삼점` and `GS25 강남점` are different places,
 * and collapsing them makes two real purchases look like one.
 */
export function normalizeMerchant(raw: string | null): string {
  if (!raw) return '';
  let s = raw.normalize('NFKC').toLowerCase();
  for (const p of KOREAN_CORP_PATTERNS) s = s.replace(p, ' ');
  // Card networks pad names with '*' and control characters.
  s = s.replace(/[*_|]+/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * The comparison key. Async because it hashes — WebCrypto has no sync digest.
 *
 * `externalRef` wins outright when present: the issuer's id is the one thing that
 * can distinguish those two americanos, and it makes the merchant string
 * irrelevant. Without it, the natural key is the best available guess, and it is
 * treated as exactly that.
 */
export async function dedupeKey(t: ParsedTxn): Promise<{ key: string; authority: DedupeAuthority }> {
  if (t.externalRef) {
    return { key: await sha256(`v${DEDUPE_KEY_VERSION}|ref|${t.accountId}|${t.externalRef}`), authority: 'external_ref' };
  }
  const parts = [
    `v${DEDUPE_KEY_VERSION}`,
    'nat',
    t.accountId,
    t.date,
    t.unitsMinor.toString(),
    t.commodity,
    normalizeMerchant(t.merchant),
  ];
  return { key: await sha256(parts.join('|')), authority: 'natural' };
}

export async function sha256(s: string): Promise<string> {
  const bytes = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface NearDuplicate {
  readonly txnId: string;
  readonly date: IsoDate;
  readonly merchant: string | null;
  readonly unitsMinor: bigint;
  readonly reason: string;
}

export interface ExistingTxn {
  readonly txnId: string;
  readonly accountId: AccountId;
  readonly date: IsoDate;
  readonly unitsMinor: bigint;
  readonly commodity: CommodityCode;
  readonly merchant: string | null;
}

/** Statement-vs-app timing skew. A card app shows a purchase days before the statement does. */
const NEAR_DAYS = 3;

/**
 * Possible duplicates, for the human to look at. Never blocks.
 *
 * Catches the case the exact key cannot: the same purchase seen twice with the
 * date shifted, because the card app and the statement disagree about when it
 * happened. Same account, same amount, ±3 days, similar merchant.
 */
export function findNearDuplicates(candidate: ParsedTxn, existing: readonly ExistingTxn[]): NearDuplicate[] {
  const m = normalizeMerchant(candidate.merchant);
  return existing
    .filter((e) => {
      if (e.accountId !== candidate.accountId) return false;
      if (e.commodity !== candidate.commodity) return false;
      if (e.unitsMinor !== candidate.unitsMinor) return false;
      return Math.abs(daysBetween(e.date, candidate.date)) <= NEAR_DAYS;
    })
    .map((e) => {
      const em = normalizeMerchant(e.merchant);
      const sameDay = e.date === candidate.date;
      const sameMerchant = em === m && m !== '';
      return {
        txnId: e.txnId,
        date: e.date,
        merchant: e.merchant,
        unitsMinor: e.unitsMinor,
        reason: sameDay
          ? sameMerchant
            ? 'same account, amount, merchant and date — but this may genuinely be a second purchase'
            : 'same account, amount and date'
          : `same account and amount, ${Math.abs(daysBetween(e.date, candidate.date))} day(s) apart — the app and the statement often disagree on the date`,
      };
    });
}

function daysBetween(a: IsoDate, b: IsoDate): number {
  const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}
