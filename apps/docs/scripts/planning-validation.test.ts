import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { validatePlanning } from './planning-validation.ts';

function write(root: string, path: string, contents: string): void {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function document(frontmatter: string): string {
  return `---\n${frontmatter.trim()}\n---\n`;
}

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'holiday-planning-'));
  write(
    root,
    'planning/prds/prd-one.mdx',
    document(`
title: PRD-one
id: PRD-one
status: active
stories: [US-one]
`),
  );
  write(root, 'planning/prds/meta.json', '{"pages":["prd-one"]}\n');
  write(
    root,
    'planning/stories/us-one.mdx',
    document(`
title: US-one
id: US-one
`),
  );
  write(root, 'planning/stories/meta.json', '{"pages":["us-one"]}\n');
  write(
    root,
    'spec/development/spec-one.mdx',
    document(`
title: Spec
id: SPEC-one
stage: accepted
`),
  );
  write(root, 'spec/development/meta.json', '{"pages":["spec-one"]}\n');
  write(
    root,
    'planning/plans/plan-one.mdx',
    document(`
title: Plan
id: PLAN-one
stage: ready
changeType: product
prd: PRD-one
specs: [SPEC-one]
stories: [US-one]
codeAreas: [packages/core]
`),
  );
  write(root, 'planning/plans/meta.json', '{"pages":["plan-one"]}\n');
  return root;
}

test('accepts a complete ready product plan', () => {
  const root = fixture();
  try {
    assert.deepEqual(validatePlanning(root), []);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('rejects duplicate IDs and missing references', () => {
  const root = fixture();
  try {
    write(
      root,
      'planning/stories/us-two.mdx',
      document(`
title: Duplicate
id: US-one
`),
    );
    write(root, 'planning/stories/meta.json', '{"pages":["us-one","us-two"]}\n');
    write(
      root,
      'planning/plans/plan-one.mdx',
      document(`
title: Plan
id: PLAN-one
stage: ready
changeType: product
prd: PRD-missing
specs: [SPEC-missing]
stories: [US-missing]
codeAreas: [packages/core]
`),
    );

    const problems = validatePlanning(root).join('\n');
    assert.match(problems, /duplicate id US-one/);
    assert.match(problems, /prd reference does not exist — PRD-missing/);
    assert.match(problems, /spec reference does not exist — SPEC-missing/);
    assert.match(problems, /story reference does not exist — US-missing/);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('rejects a ready plan whose spec is still draft', () => {
  const root = fixture();
  try {
    write(
      root,
      'spec/development/spec-one.mdx',
      document(`
title: Spec
id: SPEC-one
stage: draft
`),
    );

    assert.match(
      validatePlanning(root).join('\n'),
      /ready plan requires accepted spec SPEC-one \(found draft\)/,
    );
  } finally {
    rmSync(root, { recursive: true });
  }
});

test('requires navigation registration and code areas', () => {
  const root = fixture();
  try {
    write(root, 'planning/plans/meta.json', '{"pages":[]}\n');
    write(
      root,
      'planning/plans/plan-one.mdx',
      document(`
title: Plan
id: PLAN-one
stage: ready
changeType: maintenance
`),
    );

    const problems = validatePlanning(root).join('\n');
    assert.match(problems, /plan-one is not registered/);
    assert.match(problems, /at least one codeAreas entry/);
  } finally {
    rmSync(root, { recursive: true });
  }
});
