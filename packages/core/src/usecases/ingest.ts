import type {
  IngestItemInput,
  IngestSubmission,
  IngestSubmitResponse,
} from '@holiday-cfo/contracts';
import { AmountFactory } from '../domain/amount.js';
import { type Account, type AccountId, type IsoDate, assertIsoDate } from '../domain/account.js';
import { CommodityRegistry, type CommodityCode, WELL_KNOWN_COMMODITIES } from '../domain/commodity.js';
import {
  type ExistingTxn,
  type ParsedTxn,
  dedupeKey,
  findNearDuplicates,
  sha256,
} from '../domain/ingest.js';
import { createUlidFactory } from '../domain/ids.js';
import { Txn, describeTxnError, type PostingInput, type TxnId } from '../domain/txn.js';
import type { LedgerStore } from '../ports/ledger-store.js';
import { addMonthsIso } from './dates.js';
import { AppError } from './errors.js';

const nextUlid = createUlidFactory();
const defaultRegistry = CommodityRegistry.from(WELL_KNOWN_COMMODITIES);

export interface SubmitIngestInput {
  readonly submission: IngestSubmission;
  /** Prefer this over submission.sourceSha256 when the adapter hashed the bytes. */
  readonly imageSha256?: string | null;
  readonly sourceNameHint?: string | null;
  readonly idemKey?: string | null;
  /** Canonical request body used to bind an idempotency key. Defaults to JSON of submission. */
  readonly requestJson?: string;
  readonly functionalCurrency: CommodityCode;
  readonly amounts?: AmountFactory;
  readonly today?: () => string;
  readonly now?: () => string;
}

function pickMoneyLeg(
  postings: readonly { accountId: AccountId; units: { minor: bigint; commodity: CommodityCode } }[],
  byId: ReadonlyMap<AccountId, Account>,
  item: IngestItemInput,
): { accountId: AccountId; units: { minor: bigint; commodity: CommodityCode } } {
  if (item.dedupeOn) {
    const wanted = postings.find((p) => byId.get(p.accountId)?.code === item.dedupeOn);
    if (!wanted) throw new AppError('usage', `dedupeOn names ${item.dedupeOn}, which is not one of the legs`);
    return wanted;
  }
  const money = postings.find((p) => {
    const t = byId.get(p.accountId)?.type;
    return t === 'liability' || t === 'asset';
  });
  if (!money) {
    throw new AppError(
      'usage',
      'no liability or asset leg to identify this transaction by. Add "dedupeOn" naming the card or bank account.',
    );
  }
  return money;
}

function postingFromLeg(
  leg: NonNullable<IngestItemInput['legs']>[number],
  amounts: AmountFactory,
  functionalCurrency: CommodityCode,
  resolve: (code: string) => Account,
): PostingInput {
  const account = resolve(leg.account);
  const units = amounts.parse(leg.amount, leg.commodity);
  const isFunctional = units.commodity === functionalCurrency;
  if (leg.weight !== undefined) {
    if (isFunctional) {
      throw new AppError(
        'usage',
        `leg ${leg.account} is already in ${functionalCurrency}, so weight is meaningless`,
      );
    }
    return {
      accountId: account.id,
      units,
      weightMinor: amounts.parse(leg.weight, functionalCurrency).minor,
      weightSource: 'actual',
    };
  }
  if (!isFunctional) {
    throw new AppError(
      'usage',
      `leg ${leg.account} is in ${units.commodity}, not ${functionalCurrency}; provide weight (@@ total)`,
    );
  }
  return { accountId: account.id, units };
}

/**
 * Record parsed transactions as drafts for human review.
 *
 * Shared by CLI, HTTP API, and MCP. Never does OCR — the caller is the parser.
 */
export async function submitIngest(store: LedgerStore, input: SubmitIngestInput): Promise<IngestSubmitResponse> {
  const amounts = input.amounts ?? new AmountFactory(defaultRegistry);
  const today = input.today ?? (() => new Date().toISOString().slice(0, 10));
  const now = input.now ?? (() => new Date().toISOString());
  const requestJson = input.requestJson ?? JSON.stringify(input.submission);
  const requestSha = await sha256(requestJson);
  const sourceSha = input.imageSha256 ?? input.submission.sourceSha256 ?? null;

  if (input.idemKey) {
    const replay = await store.read((r) => r.getCommandResult(input.idemKey!));
    if (replay) {
      if (replay.requestSha256 !== requestSha) {
        throw new AppError(
          'idem_key_conflict',
          `idem-key ${input.idemKey} was already used for a DIFFERENT request. Keys are per operation.`,
        );
      }
      const parsed = JSON.parse(replay.responseJson) as IngestSubmitResponse;
      return { ...parsed, replayed: true };
    }
  }

  const result = await store.unitOfWork(async (uow) => {
    if (sourceSha) {
      const seen = await uow.findIngestBatchBySha(sourceSha);
      if (seen) {
        throw new AppError(
          'duplicate_image',
          `this exact image was already ingested on ${seen.submittedAt} (${seen.itemCount} item(s)). ` +
            `Dropping the same file twice is always a mistake.`,
        );
      }
    }

    const accounts = await uow.listAccounts();
    const byCode = new Map(accounts.map((a) => [a.code as string, a]));
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const resolve = (code: string): Account => {
      const a = byCode.get(code);
      if (!a) throw new AppError('usage', `no such account: ${code}. Create it before ingesting.`);
      return a;
    };

    const existing: ExistingTxn[] = [];
    for await (const p of uow.streamPostings({ from: addMonthsIso(today(), -2) as IsoDate })) {
      const t = await uow.getTxn(p.txnId);
      existing.push({
        txnId: p.txnId,
        accountId: p.accountId,
        date: p.txnDate,
        unitsMinor: p.unitsMinor,
        commodity: p.commodity,
        merchant: t?.txn.payee ?? null,
      });
    }

    const batchId = nextUlid();
    await uow.recordIngestBatch({
      id: batchId,
      sourceSha256: sourceSha ?? `no-image:${batchId}`,
      sourceName: input.submission.sourceName ?? input.sourceNameHint ?? null,
      submittedAt: now(),
      itemCount: input.submission.items.length,
    });

    const out: IngestSubmitResponse['items'] = [];

    for (const item of input.submission.items) {
      if (!item.legs) {
        throw new AppError(
          'usage',
          'HTTP/MCP ingest currently requires `legs` (full double entry). ' +
            'Statement-shaped `money` items are handled by the CLI classifier path — use `holiday ingest submit`.',
        );
      }
      const postings = item.legs.map((l) => postingFromLeg(l, amounts, input.functionalCurrency, resolve));
      const txn = Txn.create({
        id: nextUlid() as TxnId,
        date: assertIsoDate(item.date),
        bookingCommodity: input.functionalCurrency,
        payee: item.payee ?? null,
        narration: item.narration ?? '',
        sourceItemId: batchId,
        postings,
      });
      if (!txn.ok) throw new AppError('unbalanced', txn.error.map(describeTxnError).join('\n'));

      const moneyLeg = pickMoneyLeg(txn.value.postings, byId, item);
      const candidate: ParsedTxn = {
        accountId: moneyLeg.accountId,
        date: assertIsoDate(item.date),
        unitsMinor: moneyLeg.units.minor,
        commodity: moneyLeg.units.commodity,
        merchant: item.payee ?? null,
        externalRef: item.externalRef ?? null,
      };
      const { key, authority } = await dedupeKey(candidate);

      const priorItems = await uow.findIngestItemsByDedupeKey(key);
      if (authority === 'external_ref' && priorItems.length > 0) {
        throw new AppError(
          'duplicate_external_ref',
          `transaction ${item.externalRef} is already ingested (item ${priorItems[0]!.id}, ` +
            `${priorItems[0]!.status}). The issuer's id says this is the same transaction.`,
        );
      }

      const near = findNearDuplicates(candidate, existing);
      const warnings = near.map(
        (n) => `possible duplicate of ${n.txnId} (${n.date}, ${n.merchant ?? '?'}): ${n.reason}`,
      );
      if (authority === 'natural' && priorItems.length > 0) {
        warnings.push(
          `an earlier ingest had the same account, date, amount and merchant (item ${priorItems[0]!.id}) — ` +
            `but two identical purchases in a day are real, so this is only a warning`,
        );
      }

      await uow.appendTxn(txn.value, { status: 'draft' });
      const itemId = nextUlid();
      await uow.recordIngestItem({
        id: itemId,
        batchId,
        dedupeKey: key,
        dedupeAuthority: authority,
        externalRef: item.externalRef ?? null,
        merchant: item.payee ?? null,
        txnId: txn.value.id,
        status: 'pending',
        reason: null,
        parsedJson: JSON.stringify(item),
        createdAt: now(),
      });
      out.push({ itemId, txnId: txn.value.id, status: 'pending', warnings });
    }
    return { batchId, items: out };
  });

  if (input.idemKey) {
    await store.unitOfWork((uow) =>
      uow.recordCommandResult({
        idemKey: input.idemKey!,
        requestSha256: requestSha,
        responseJson: JSON.stringify(result),
        createdAt: now(),
      }),
    );
  }

  return result;
}
