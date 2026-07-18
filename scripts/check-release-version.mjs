#!/usr/bin/env node
/**
 * Refuse to publish unless the git tag matches every public package's version.
 *
 * The tag is the source of truth for a release: `v0.2.0` publishes 0.2.0. If a
 * package.json still says 0.1.0, npm would publish that instead — and there is no
 * unpublish for a version that has been live for more than 72 hours. A mismatch is
 * a mistake that cannot be taken back, so it fails the release before anything
 * reaches the registry rather than after.
 *
 * All public packages share one version on purpose. A single ledger format spans
 * core, the stores, and the CLI; letting them drift apart is how someone installs
 * a cli that expects a core it did not get.
 *
 * Usage: node scripts/check-release-version.mjs v0.2.0
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const tag = process.argv[2];
if (!tag) {
  console.error('usage: check-release-version.mjs <tag>');
  process.exit(2);
}
const want = tag.replace(/^v/, '');
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(want)) {
  console.error(`✗ tag ${tag} is not a semver version`);
  process.exit(2);
}

const pkgsDir = new URL('../packages/', import.meta.url).pathname;
const problems = [];
const checked = [];
for (const name of readdirSync(pkgsDir)) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(join(pkgsDir, name, 'package.json'), 'utf8'));
  } catch {
    continue;
  }
  if (pkg.private) continue; // config packages are not published
  checked.push(pkg.name);
  if (pkg.version !== want) problems.push(`  ${pkg.name}: package.json says ${pkg.version}, tag says ${want}`);
}

// The plugin manifests version-gate DELIVERY, not npm: `claude plugin update`
// compares plugin.json versions and treats equal as up-to-date. v0.2.0 shipped
// with both manifests still saying 0.1.0, so every installed plugin silently
// refused the new skills until users uninstalled and reinstalled. The tag now
// gates these files too — the same mistake fails the release instead of the
// user's update.
for (const rel of [
  '../plugins/claude-code/.claude-plugin/plugin.json',
  '../plugins/codex/.codex-plugin/plugin.json',
]) {
  const pkg = JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'));
  checked.push(rel.replace('../', ''));
  if (pkg.version !== want) problems.push(`  ${rel.replace('../', '')}: says ${pkg.version}, tag says ${want}`);
}

if (problems.length > 0) {
  console.error(`✗ ${tag} does not match ${problems.length} package version(s):\n${problems.join('\n')}`);
  console.error('\nBump every public package to the tagged version before tagging.');
  process.exit(1);
}
console.log(`✓ ${tag} matches all ${checked.length} public packages:`);
for (const n of checked.sort()) console.log(`  ${n}@${want}`);
