import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type IsoDate, projectCashflow } from '@holiday-cfo/core';
import type { SqlLedgerStore } from '@holiday-cfo/store-sql';

/**
 * `holiday dash` — scaffold a fumadocs dashboard, and bake the snapshot it renders.
 *
 *   dash init   copies a fumadocs (Next) app: MDX memos + /dashboard + API
 *   dash data   rewrites ONLY data/ledger.json from the ledger
 *   the agent   writes MDX / dashboard layout — never figures
 *
 * The dashboard never opens ledger.db. Local API routes shell the CLI; a deploy
 * photo reads the bake only (ADR-008 / ADR-012).
 */

/**
 * Where the templates live, relative to whatever is executing.
 *
 *   npm      dist/main.js      → ../templates/
 *   plugin   bin/holiday.mjs   → ../templates/
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

/** Path of the bake file inside a dash directory. */
export function dashLedgerPath(dashDir: string): string {
  return join(dashDir, 'data', 'ledger.json');
}

/**
 * True when `dir` looks like a pre-ADR-012 vinext + spec.json dash.
 * Used only for migration guidance — we do not auto-convert.
 */
export function looksLikeLegacyVinextDash(dashDir: string): boolean {
  return (
    existsSync(join(dashDir, 'src', 'data', 'spec.json')) ||
    existsSync(join(dashDir, 'vite.config.ts')) ||
    (existsSync(join(dashDir, 'package.json')) &&
      readFileSync(join(dashDir, 'package.json'), 'utf8').includes('vinext'))
  );
}

/**
 * Every figure the dashboard can show, read at ONE instant.
 *
 * One unitOfWork, not three reads. Baking balances, then cashflow, then verify
 * would let a write land in between and produce a page whose cards quietly
 * disagree.
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

    // i64 → decimal STRING, everywhere. JSON has no i64.
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

/** Copy the template into `dest`, pinning blocks/ui/CLI bridge to this CLI's version. */
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
      // Never clobber. content/ and app/dashboard are the agent's work; data/ may
      // hold a fresher bake than the template placeholder.
      skipped.push(entry);
      continue;
    }
    cpSync(join(src, entry), to, { recursive: true });
    created.push(entry);
  }

  // Pin exactly; do not range. Same token sits in package.json and API routes.
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

  // npm silently refuses to publish a file named `.gitignore` inside a package.
  const dotless = join(dest, 'gitignore');
  if (existsSync(dotless) && !existsSync(join(dest, '.gitignore'))) renameSync(dotless, join(dest, '.gitignore'));

  return { created, skipped };
}

function walkFiles(path: string): string[] {
  const st = statSync(path);
  if (st.isFile()) return [path];
  if (!st.isDirectory()) return [];
  return readdirSync(path).flatMap((e) => walkFiles(join(path, e)));
}
