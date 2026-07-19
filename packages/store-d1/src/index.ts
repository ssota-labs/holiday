import {
  assertEngineTier,
  type LedgerStore,
  type LedgerUow,
  type LedgerRead,
  type StoreCapabilities,
} from '@holiday-cfo/core';

/**
 * Cloudflare D1 adapter — intentionally NOT engine-tier.
 *
 * D1 provides atomic `batch()` but does not offer interactive BEGIN/COMMIT
 * transactions matching `LedgerStore.unitOfWork`. Claiming engine tier would
 * lie about serializable multi-statement read-your-writes inside a callback.
 *
 * Until a future D1 runtime gains interactive transactions AND this package
 * passes the full `@holiday-cfo/store-testkit` suite, ChatGPT Sites stays in
 * fax inbox + review/export mode. Failures are not hidden behind capability flags.
 */
export const D1_ENGINE_ELIGIBLE = false;

export const d1Capabilities: StoreCapabilities = {
  tier: 'projection',
  atomicMultiRowWrite: true,
  uniqueConstraints: true,
  readAfterWriteConsistency: false,
  serverSideAggregation: false,
  predicatePushdown: false,
  enforcesInvariantsAtRest: false,
  maxWriteOpsPerSecond: null,
};

export class D1NotEngineError extends Error {
  constructor() {
    super(
      '@holiday-cfo/store-d1 refuses to act as a holiday engine ledger. ' +
        'D1 lacks interactive unitOfWork. Use inbox-export mode on ChatGPT Sites, ' +
        'or Vercel+Supabase (Postgres) for an engine-tier remote ledger.',
    );
    this.name = 'D1NotEngineError';
  }
}

/** Factory that always throws when asked to open as an engine SoR. */
export function d1LedgerStore(_binding: unknown): LedgerStore {
  const caps = d1Capabilities;
  return {
    name: 'd1',
    capabilities: caps,
    async init() {
      assertEngineTier('d1', { ...caps, tier: 'engine' });
      throw new D1NotEngineError();
    },
    async migrate() {
      throw new D1NotEngineError();
    },
    async close() {},
    async unitOfWork<T>(_fn: (uow: LedgerUow) => Promise<T>): Promise<T> {
      throw new D1NotEngineError();
    },
    async read<T>(_fn: (r: LedgerRead) => Promise<T>): Promise<T> {
      throw new D1NotEngineError();
    },
  };
}
