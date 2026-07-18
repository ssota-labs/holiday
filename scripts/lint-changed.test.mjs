import assert from 'node:assert/strict';
import test from 'node:test';
import { lintablePaths } from './lint-changed.mjs';

test('selects changed JavaScript and TypeScript sources only', () => {
  assert.deepEqual(
    lintablePaths([
      'apps/docs/source.config.ts',
      'scripts/check.mjs',
      'packages/ui/component.tsx',
      'README.md',
      'apps/docs/content/docs/meta.json',
      'pnpm-lock.yaml',
    ]),
    ['apps/docs/source.config.ts', 'scripts/check.mjs', 'packages/ui/component.tsx'],
  );
});
