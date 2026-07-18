import { z } from 'zod';

/**
 * The contract the vision model writes against.
 *
 * Items arrive as double-entry legs, not as a flat "merchant + amount". That is
 * deliberate: it means `Txn.create()` runs on ingest, so an unbalanced draft
 * cannot even be created, and accepting one later is a status flip that cannot
 * fail. The category is the model's judgement and belongs in the same JSON as
 * everything else it judged.
 *
 * Amounts are decimal STRINGS. JSON.stringify throws on a bigint and a number
 * silently loses precision past 2^53 — the failure this ledger uses bigint
 * everywhere to avoid.
 */
export const INGEST_SUBMISSION = z.object({
  /** sha256 of the image bytes, if the agent has the file. Blocks a re-submit of the same image. */
  sourceSha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  sourceName: z.string().optional(),
  items: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        payee: z.string().optional(),
        narration: z.string().optional(),
        /** The issuer's own transaction id, if the model could read one. Authoritative. */
        externalRef: z.string().optional(),
        /**
         * Which leg is the money side, for duplicate detection. Defaults to the
         * first liability or asset leg — the card or the bank, not the category.
         */
        dedupeOn: z.string().optional(),
        legs: z
          .array(
            z.object({
              account: z.string(),
              amount: z.string(),
              commodity: z.string(),
              /** Total in the booking commodity, for a non-functional leg. Same as `@@`. */
              weight: z.string().optional(),
            }),
          )
          .min(2, { message: 'a transaction needs at least two legs' })
          .optional(),
        /**
         * The statement-shaped alternative to `legs`: just the money side, no
         * category. The CLI completes the double entry — a rule picks the
         * category, or the row parks in Uncategorized as a draft for a human.
         *
         * This is the division of labour the classifier design rests on: the
         * parser extracts FACTS (date, amount, payee, which account moved), the
         * rule table CLASSIFIES, the human arbitrates the leftovers. A parser
         * that also guesses categories bakes its guesses into the same JSON as
         * its facts, where nobody can tell them apart.
         *
         * `amount` is the same decimal string a leg uses, signed from the
         * account's own perspective like the statement: negative = money left
         * it. Functional currency only — a foreign-currency row needs a weight,
         * so it must use `legs` with `@@`.
         */
        money: z
          .object({
            account: z.string(),
            amount: z.string().regex(/^-?\d+(\.\d+)?$/, { message: 'signed decimal, same format as legs' }),
            commodity: z.string(),
          })
          .optional(),
      })
      .refine((i) => !!i.legs !== !!i.money, {
        message: 'each item needs exactly one of `legs` (full double entry) or `money` (statement row)',
      }),
    )
    .min(1, { message: 'nothing to ingest' }),
});

export type IngestSubmission = z.infer<typeof INGEST_SUBMISSION>;
export type IngestItemInput = IngestSubmission['items'][number];
