#!/usr/bin/env node
/**
 * Verify project Agent Skills match skills-lock.json.
 *
 * Faraday Academy's skills-lock.json is a nonstandard pending-install list and
 * is NOT used here. This repo pins official upstream skills (supabase,
 * deploy-to-vercel, migrate-to-vinext, grill-me) and requires:
 *
 *   1. Every lock entry has a matching .agents/skills/<name>/SKILL.md
 *   2. Every .agents/skills/<name> directory is listed in the lock
 *   3. The directory content hash matches computedHash (sha256 of sorted files)
 *
 * Run: node scripts/check-skills-lock.mjs
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const LOCK = join(ROOT, 'skills-lock.json');
const SKILLS = join(ROOT, '.agents', 'skills');

/** Required upstream skills for BYOC deploy work (plus grill-me already present). */
const REQUIRED = ['supabase', 'deploy-to-vercel', 'migrate-to-vinext'];

function walkFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function hashSkillDir(dir) {
  const h = createHash('sha256');
  for (const file of walkFiles(dir)) {
    const rel = relative(dir, file).split('\\').join('/');
    h.update(rel);
    h.update('\0');
    h.update(readFileSync(file));
    h.update('\0');
  }
  return h.digest('hex');
}

function main() {
  if (!existsSync(LOCK)) {
    console.error('missing skills-lock.json');
    process.exit(1);
  }
  const lock = JSON.parse(readFileSync(LOCK, 'utf8'));
  if (lock.version !== 1 || !lock.skills || typeof lock.skills !== 'object') {
    console.error('skills-lock.json: expected { version: 1, skills: { ... } }');
    process.exit(1);
  }

  const errors = [];
  const locked = Object.keys(lock.skills).sort();
  const onDisk = existsSync(SKILLS)
    ? readdirSync(SKILLS).filter((n) => statSync(join(SKILLS, n)).isDirectory()).sort()
    : [];

  for (const name of REQUIRED) {
    if (!lock.skills[name]) errors.push(`required skill missing from lock: ${name}`);
    if (!onDisk.includes(name)) errors.push(`required skill not installed under .agents/skills: ${name}`);
  }

  for (const name of locked) {
    if (!onDisk.includes(name)) {
      errors.push(`lock lists ${name} but .agents/skills/${name} is missing`);
      continue;
    }
    const entry = lock.skills[name];
    if (!entry.source || !entry.skillPath || !entry.computedHash) {
      errors.push(`${name}: lock entry incomplete (need source, skillPath, computedHash)`);
      continue;
    }
    if (entry.sourceType !== 'github') {
      errors.push(`${name}: sourceType must be "github" (got ${JSON.stringify(entry.sourceType)})`);
    }
    const skillMd = join(SKILLS, name, 'SKILL.md');
    if (!existsSync(skillMd)) errors.push(`${name}: missing SKILL.md`);
    const actual = hashSkillDir(join(SKILLS, name));
    if (actual !== entry.computedHash) {
      errors.push(
        `${name}: computedHash mismatch\n  lock:   ${entry.computedHash}\n  actual: ${actual}\n  (re-install with npx skills add, or update the lock after an intentional pin bump)`,
      );
    }
  }

  for (const name of onDisk) {
    if (!lock.skills[name]) {
      errors.push(`.agents/skills/${name} is not listed in skills-lock.json`);
    }
  }

  if (errors.length > 0) {
    console.error('skills-lock check failed:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`skills-lock OK (${locked.length} skill(s): ${locked.join(', ')})`);
}

main();
