import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `holiday deploy` — non-destructive multi-target BYOC scaffolder.
 *
 * Never copies `.holiday/**`, `*.db`, or `.env*` into a deploy project. Those are
 * the user's ledger and secrets; templates only ship code + example env names.
 */

export type DeployTarget = 'vercel-supabase' | 'chatgpt-sites';
export type SitesMode = 'inbox-export' | 'engine';

export interface DeployScaffoldOptions {
  readonly dest: string;
  readonly target: DeployTarget;
  readonly version: string;
  readonly mode?: SitesMode;
}

export interface DeployScaffoldResult {
  readonly created: readonly string[];
  readonly skipped: readonly string[];
  readonly mode: SitesMode;
  /** Always false until packages/store-d1 passes store-testkit. Do not hide behind a capability flag. */
  readonly d1EngineEligible: boolean;
}

function templatesDir(): string {
  return fileURLToPath(new URL('../templates/', import.meta.url));
}

const FORBIDDEN_COPY = [/^\.holiday(\/|$)/, /\.db$/i, /^\.env/i];

export function isForbiddenDeployPath(rel: string): boolean {
  const n = rel.replace(/\\/g, '/');
  return FORBIDDEN_COPY.some((re) => re.test(n));
}

/**
 * D1 cannot implement interactive `LedgerStore.unitOfWork` today (batch() ≠ BEGIN).
 * Conformance is the gate — failing cases are not papered over with capability flags.
 */
export const D1_ENGINE_ELIGIBLE = false;

export function scaffoldDeploy(opts: DeployScaffoldOptions): DeployScaffoldResult {
  const mode: SitesMode =
    opts.target === 'chatgpt-sites' ? (opts.mode ?? 'inbox-export') : 'inbox-export';

  if (opts.target === 'chatgpt-sites' && mode === 'engine' && !D1_ENGINE_ELIGIBLE) {
    throw new Error(
      'chatgpt-sites --mode engine is refused: D1 has not passed @holiday-cfo/store-testkit. ' +
        'Use --mode inbox-export (fax inbox + review/export only).',
    );
  }

  const templateName = opts.target === 'vercel-supabase' ? 'vercel-supabase' : 'chatgpt-sites';
  const src = join(templatesDir(), templateName);
  if (!existsSync(src)) {
    throw new Error(`holiday: deploy template missing (looked in ${src})`);
  }

  mkdirSync(opts.dest, { recursive: true });
  const created: string[] = [];
  const skipped: string[] = [];

  for (const entry of readdirSync(src)) {
    if (isForbiddenDeployPath(entry)) continue;
    const to = join(opts.dest, entry);
    if (existsSync(to)) {
      skipped.push(entry);
      continue;
    }
    cpSync(join(src, entry), to, { recursive: true });
    created.push(entry);
  }

  const dotless = join(opts.dest, 'gitignore');
  if (existsSync(dotless) && !existsSync(join(opts.dest, '.gitignore'))) {
    renameSync(dotless, join(opts.dest, '.gitignore'));
  }

  if (created.includes('package.json')) {
    const pkg = join(opts.dest, 'package.json');
    writeFileSync(pkg, readFileSync(pkg, 'utf8').replaceAll('__HOLIDAY_VERSION__', opts.version));
  }

  // Stamp the sites mode so the generated app refuses to pretend it is a ledger.
  if (opts.target === 'chatgpt-sites' && created.includes('holiday.deploy.json')) {
    const stamp = join(opts.dest, 'holiday.deploy.json');
    const json = JSON.parse(readFileSync(stamp, 'utf8')) as Record<string, unknown>;
    json.mode = mode;
    json.d1EngineEligible = D1_ENGINE_ELIGIBLE;
    writeFileSync(stamp, `${JSON.stringify(json, null, 2)}\n`);
  }

  return { created, skipped, mode, d1EngineEligible: D1_ENGINE_ELIGIBLE };
}
