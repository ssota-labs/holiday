/**
 * Verifies the skill's claims about the CLI against the CLI.
 *
 * Both directions, because both have already gone wrong here:
 *
 *   1. The skill referenced `holiday card list` before it existed. An agent
 *      following it would have run a command that is not there.
 *   2. The skill said "no period close and no FX rate table" after both shipped.
 *      An agent reading that skips a real feature and improvises around it —
 *      which is worse, because it looks like it worked.
 *
 * The second is why "what this cannot do" needs checking at all. A stale
 * capability list reads as authoritative and quietly makes the agent dumber.
 *
 * Run: pnpm --filter holiday-plugin check:skill
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PLUGIN = resolve(import.meta.dirname, '..');
const SKILLS_ROOT = join(PLUGIN, 'skills');
const SKILL = join(SKILLS_ROOT, 'holiday-cfo');

/**
 * The CLI under test is the freshly-built workspace copy, not a published npm
 * release and not a committed bundle — there is no longer a bundle to point at.
 *
 * Neither host ships a binary now: both skills tell the agent to run
 * `npx @holiday-cfo/cli@latest`. But CI cannot check the skill against a package
 * that has not been published yet — it would be checking the previous release, or
 * hitting the network — so the checker runs the local build. `pretest` builds it.
 */
const BIN = resolve(PLUGIN, '..', '..', 'packages', 'cli', 'dist', 'main.js');

/**
 * Codex skills live next to this plugin. Shared references/ are symlinked into
 * holiday-cfo; BYOC wrapper skills are duplicated SKILL.md files that must be
 * checked too — they document `holiday deploy …`.
 */
const CODEX_SKILLS = resolve(PLUGIN, '..', 'codex', 'skills');
const CODEX_SKILL_MD = join(CODEX_SKILLS, 'holiday-cfo', 'SKILL.md');

/**
 * The ledger project's AGENTS.md template is a THIRD claim surface. `holiday
 * init` scaffolds it into every user's folder, where it outlives any plugin
 * update — a stale command there misleads sessions for as long as the ledger
 * exists. It absorbed references/concepts/, so it now carries most of the
 * command claims the concepts used to.
 */
const LEDGER_DOCS_MD = resolve(PLUGIN, '..', '..', 'packages', 'cli', 'templates', 'ledger', 'AGENTS.md');

/** `holiday <cmd>` mentions in the skill, in prose or in a fenced block. */
// Hyphens are part of subcommand names (`apply-rules`) — without them the
// regex truncated `review apply-rules` to `review apply` and reported a ghost.
const CMD_RE = /\bholiday ([a-z][a-z-]*(?: [a-z][a-z-]*)?)\b/g;

/** Not commands — flags, and words that follow "holiday" in a sentence. */
const IGNORE = new Set([
  'is',
  'a',
  'the',
  'cfo',
  'ledger',
  'init',
  'account add',
  'does',
  'drafts',
  'commands',
  'deploy', // group name alone — skills must say `holiday deploy init|check`
]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const full = join(dir, e);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.md') ? [full] : [];
  });
}

function help(args: string[]): string {
  try {
    return execFileSync('node', [BIN, ...args, '--help'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/**
 * Command names under commander's "Commands:" heading.
 *
 * The wrapping is the trap. commander continues a long description on the next
 * line, indented to align with the column — so a naive "indented word" match
 * reads the description's first word as a command. `review accept`'s description
 * ends "...it is already / balanced." and the checker reported a `balanced`
 * subcommand that does not exist.
 *
 * A real command line has its description on the SAME line after two or more
 * spaces — or nothing at all, since a description is optional. A continuation is
 * prose: its first word is followed by a single space, never two.
 */
function subcommandsOf(args: string[]): string[] {
  const out = help(args);
  const start = out.indexOf('Commands:');
  if (start < 0) return [];
  return out
    .slice(start)
    .split('\n')
    .slice(1)
    .map((l) => /^\s{2,}([a-z][a-z-]*)(?:\s+\[[^\]]*\]|\s+<[^>]*>)*(?:\s{2,}\S|\s*$)/.exec(l)?.[1])
    .filter((n): n is string => !!n && n !== 'help');
}

/**
 * The CLI's real command tree, read from --help rather than probed.
 *
 * Probing with `holiday <x> --help` and falling back to the head was the first
 * attempt, and it silently passed everything: `holiday review approve-all` is not
 * real, but `holiday review` is, so the fallback let it through — and the fallback
 * had to exist because `holiday close 2026-07` puts an argument where a
 * subcommand would go. Enumerating the tree tells leaves and groups apart, which
 * a probe cannot.
 */
function commandTree(): { leaves: Set<string>; groups: Map<string, Set<string>> } {
  const leaves = new Set<string>();
  const groups = new Map<string, Set<string>>();
  for (const top of subcommandsOf([])) {
    const subs = subcommandsOf([top]);
    if (subs.length > 0) groups.set(top, new Set(subs));
    else leaves.add(top);
  }
  return { leaves, groups };
}

function main(): void {
  const files = [
    ...walk(SKILLS_ROOT),
    ...walk(CODEX_SKILLS).filter((f) => f.endsWith('SKILL.md')),
    LEDGER_DOCS_MD,
  ];
  const claimed = new Map<string, string>();

  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(CMD_RE)) {
      const cmd = m[1]!;
      if (IGNORE.has(cmd)) continue;
      if (!claimed.has(cmd)) claimed.set(cmd, f.slice(PLUGIN.length + 1));
    }
  }

  const { leaves, groups } = commandTree();
  const exists = (cmd: string): boolean => {
    const [head, sub] = cmd.split(' ');
    if (!head) return false;
    if (groups.has(head)) {
      // A group REQUIRES a real subcommand. This is where the first version let
      // `review approve-all` through.
      return sub !== undefined && groups.get(head)!.has(sub);
    }
    // A leaf takes arguments, so a second word is fine — `close 2026-07`.
    return leaves.has(head);
  };

  const problems: string[] = [];
  const ok: string[] = [];
  for (const [cmd, file] of claimed) {
    if (exists(cmd)) ok.push(cmd);
    else {
      const [head] = cmd.split(' ');
      const known = groups.has(head!) ? [...groups.get(head!)!].join(', ') : null;
      problems.push(
        `${file}: references \`holiday ${cmd}\`, which does not exist` +
          (known ? `. \`${head}\` has: ${known}` : ''),
      );
    }
  }

  // The other direction: a skill's "cannot do" list must not name something that
  // shipped. This is the failure that makes an agent quietly worse — it reads the
  // stale disclaimer, skips a real feature, and improvises around it. Both hosts'
  // SKILL.md get checked, because both went stale the moment `dash` shipped.
  for (const md of [join(SKILL, 'SKILL.md'), CODEX_SKILL_MD]) {
    const src = readFileSync(md, 'utf8');
    const cannot = src.slice(src.indexOf('## What this cannot do yet'));
    const where = md.slice(PLUGIN.length + 1);
    for (const [name, cmd] of [
      ['period close', 'close'],
      ['FX rate table', 'fx'],
      ['ingest command', 'ingest'],
      ['review queue', 'review'],
      ['balance assertion', 'assert'],
      // "no dashboard" was true until `dash` shipped. `dash` is a command GROUP,
      // and exists() reports a bare group as false — so probe a real leaf, or this
      // guard silently never fires (which is itself the class of bug this file is
      // about: a check that reassures without checking).
      ['no dashboard', 'dash init'],
    ] as const) {
      if (new RegExp(name, 'i').test(cannot) && exists(cmd)) {
        problems.push(
          `${where}: still says "${name}" does not exist, but \`holiday ${cmd}\` does.\n` +
            `      An agent reading that skips a real feature and improvises around it.`,
        );
      }
    }
  }

  // Document-skills companion (prd-004): project skills.sh install is the only
  // default path; Anthropic skill bodies must not be vendored into the plugin.
  const setupMd = join(SKILL, 'references', 'workflows', 'setup.md');
  const setup = readFileSync(setupMd, 'utf8');
  for (const skill of ['xlsx', 'pdf', 'docx', 'pptx'] as const) {
    const re = new RegExp(
      String.raw`npx skills add https://github\.com/anthropics/skills --skill ${skill} -y`,
    );
    if (!re.test(setup)) {
      problems.push(
        `skills/holiday-cfo/references/workflows/setup.md: missing project install for ${skill} (` +
          `npx skills add https://github.com/anthropics/skills --skill ${skill} -y)`,
      );
    }
  }
  if (/\bnpx skills add\b[^\n]*\s-g\b/.test(setup) || /\bnpx skills add\b[^\n]*\s--global\b/.test(setup)) {
    problems.push('setup.md: must not use global `-g` / `--global` as the default skills.sh install path');
  }
  if (/\/plugin install\s+document-skills@/i.test(setup) || /document-skills@anthropic/i.test(setup)) {
    problems.push('setup.md: must not default to Claude marketplace `document-skills` install');
  }

  for (const host of [
    join(PLUGIN, 'hooks', 'hooks.json'),
    join(PLUGIN, '..', 'codex', 'hooks', 'hooks.json'),
  ]) {
    if (!existsSync(host)) {
      problems.push(`${host}: missing SessionStart hooks.json for document-skills companion`);
      continue;
    }
    const raw = readFileSync(host, 'utf8');
    if (!raw.includes('SessionStart') || !raw.includes('update-document-skills.sh')) {
      problems.push(`${host}: SessionStart must invoke update-document-skills.sh`);
    }
  }
  for (const name of ['xlsx', 'pdf', 'docx', 'pptx'] as const) {
    for (const root of [join(PLUGIN, 'skills'), join(PLUGIN, '..', 'codex', 'skills')]) {
      const vendored = join(root, name);
      if (existsSync(vendored)) {
        problems.push(`${vendored}: Anthropic document skill body must not be vendored into the plugin`);
      }
      const underHoliday = join(root, 'holiday-cfo', name);
      if (existsSync(underHoliday)) {
        problems.push(`${underHoliday}: Anthropic document skill body must not be vendored into the plugin`);
      }
    }
  }
  // Codex shares the update script via symlink — broken links mean a half-deployed plugin.
  const codexScript = join(PLUGIN, '..', 'codex', 'hooks', 'update-document-skills.sh');
  const claudeScript = join(PLUGIN, 'hooks', 'update-document-skills.sh');
  if (!existsSync(claudeScript)) {
    problems.push(`${claudeScript}: missing soft-fail update script`);
  }
  if (!existsSync(codexScript)) {
    problems.push(`${codexScript}: missing (expected symlink to Claude Code hooks script)`);
  } else if (existsSync(claudeScript)) {
    try {
      if (realpathSync(codexScript) !== realpathSync(claudeScript)) {
        problems.push(`${codexScript}: must resolve to the same file as ${claudeScript}`);
      }
    } catch {
      problems.push(`${codexScript}: broken symlink`);
    }
  }

  if (problems.length > 0) {
    console.error(`✗ ${problems.length} problem(s) between the skill and the CLI:\n`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error('\nA skill that misdescribes its tool is worse than no skill.');
    process.exit(1);
  }

  console.log(`✓ ${ok.length} command(s) referenced by the skill all exist, and nothing shipped is listed as missing.`);
  for (const c of ok.sort()) console.log(`  holiday ${c}`);
  console.log('✓ document-skills companion setup + SessionStart hooks present; no vendored Anthropic skill trees.');
}

main();
