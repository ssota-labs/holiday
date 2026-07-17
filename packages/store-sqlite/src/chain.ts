import { createHash } from 'node:crypto';

import type { ValidatedTxn } from '@holiday/core';

/**
 * The audit hash chain.
 *
 * This exists because the ledger deliberately does NOT use git history as its
 * audit mechanism. Something has to supply tamper evidence, and inside a single
 * SQLite file the only thing that can is a chain that commits to its own past.
 *
 * Note how much cheaper this is than the journal it replaced: the serialization
 * below must be stable for a *given hash version*, not byte-identical across
 * every future schema version forever. When the shape changes, bump
 * CHAIN_HASH_VERSION and dispatch — old rows keep verifying under their own
 * recorded version. That escape hatch is exactly what a byte-stable journal
 * could not have.
 */
export const CHAIN_HASH_VERSION = 1;

export const GENESIS_HASH = '0'.repeat(64);

const sha256 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');

/**
 * A deterministic rendering of a sealed transaction.
 *
 * Field order is fixed by this function rather than by object iteration order,
 * and bigints render as decimal strings. Nothing here is sorted by a
 * user-supplied string — payees are Korean business names and `Intl.Collator`
 * disagrees with `<`, which would make the hash machine-dependent.
 */
export function txnContentHash(tx: ValidatedTxn, version = CHAIN_HASH_VERSION): string {
  const parts: string[] = [
    `v${version}`,
    tx.id,
    tx.date,
    tx.bookingCommodity,
    tx.payee ?? '',
    tx.narration,
    tx.systemKind ?? '',
    tx.correctsTxnId ?? '',
    tx.sourceItemId ?? '',
    tx.fxEstimated ? '1' : '0',
    // Already sorted by Txn.create().
    tx.tags.join(','),
    stableJson(tx.meta),
  ];
  // Postings in seq order — an integer, so this is machine-independent.
  for (const p of [...tx.postings].sort((a, b) => a.seq - b.seq)) {
    parts.push(
      [
        p.seq,
        p.accountId,
        p.units.minor.toString(),
        p.units.commodity,
        p.weightMinor.toString(),
        p.weightSource,
        p.fxRateText ?? '',
        p.fxRateId ?? '',
        p.lotId ?? '',
        p.kind,
        p.memo ?? '',
      ].join(''),
    );
  }
  return sha256(parts.join(''));
}

export interface AuditRowInput {
  readonly seq: number;
  readonly at: string;
  readonly event: string;
  readonly subject: string;
  readonly detail: string;
  readonly prevHash: string;
}

export function chainHash(r: AuditRowInput, version = CHAIN_HASH_VERSION): string {
  return sha256(
    [`v${version}`, r.seq.toString(), r.at, r.event, r.subject, r.detail, r.prevHash].join(''),
  );
}

/** Canonical JSON: sorted keys, no floats, bigints as strings. Hashing only. */
export function stableJson(v: unknown): string {
  return JSON.stringify(normalize(v));
}

function normalize(v: unknown): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new TypeError(`cannot hash a non-finite number: ${v}`);
    // A float in hashed content means the hash depends on formatting. Money never
    // travels as a float in this system, so this is a bug, not a case to handle.
    if (!Number.isInteger(v)) throw new TypeError(`cannot hash a non-integer number: ${v}`);
    return v;
  }
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(normalize);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v as Record<string, unknown>).sort()) {
    out[k] = normalize((v as Record<string, unknown>)[k]);
  }
  return out;
}
