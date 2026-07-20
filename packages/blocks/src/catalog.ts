import { z } from 'zod';

/**
 * The vocabulary an agent may use to build a dashboard or MDX page.
 *
 * Two decisions are load-bearing:
 *
 * **1. The nouns are 가계부, not shadcn.** The catalog exposes CashRunway and
 * LedgerHealth — not a free-form Card/Grid kit. Layouts stay reviewable.
 *
 * **2. No prop here holds money.** Look for a money field below and there is
 * none. Props are FILTERS. Amounts come from <DataProvider> (API or bake).
 *
 * Schemas are `.strict()` so an `amount` / `balance` key fails loudly instead of
 * being silently ignored. There is no json-render catalog — MDX and the
 * dashboard page mount these components by name.
 */

/** An account code prefix: `Assets`, `Assets:Bank`, `Assets:Bank:Shinhan`. */
const accountPrefix = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9-]*(:[A-Za-z0-9-]+)*$/, 'an account code, e.g. Assets:Bank:Shinhan');

export const blockProps = {
  Dashboard: z
    .object({
      title: z.string().describe('what question this dashboard answers, in the words the user used'),
      asOf: z.string().optional().describe('ISO date the figures are as of'),
    })
    .strict(),

  Row: z
    .object({
      cols: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
    })
    .strict(),

  CashRunway: z
    .object({
      title: z.string().default('현금 런웨이'),
      horizonDays: z.number().int().min(7).max(365).default(90).describe('how far forward to walk'),
    })
    .strict(),

  BalanceTable: z
    .object({
      title: z.string().default('잔액'),
      account: accountPrefix.optional().describe('restrict to a subtree, e.g. Assets:Bank'),
      limit: z.number().int().min(1).max(50).default(20),
    })
    .strict(),

  LedgerHealth: z
    .object({
      title: z.string().default('장부 상태'),
    })
    .strict(),

  CategorizeQueue: z
    .object({
      title: z.string().default('분류 대기'),
      limit: z.number().int().min(1).max(50).default(20),
    })
    .strict(),

  Note: z
    .object({
      body: z.string().describe('plain text. No figures — quote a block instead of retyping it.'),
      tone: z.enum(['neutral', 'warning']).default('neutral'),
    })
    .strict(),
} as const;

export type BlockType = keyof typeof blockProps;

/** Closed list of 가계부 block tags. Anything else is not part of the vocabulary. */
export const BLOCK_TYPES = Object.keys(blockProps) as BlockType[];

export const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
  Dashboard: 'The page frame. Use on the dashboard route; children are other blocks.',
  Row: 'A horizontal group of blocks. Use to put two or three related blocks side by side.',
  CashRunway:
    'Will the cash survive the card bills, 할부, 정기지출 and 정기수입 that are already committed? ' +
    'Walks forward from cash accounts and shows where the balance goes negative, if it does.',
  BalanceTable:
    'Balances per account, each in its own commodity plus its KRW carrying value. ' +
    'Filter with `account` — passing no filter shows everything and is rarely what is wanted.',
  LedgerHealth:
    'Is the ledger trustworthy right now: audit chain intact, balance assertions passing. ' +
    'Show this before other numbers on the page are believed.',
  CategorizeQueue:
    'Drafts waiting for a category, with one-click picks. Interactive ONLY on the locally-running ' +
    'dash; on a deployed snapshot it degrades to a notice.',
  Note:
    'A sentence of context. Do NOT restate a figure: it will not update when the ledger does.',
};

/** Parse props for a known block. Rejects unknown keys (including amount fields). */
export function parseBlockProps<T extends BlockType>(
  type: T,
  props: unknown,
): z.infer<(typeof blockProps)[T]> {
  // Zod 4 + strict generics: parse() widens across the union; assert per-key.
  return blockProps[type].parse(props) as z.infer<(typeof blockProps)[T]>;
}

/** Agent-facing catalog shape (Zod schemas + descriptions). No renderer coupling. */
export const catalog = {
  components: blockProps,
  descriptions: BLOCK_DESCRIPTIONS,
  types: BLOCK_TYPES,
} as const;

export type DashCatalog = typeof catalog;
