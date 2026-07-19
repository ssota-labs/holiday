import { describe, expect, it } from 'vitest';
import { TierContractError } from '@holiday-cfo/core';
import { D1_ENGINE_ELIGIBLE, D1NotEngineError, d1Capabilities, d1LedgerStore } from './index.js';

describe('@holiday-cfo/store-d1 gate', () => {
  it('does not claim engine eligibility', () => {
    expect(D1_ENGINE_ELIGIBLE).toBe(false);
    expect(d1Capabilities.tier).toBe('projection');
    expect(d1Capabilities.readAfterWriteConsistency).toBe(false);
  });

  it('refuses init when forced through assertEngineTier', async () => {
    const store = d1LedgerStore({});
    await expect(store.init()).rejects.toBeInstanceOf(TierContractError);
  });

  it('refuses unitOfWork rather than faking interactive transactions', async () => {
    const store = d1LedgerStore({});
    await expect(store.unitOfWork(async () => 1)).rejects.toBeInstanceOf(D1NotEngineError);
  });
});
