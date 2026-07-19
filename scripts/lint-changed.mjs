import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const LINTABLE = /\.(?:[cm]?[jt]sx?)$/;

export function lintablePaths(paths) {
  return paths.filter((path) => LINTABLE.test(path));
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function main() {
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA ?? 'HEAD';
  if (!baseSha) {
    console.error('✗ BASE_SHA is required');
    process.exit(2);
  }

  const files = lintablePaths(
    git('diff', '--name-only', '--diff-filter=ACMRT', `${baseSha}...${headSha}`)
      .split('\n')
      .filter(Boolean),
  );
  if (files.length === 0) {
    console.log('✓ no changed JavaScript or TypeScript files to lint.');
    return;
  }

  execFileSync('pnpm', ['exec', 'eslint', ...files], { stdio: 'inherit' });
  console.log(`✓ ${files.length} changed JavaScript/TypeScript file(s) pass lint.`);
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) main();
