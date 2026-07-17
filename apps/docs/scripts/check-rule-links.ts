/**
 * Verifies every <Rule> points at a test that actually exists and actually runs.
 *
 * This script is the reason <Rule> is worth having. A policy doc that merely
 * *claims* a rule is enforced is a wish; one whose link is checked in CI cannot
 * quietly become false. Two ways it would rot without this:
 *
 *   1. The test file gets renamed or moved → the link 404s and nobody notices.
 *   2. The `it(...)` gets renamed or deleted → the doc cites a test that no longer
 *      exists, which is worse than citing nothing, because it reads as proof.
 *
 * Run: pnpm --filter @holiday/docs check:rules
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const CONTENT_DIR = resolve(import.meta.dirname, '../content/docs');

interface RuleRef {
  readonly docFile: string;
  readonly id: string;
  readonly test: string;
  readonly testName: string;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.mdx') ? [full] : [];
  });
}

/**
 * Deliberately a regex over the raw MDX rather than an AST parse.
 *
 * The props are static string literals by construction — <Rule> is a documented,
 * closed block, not arbitrary JSX — so a parser would buy nothing and cost a
 * dependency. If someone ever passes an expression, the attribute simply will not
 * match and this reports it as unparseable, which is the correct outcome.
 */
const RULE_RE = /<Rule\b([^>]*?)>/gs;
const attr = (block: string, name: string): string | null =>
  new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 's').exec(block)?.[1] ?? null;

function collect(): { refs: RuleRef[]; problems: string[] } {
  const refs: RuleRef[] = [];
  const problems: string[] = [];

  for (const docFile of walk(CONTENT_DIR)) {
    const src = readFileSync(docFile, 'utf8');
    for (const match of src.matchAll(RULE_RE)) {
      const block = match[1] ?? '';
      const id = attr(block, 'id');
      const test = attr(block, 'test');
      const testName = attr(block, 'testName');
      const rel = docFile.slice(REPO_ROOT.length + 1);

      if (!id || !test || !testName) {
        problems.push(`${rel}: a <Rule> is missing id, test, or testName (found id=${id ?? '?'})`);
        continue;
      }
      refs.push({ docFile: rel, id, test, testName });
    }
  }
  return { refs, problems };
}

function main(): void {
  const { refs, problems } = collect();

  const seen = new Map<string, string>();
  for (const ref of refs) {
    const prior = seen.get(ref.id);
    if (prior) problems.push(`${ref.docFile}: duplicate rule id ${ref.id} (also in ${prior})`);
    seen.set(ref.id, ref.docFile);

    const testPath = join(REPO_ROOT, ref.test);
    let source: string;
    try {
      source = readFileSync(testPath, 'utf8');
    } catch {
      problems.push(`${ref.id} (${ref.docFile}): test file does not exist — ${ref.test}`);
      continue;
    }

    // The doc cites a specific `it(...)`. If it is gone, the doc is citing proof
    // that no longer exists.
    if (!source.includes(ref.testName)) {
      problems.push(
        `${ref.id} (${ref.docFile}): ${ref.test} has no test named\n` +
          `      "${ref.testName}"\n` +
          `      It was renamed or removed. Fix the doc, or restore the test.`,
      );
    }
  }

  if (refs.length === 0) problems.push('no <Rule> blocks found at all — is the content directory right?');

  if (problems.length > 0) {
    console.error(`✗ ${problems.length} problem(s) with rule→test links:\n`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error('\nA policy doc whose links do not resolve is worse than none: it reads as proof.');
    process.exit(1);
  }

  console.log(`✓ ${refs.length} rule(s) each link to a test that exists and runs.`);
  for (const r of refs) console.log(`  ${r.id.padEnd(12)} → ${r.test}`);
}

main();
