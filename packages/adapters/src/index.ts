/**
 * Framework-free adapter helpers shared by CLI, generated HTTP routes, and MCP.
 *
 * Vendor SDKs (Next, Vercel, vinext, Supabase, D1, R2) stay in deploy templates —
 * this package only maps HTTP-ish / tool-ish I/O onto shared usecases.
 */
import {
  AccountListResponse,
  ErrorEnvelope,
  IngestSubmission,
  IngestSubmitResponse,
  ReviewAcceptResponse,
  ReviewListResponse,
  ReviewRejectResponse,
  VerifyResponse,
  type ErrorCode,
} from '@holiday-cfo/contracts';
import {
  AppError,
  acceptReview,
  listAccounts,
  listPendingReviews,
  rejectReview,
  submitIngest,
  verifyLedger,
  type CommodityCode,
  type LedgerStore,
} from '@holiday-cfo/core';

export type HolidayFacade = {
  readonly store: LedgerStore;
  readonly functionalCurrency: CommodityCode;
  readonly chainHead?: () => Promise<{ seq: number; hash: string } | null>;
};

export type JsonResult<T> =
  | { readonly ok: true; readonly status: number; readonly body: T }
  | { readonly ok: false; readonly status: number; readonly body: ErrorEnvelope };

function fail(code: ErrorCode, message: string, status: number): JsonResult<never> {
  return { ok: false, status, body: { error: { code, message } } };
}

function fromAppError(e: unknown): JsonResult<never> {
  if (e instanceof AppError) {
    const status =
      e.code === 'usage' || e.code === 'unbalanced'
        ? 400
        : e.code === 'not_found'
          ? 404
          : e.code === 'unauthorized'
            ? 401
            : e.code === 'idem_key_conflict' ||
                e.code === 'duplicate_image' ||
                e.code === 'duplicate_source' ||
                e.code === 'duplicate_external_ref' ||
                e.code === 'conflict'
              ? 409
              : e.code === 'verify_failed'
                ? 422
                : 500;
    return fail(e.code, e.message, status);
  }
  const message = e instanceof Error ? e.message : String(e);
  return fail('internal', message, 500);
}

/** MCP tool descriptors — adapters wrap these with their host SDK. */
export const MCP_TOOLS = [
  {
    name: 'holiday_account_list',
    description: 'List ledger accounts',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'holiday_ingest_submit',
    description: 'Submit parsed double-entry items as drafts for human review',
    inputSchema: {
      type: 'object',
      required: ['submission'],
      properties: {
        submission: { type: 'object' },
        idemKey: { type: 'string' },
        imageSha256: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'holiday_review_list',
    description: 'List pending ingest drafts awaiting human review',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'holiday_review_accept',
    description: 'Promote a pending draft to posted',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'holiday_review_reject',
    description: 'Reject a pending draft (row kept for dedup memory)',
    inputSchema: {
      type: 'object',
      required: ['id', 'reason'],
      properties: { id: { type: 'string' }, reason: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'holiday_verify',
    description: 'Verify ledger invariants and audit hash chain',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
] as const;

export async function dispatchMcpTool(
  facade: HolidayFacade,
  name: string,
  args: Record<string, unknown>,
): Promise<JsonResult<unknown>> {
  try {
    switch (name) {
      case 'holiday_account_list': {
        const body = AccountListResponse.parse(await listAccounts(facade.store));
        return { ok: true, status: 200, body };
      }
      case 'holiday_ingest_submit': {
        const submission = IngestSubmission.parse(args.submission);
        const body = IngestSubmitResponse.parse(
          await submitIngest(facade.store, {
            submission,
            functionalCurrency: facade.functionalCurrency,
            idemKey: typeof args.idemKey === 'string' ? args.idemKey : null,
            imageSha256: typeof args.imageSha256 === 'string' ? args.imageSha256 : null,
            requestJson: JSON.stringify(submission),
          }),
        );
        return { ok: true, status: 200, body };
      }
      case 'holiday_review_list': {
        const body = ReviewListResponse.parse(await listPendingReviews(facade.store));
        return { ok: true, status: 200, body };
      }
      case 'holiday_review_accept': {
        if (typeof args.id !== 'string') return fail('usage', 'id is required', 400);
        const body = ReviewAcceptResponse.parse(await acceptReview(facade.store, args.id));
        return { ok: true, status: 200, body };
      }
      case 'holiday_review_reject': {
        if (typeof args.id !== 'string' || typeof args.reason !== 'string') {
          return fail('usage', 'id and reason are required', 400);
        }
        const body = ReviewRejectResponse.parse(await rejectReview(facade.store, args.id, args.reason));
        return { ok: true, status: 200, body };
      }
      case 'holiday_verify': {
        const body = VerifyResponse.parse(
          await verifyLedger(facade.store, {
            ...(facade.chainHead ? { chainHead: facade.chainHead } : {}),
            throwOnFailure: false,
          }),
        );
        return { ok: true, status: body.ok ? 200 : 422, body };
      }
      default:
        return fail('not_found', `unknown tool: ${name}`, 404);
    }
  } catch (e) {
    return fromAppError(e);
  }
}

export interface HttpDispatchInput {
  readonly method: string;
  readonly path: string;
  readonly body?: unknown;
  readonly headers?: Record<string, string | undefined>;
}

/**
 * Minimal HTTP router for BYOC templates and contract tests.
 *
 * Paths (no trailing slash):
 *   GET  /health
 *   GET  /accounts
 *   POST /ingest/submit
 *   GET  /review
 *   POST /review/:id/accept
 *   POST /review/:id/reject
 *   POST /verify
 *   POST /mcp   (JSON-RPC-ish { name, arguments })
 */
export async function dispatchHttp(
  facade: HolidayFacade,
  input: HttpDispatchInput,
): Promise<JsonResult<unknown>> {
  const method = input.method.toUpperCase();
  const path = input.path.replace(/\/+$/, '') || '/';

  try {
    if (method === 'GET' && path === '/health') {
      return { ok: true, status: 200, body: { ok: true } };
    }
    if (method === 'GET' && path === '/accounts') {
      return { ok: true, status: 200, body: AccountListResponse.parse(await listAccounts(facade.store)) };
    }
    if (method === 'POST' && path === '/ingest/submit') {
      const raw = (input.body ?? {}) as Record<string, unknown>;
      const submission = IngestSubmission.parse(raw.submission ?? raw);
      const body = IngestSubmitResponse.parse(
        await submitIngest(facade.store, {
          submission,
          functionalCurrency: facade.functionalCurrency,
          idemKey: typeof raw.idemKey === 'string' ? raw.idemKey : null,
          imageSha256: typeof raw.imageSha256 === 'string' ? raw.imageSha256 : null,
          requestJson: JSON.stringify(submission),
        }),
      );
      return { ok: true, status: 200, body };
    }
    if (method === 'GET' && path === '/review') {
      return { ok: true, status: 200, body: ReviewListResponse.parse(await listPendingReviews(facade.store)) };
    }
    const accept = /^\/review\/([^/]+)\/accept$/.exec(path);
    if (method === 'POST' && accept) {
      const body = ReviewAcceptResponse.parse(await acceptReview(facade.store, decodeURIComponent(accept[1]!)));
      return { ok: true, status: 200, body };
    }
    const reject = /^\/review\/([^/]+)\/reject$/.exec(path);
    if (method === 'POST' && reject) {
      const reason = (input.body as { reason?: string } | undefined)?.reason;
      if (!reason) return fail('usage', 'reason is required', 400);
      const body = ReviewRejectResponse.parse(
        await rejectReview(facade.store, decodeURIComponent(reject[1]!), reason),
      );
      return { ok: true, status: 200, body };
    }
    if (method === 'POST' && path === '/verify') {
      const body = VerifyResponse.parse(
        await verifyLedger(facade.store, {
          ...(facade.chainHead ? { chainHead: facade.chainHead } : {}),
          throwOnFailure: false,
        }),
      );
      return { ok: true, status: body.ok ? 200 : 422, body };
    }
    if (method === 'POST' && path === '/mcp') {
      const raw = (input.body ?? {}) as { name?: string; arguments?: Record<string, unknown> };
      if (!raw.name) return fail('usage', 'name is required', 400);
      return dispatchMcpTool(facade, raw.name, raw.arguments ?? {});
    }
    return fail('not_found', `no route ${method} ${path}`, 404);
  } catch (e) {
    return fromAppError(e);
  }
}
