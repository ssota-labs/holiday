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
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PLUGIN = resolve(import.meta.dirname, '..');
const SKILL = join(PLUGIN, 'skills', 'holiday-cfo');

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
 * The Codex skill is a SECOND SKILL.md that must be checked too.
 *
 * It shares this plugin's references/ by symlink, so those are already walked
 * once under SKILL — only its own SKILL.md is new. Both hosts drive the same CLI,
 * so a command that drifts out from under one drifts out from under both, and a
 * checker that only reads the Claude Code copy would bless a broken Codex skill.
 */
const CODEX_SKILL_MD = resolve(PLUGIN, '..', 'codex', 'skills', 'holiday-cfo', 'SKILL.md');

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
const IGNORE = new Set(['is', 'a', 'the', 'cfo', 'ledger', 'init', 'account add']);

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
  const files = [...walk(SKILL), CODEX_SKILL_MD, LEDGER_DOCS_MD];
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

  if (problems.length > 0) {
    console.error(`✗ ${problems.length} problem(s) between the skill and the CLI:\n`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error('\nA skill that misdescribes its tool is worse than no skill.');
    process.exit(1);
  }

  console.log(`✓ ${ok.length} command(s) referenced by the skill all exist, and nothing shipped is listed as missing.`);
  for (const c of ok.sort()) console.log(`  holiday ${c}`);
}

main();
