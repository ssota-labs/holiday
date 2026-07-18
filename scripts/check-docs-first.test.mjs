import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDocsFirst } from './check-docs-first.mjs';

const plan = ({
  stage = 'ready',
  codeAreas = ['packages/core'],
} = {}) => `---
id: PLAN-one
stage: ${stage}
codeAreas: [${codeAreas.join(', ')}]
---
`;

const body = '## Planning\n\nPlan: apps/docs/content/docs/planning/plans/plan-one.mdx\n';

test('allows documentation-only changes without a plan', () => {
  assert.deepEqual(
    validateDocsFirst({
      changedPaths: ['apps/docs/content/docs/planning/prds/prd-one.mdx'],
      prBody: '',
      readBaseFile: () => {
        throw new Error('must not read');
      },
    }),
    [],
  );
});

test('rejects code changes without a Plan entry', () => {
  assert.match(
    validateDocsFirst({
      changedPaths: ['packages/core/src/domain/account.ts'],
      prBody: '',
      readBaseFile: () => plan(),
    }).join('\n'),
    /code changes require a valid/,
  );
});

test('rejects a plan that only exists on the PR head', () => {
  assert.match(
    validateDocsFirst({
      changedPaths: ['packages/core/src/domain/account.ts'],
      prBody: body,
      readBaseFile: () => {
        throw new Error('missing at base');
      },
    }).join('\n'),
    /does not exist on the PR base SHA/,
  );
});

test('accepts a ready base plan covering every changed code path', () => {
  assert.deepEqual(
    validateDocsFirst({
      changedPaths: [
        'packages/core/src/domain/account.ts',
        'apps/docs/content/docs/planning/plans/plan-one.mdx',
      ],
      prBody: body,
      readBaseFile: () => plan(),
    }),
    [],
  );
});

test('rejects draft plans and paths outside codeAreas', () => {
  const problems = validateDocsFirst({
    changedPaths: ['packages/cli/src/cli.ts'],
    prBody: body,
    readBaseFile: () => plan({ stage: 'draft' }),
  }).join('\n');

  assert.match(problems, /stage must be ready or active/);
  assert.match(problems, /not covered by PLAN-one codeAreas/);
});

test('allows exact-file codeAreas', () => {
  assert.deepEqual(
    validateDocsFirst({
      changedPaths: ['AGENTS.md'],
      prBody: body,
      readBaseFile: () => plan({ codeAreas: ['AGENTS.md'] }),
    }),
    [],
  );
});
