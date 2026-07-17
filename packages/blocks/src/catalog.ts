import { defineCatalog } from '@json-render/core';
// The React schema: what a spec node looks like (type, props, children).
// Ours is the CATALOG on top of it — which component types exist at all.
import { schema } from '@json-render/react';
import { z } from 'zod';

/**
 * The vocabulary an agent may use to build a dashboard.
 *
 * Two decisions are baked in here, and both are load-bearing.
 *
 * **1. The nouns are 가계부, not shadcn.** The catalog does not expose Card, Grid
 * and Chart — it exposes CashRunway and LedgerHealth. A generic catalog means the
 * agent reassembles a dashboard from primitives every time, which is the thing we
 * are trying not to do: layouts drift, the same question gets a different answer
 * each session, and nothing is reviewable. shadcn is still underneath — the
 * registry builds every block out of it — but it is an implementation detail, one
 * layer down. Same lesson as the docs blocks: a closed vocabulary of domain nouns.
 *
 * **2. No prop here holds money.** Look for a z.number() below and there is none.
 * Props are FILTERS — an account prefix, a month, a limit. The agent can say
 * "show the Shinhan balance"; it cannot say "the Shinhan balance is ₩3,000,000".
 * Amounts come from the server reading ledger.db, through <DataProvider>.
 *
 * That is not a style preference. It is the same move as Txn.create() making an
 * unbalanced transaction unrepresentable, and assertEngineTier() making "Notion
 * is not a ledger" structural rather than a claim in a README. A model that can
 * type a number into a dashboard will eventually type the wrong one, and a wrong
 * number in a well-made card is worse than no card at all — it looks correct.
 * Zod is where that gets prevented, not code review.
 */
/** An account code prefix: `Assets`, `Assets:Bank`, `Assets:Bank:Shinhan`. */
const accountPrefix = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9-]*(:[A-Za-z0-9-]+)*$/, 'an account code, e.g. Assets:Bank:Shinhan');

export const catalog = defineCatalog(schema, {
  components: {
    Dashboard: {
      props: z.object({
        title: z.string().describe('what question this dashboard answers, in the words the user used'),
        asOf: z.string().optional().describe('ISO date the figures are as of'),
      }),
      slots: ['children'],
      description: 'The page frame. Exactly one, at the root. Everything else goes inside it.',
    },

    Row: {
      props: z.object({
        cols: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
      }),
      slots: ['children'],
      description: 'A horizontal group of blocks. Use to put two or three related blocks side by side.',
    },

    CashRunway: {
      props: z.object({
        title: z.string().default('현금 런웨이'),
        horizonDays: z.number().int().min(7).max(365).default(90).describe('how far forward to walk'),
      }),
      description:
        'Will the cash survive the card bills, 할부 and 정기지출 that are already committed? ' +
        'Walks forward from cash accounts and shows where the balance goes negative, if it does. ' +
        'This is the single most useful block — show it when the user asks anything about affordability.',
    },

    BalanceTable: {
      props: z.object({
        title: z.string().default('잔액'),
        account: accountPrefix.optional().describe('restrict to a subtree, e.g. Assets:Bank'),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      description:
        'Balances per account, each in its own commodity plus its KRW carrying value. ' +
        'Filter with `account` — passing no filter shows everything and is rarely what is wanted.',
    },

    LedgerHealth: {
      props: z.object({
        title: z.string().default('장부 상태'),
      }),
      description:
        'Is the ledger trustworthy right now: audit chain intact, balance assertions passing, ' +
        'drafts waiting for review. Show this when the user asks whether the books are right, ' +
        'or before they act on any other number on the page.',
    },

    Note: {
      props: z.object({
        body: z.string().describe('plain text. No figures — quote a block instead of retyping it.'),
        tone: z.enum(['neutral', 'warning']).default('neutral'),
      }),
      description:
        'A sentence of context around the blocks. Use for what the numbers do not say. ' +
        'Do NOT restate a figure here: it will not update when the ledger does, and a stale ' +
        'number next to a live one is how a dashboard starts lying.',
    },
  },
  // No actions. A dashboard answers a question; it does not move money.
  //
  // json-render lets a catalog expose actions the model may wire to buttons, and
  // the temptation is obvious: an "approve this draft" button right there next to
  // the review queue. Not yet, and not without thinking hard — every write in this
  // system goes through Txn.create() and a unit of work, and an action dispatched
  // from a rendered spec is a write path that has never been near the domain gate.
  // Read-only is a boundary worth keeping until there is a reason to cross it.
  actions: {},
});

export type DashCatalog = typeof catalog;
