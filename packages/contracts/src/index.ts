import { z } from 'zod';

/**
 * Shared JSON contracts for CLI · HTTP API · MCP.
 *
 * Amounts are decimal STRINGS. JSON has no i64, and a number silently loses
 * precision past 2^53 — the failure this ledger uses bigint everywhere to avoid.
 * Adapters must not coerce these to Number.
 */

export const ERROR_CODES = [
  'usage',
  'not_found',
  'duplicate_image',
  'duplicate_source',
  'duplicate_external_ref',
  'unbalanced',
  'idem_key_conflict',
  'verify_failed',
  'unauthorized',
  'conflict',
  'internal',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const ErrorEnvelope = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export const IngestLeg = z.object({
  account: z.string(),
  amount: z.string(),
  commodity: z.string(),
  /** Total in the booking commodity, for a non-functional leg. Same as `@@`. */
  weight: z.string().optional(),
});
export type IngestLeg = z.infer<typeof IngestLeg>;

export const IngestMoney = z.object({
  account: z.string(),
  amount: z.string().regex(/^-?\d+(\.\d+)?$/, { message: 'signed decimal, same format as legs' }),
  commodity: z.string(),
});
export type IngestMoney = z.infer<typeof IngestMoney>;

export const IngestItemInput = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    payee: z.string().optional(),
    narration: z.string().optional(),
    externalRef: z.string().optional(),
    dedupeOn: z.string().optional(),
    legs: z.array(IngestLeg).min(2, { message: 'a transaction needs at least two legs' }).optional(),
    /**
     * Statement-shaped alternative to `legs`: money side only. The CLI completes
     * double entry via rules / Uncategorized draft.
     */
    money: IngestMoney.optional(),
  })
  .refine((i) => !!i.legs !== !!i.money, {
    message: 'each item needs exactly one of `legs` (full double entry) or `money` (statement row)',
  });
export type IngestItemInput = z.infer<typeof IngestItemInput>;

/**
 * The contract the vision model (or fax agent) writes against.
 *
 * Items arrive as either full double-entry `legs` or statement-shaped `money`.
 */
export const IngestSubmission = z.object({
  sourceSha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  sourceName: z.string().optional(),
  items: z.array(IngestItemInput).min(1, { message: 'nothing to ingest' }),
});
export type IngestSubmission = z.infer<typeof IngestSubmission>;

export const IngestSubmitRequest = z.object({
  submission: IngestSubmission,
  imageSha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  idemKey: z.string().min(1).optional(),
  requestJson: z.string().optional(),
});
export type IngestSubmitRequest = z.infer<typeof IngestSubmitRequest>;

export const IngestItemResult = z.object({
  itemId: z.string(),
  txnId: z.string(),
  status: z.enum(['pending', 'posted']),
  warnings: z.array(z.string()),
  category: z.string().optional(),
  matchedRuleId: z.string().nullable().optional(),
});
export type IngestItemResult = z.infer<typeof IngestItemResult>;

export const IngestSubmitResponse = z.object({
  batchId: z.string(),
  items: z.array(IngestItemResult),
  replayed: z.boolean().optional(),
});
export type IngestSubmitResponse = z.infer<typeof IngestSubmitResponse>;

export const ReviewListItem = z.object({
  id: z.string(),
  txnId: z.string().nullable(),
  date: z.string().optional(),
  payee: z.string().nullable().optional(),
  merchant: z.string().nullable(),
  status: z.literal('pending'),
});
export type ReviewListItem = z.infer<typeof ReviewListItem>;

export const ReviewListResponse = z.object({
  items: z.array(ReviewListItem),
});
export type ReviewListResponse = z.infer<typeof ReviewListResponse>;

export const ReviewAcceptRequest = z.object({
  id: z.string().min(1),
  idemKey: z.string().min(1).optional(),
  category: z.string().optional(),
});
export type ReviewAcceptRequest = z.infer<typeof ReviewAcceptRequest>;

export const ReviewAcceptResponse = z.object({
  id: z.string(),
  txnId: z.string(),
  status: z.literal('accepted'),
});
export type ReviewAcceptResponse = z.infer<typeof ReviewAcceptResponse>;

export const ReviewRejectRequest = z.object({
  id: z.string().min(1),
  reason: z.string().min(1),
});
export type ReviewRejectRequest = z.infer<typeof ReviewRejectRequest>;

export const ReviewRejectResponse = z.object({
  id: z.string(),
  status: z.literal('rejected'),
  reason: z.string(),
});
export type ReviewRejectResponse = z.infer<typeof ReviewRejectResponse>;

export const AccountListItem = z.object({
  id: z.string(),
  code: z.string(),
  type: z.string(),
  commodity: z.string().nullable(),
  cash: z.boolean(),
  placeholder: z.boolean(),
  monetary: z.boolean(),
});
export type AccountListItem = z.infer<typeof AccountListItem>;

export const AccountListResponse = z.object({
  accounts: z.array(AccountListItem),
});
export type AccountListResponse = z.infer<typeof AccountListResponse>;

export const VerifyResponse = z.object({
  ok: z.boolean(),
  checked: z.number().int(),
  problems: z.array(
    z.object({
      kind: z.string(),
      subject: z.string().optional(),
      detail: z.string(),
    }),
  ),
  head: z
    .object({
      seq: z.number().int(),
      hash: z.string(),
    })
    .nullable()
    .optional(),
});
export type VerifyResponse = z.infer<typeof VerifyResponse>;
