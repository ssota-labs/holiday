/**
 * Enforces that implementation PRs use an implementation plan already present
 * on the PR base SHA. The base lookup is what prevents adding the plan and code
 * together in a single PR.
 *
 * Environment:
 *   BASE_SHA  PR base commit
 *   HEAD_SHA  PR head commit (defaults to HEAD)
 *   PR_BODY   pull request body containing `Plan: <repo path>`
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';

const PLAN_PATH_RE =
  /^apps\/docs\/content\/docs\/planning\/plans\/[a-z0-9][a-z0-9-]*\.mdx$/;

function frontmatter(source, file) {
  if (!source.startsWith('---\n')) throw new Error(`${file}: frontmatter must start on line 1`);
  const end = source.indexOf('\n---', 4);
  if (end === -1) throw new Error(`${file}: frontmatter is not closed`);
  const result = parse(source.slice(4, end));
  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    throw new Error(`${file}: frontmatter must be a mapping`);
  }
  return result;
}

export function extractPlanPath(prBody) {
  const match = /^\s*(?:[-*]\s*)?Plan:\s*(.+?)\s*$/im.exec(prBody);
  if (!match?.[1]) return null;
  const value = match[1].trim().replace(/^`|`$/g, '');
  return PLAN_PATH_RE.test(value) ? value : null;
}

export function isDocumentationOnlyPath(path) {
  return (
    path.startsWith('apps/docs/content/docs/') ||
    path.startsWith('apps/docs/templates/') ||
    path === 'README.md' ||
    path === 'CHANGELOG.md'
  );
}

function coveredBy(path, codeAreas) {
  return codeAreas.some((area) => {
    const normalized = area.replace(/^\.\//, '').replace(/\/$/, '');
    return path === normalized || path.startsWith(`${normalized}/`);
  });
}

export function validateDocsFirst({ changedPaths, prBody, readBaseFile }) {
  const implementationPaths = changedPaths.filter((path) => !isDocumentationOnlyPath(path));
  if (implementationPaths.length === 0) return [];

  const problems = [];
  const planPath = extractPlanPath(prBody);
  if (!planPath) {
    return [
      'code changes require a valid `Plan: apps/docs/content/docs/planning/plans/plan-*.mdx` entry',
    ];
  }

  let source;
  try {
    source = readBaseFile(planPath);
  } catch {
    return [
      `${planPath}: plan does not exist on the PR base SHA; merge the planning PR first`,
    ];
  }

  let data;
  try {
    data = frontmatter(source, planPath);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }

  if (typeof data.id !== 'string' || !data.id.startsWith('PLAN-')) {
    problems.push(`${planPath}: base plan is missing a PLAN-* id`);
  }
  if (data.stage !== 'ready' && data.stage !== 'active') {
    problems.push(`${planPath}: base plan stage must be ready or active (found ${data.stage ?? '?'})`);
  }
  if (
    !Array.isArray(data.codeAreas) ||
    data.codeAreas.length === 0 ||
    !data.codeAreas.every((area) => typeof area === 'string')
  ) {
    problems.push(`${planPath}: base plan must declare string codeAreas`);
    return problems;
  }

  for (const path of implementationPaths) {
    if (!coveredBy(path, data.codeAreas)) {
      problems.push(`${path}: not covered by ${data.id ?? 'the base plan'} codeAreas`);
    }
  }
  return problems;
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function main() {
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA ?? 'HEAD';
  const prBody = process.env.PR_BODY ?? '';
  if (!baseSha) {
    console.error('✗ BASE_SHA is required');
    process.exit(2);
  }

  const changedPaths = git('diff', '--name-only', '--diff-filter=ACDMRT', `${baseSha}...${headSha}`)
    .split('\n')
    .filter(Boolean);
  const problems = validateDocsFirst({
    changedPaths,
    prBody,
    readBaseFile: (path) => git('show', `${baseSha}:${path}`),
  });

  if (problems.length > 0) {
    console.error(`✗ ${problems.length} problem(s) with docs-first development:\n`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  if (changedPaths.every(isDocumentationOnlyPath)) {
    console.log('✓ documentation-only change; no prior implementation plan required.');
  } else {
    console.log('✓ implementation uses a ready plan from the PR base SHA.');
  }
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) main();
