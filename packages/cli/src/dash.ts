import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type IsoDate, projectCashflow } from '@holiday-cfo/core';
import type { SqlLedgerStore } from '@holiday-cfo/store-sql';

/**
 * `holiday dash` — scaffold a dashboard, and bake the snapshot it renders.
 *
 * The split is the design, not an implementation detail:
 *
 *   dash init   writes a vinext project that reads two JSON files
 *   dash data   fills ONE of them, from the ledger
 *   the agent   fills the OTHER — the layout — and can put no figure in it
 *
 * The dashboard never opens ledger.db. That is what lets one build run both on a
 * laptop and on Codex Sites, which is Cloudflare underneath: no Node runtime, no
 * filesystem, no node:sqlite. A snapshot is the only thing that can cross that
 * line — and since Sites is OpenAI-hosted and this is the user's money, the only
 * thing that should.
 */

/**
 * Where the templates live, relative to whatever is executing.
 *
 * Both layouts land on the same path, which is why it is written this way:
 *
 *   npm      dist/main.js      → ../templates/   (files: ["dist", "templates"])
 *   plugin   bin/holiday.mjs   → ../templates/   (copied there at bundle time)
 */
function templatesDir(): string {
  return fileURLToPath(new URL('../templates/', import.meta.url));
}

export interface DashDatasets {
  readonly balances: unknown;
  readonly cashflow: unknown;
  readonly health: unknown;
  readonly bakedAt: string;
}

/**
 * Every figure the dashboard can show, read at ONE instant.
 *
 * One unitOfWork, not three reads. Baking balances, then cashflow, then verify
 * would let a write land in between and produce a page whose cards quietly
 * disagree — a balance from before and a runway from after, each individually
 * correct. Nobody would ever catch that by looking.
 *
 * It is a unitOfWork rather than a read only because `verify()` lives on the
 * write interface; nothing here writes. `holiday verify` does the same.
 */
export async function bakeDatasets(
  store: SqlLedgerStore,
  opts: { readonly asOf: IsoDate; readonly until: IsoDate; readonly now: () => string },
): Promise<DashDatasets> {
  const head = await store.chainHead();
  return store.unitOfWork(async (uow) => {
    const rows = await uow.getBalances({ asOf: opts.asOf });
    const accounts = await uow.listAccounts();
    const codeOf = new Map(accounts.map((a) => [a.id, a.code]));
    const proj = await projectCashflow(uow, { asOf: opts.asOf, until: opts.until });
    const report = await uow.verify();

    // i64 → decimal STRING, everywhere. JSON has no i64, and
    // Number("9007199254740993") gives ...992. The blocks format the digits and
    // never parse them back.
    return {
      balances: rows.map((b) => ({
        accountCode: codeOf.get(b.accountId) ?? b.accountId,
        commodity: b.commodity,
        unitsMinor: b.unitsMinor.toString(),
        weightMinor: b.weightMinor.toString(),
      })),
      cashflow: {
        asOf: proj.asOf,
        until: proj.until,
        openingCashMinor: proj.openingCashMinor.toString(),
        commodity: proj.commodity,
        runway: proj.runway.map((p) => ({
          date: p.date,
          outflowMinor: p.outflowMinor.toString(),
          balanceAfterMinor: p.balanceAfterMinor.toString(),
          items: p.items.map((i) => ({ kind: i.kind, label: i.label, amountMinor: i.amountMinor.toString() })),
        })),
        // Shipped, not printed. The projection knows what it is NOT covering, and
        // a dashboard that drops that turns "I don't know" into "you're fine".
        gaps: proj.gaps,
      },
      health: {
        ok: report.ok,
        checked: report.checked,
        problems: report.problems.map((p) => ({ kind: p.kind, detail: p.detail })),
        head,
      },
      bakedAt: opts.now(),
    };
  });
}

export interface ScaffoldResult {
  readonly created: readonly string[];
  readonly skipped: readonly string[];
}

/** Copy the template into `dest`, pinning the block packages to this CLI's own version. */
export function scaffold(dest: string, version: string): ScaffoldResult {
  const src = join(templatesDir(), 'dash');
  if (!existsSync(src)) {
    throw new Error(`holiday: the dash template is missing from this install (looked in ${src})`);
  }
  mkdirSync(dest, { recursive: true });

  const created: string[] = [];
  const skipped: string[] = [];
  for (const entry of readdirSync(src)) {
    const to = join(dest, entry);
    if (existsSync(to)) {
      // Never clobber. src/ holds spec.json, which is the agent's work, and
      // ledger.json, which may be a fresher bake than the template placeholder.
      skipped.push(entry);
      continue;
    }
    cpSync(join(src, entry), to, { recursive: true });
    created.push(entry);
  }

  // Pin exactly; do not range. `^0.1.0` would let a project scaffolded by CLI
  // 0.1.0 pull blocks 0.2.0, whose catalog it has never seen — and a spec.json
  // written against the old vocabulary then fails in the browser, which is the
  // worst place to find out. The CLI and the blocks ship as one version or not
  // at all. The same token sits in the API routes (the CLI bridge npx-pins
  // itself), so the sweep covers every text file just copied. It runs BEFORE the
  // gitignore rename below — `created` holds the names as copied, and a renamed
  // entry made walkFiles stat a path that no longer existed.
  for (const entry of created) {
    const root = join(dest, entry);
    if (!existsSync(root)) continue;
    for (const file of walkFiles(root)) {
      if (!/\.(json|ts|tsx|md|mjs)$/.test(file)) continue;
      const text = readFileSync(file, 'utf8');
      if (text.includes('__HOLIDAY_VERSION__')) {
        writeFileSync(file, text.replaceAll('__HOLIDAY_VERSION__', version));
      }
    }
  }

  // npm silently refuses to publish a file named `.gitignore` inside a package,
  // so the template carries it dotless and it is renamed on the way out.
  const dotless = join(dest, 'gitignore');
  if (existsSync(dotless) && !existsSync(join(dest, '.gitignore'))) renameSync(dotless, join(dest, '.gitignore'));

  return { created, skipped };
}

/**
 * `holiday init` — write the ledger project's AGENTS.md / CLAUDE.md.
 *
 * The skill's references live in the plugin cache, not in the user's project —
 * so a session opened in the ledger folder WITHOUT the plugin (another host, a
 * plain coding agent) knows nothing: not the voice, not the money-item rule,
 * not that Uncategorized is a queue. These two files make the folder
 * self-describing; every agent host auto-loads them.
 *
 * Never clobbered: the user may have edited them. An old ledger picks them up
 * by re-running `holiday init` (createWorkspace is re-runnable).
 */
export function scaffoldLedgerDocs(dest: string, version: string): ScaffoldResult {
  const src = join(templatesDir(), 'ledger');
  if (!existsSync(src)) {
    throw new Error(`holiday: the ledger docs template is missing from this install (looked in ${src})`);
  }
  const created: string[] = [];
  const skipped: string[] = [];
  for (const entry of readdirSync(src)) {
    const to = join(dest, entry);
    if (existsSync(to)) {
      skipped.push(entry);
      continue;
    }
    writeFileSync(to, readFileSync(join(src, entry), 'utf8').replaceAll('__HOLIDAY_VERSION__', version));
    created.push(entry);
  }
  return { created, skipped };
}

function walkFiles(path: string): string[] {
  const st = statSync(path);
  if (st.isFile()) return [path];
  if (!st.isDirectory()) return [];
  return readdirSync(path).flatMap((e) => walkFiles(join(path, e)));
}
