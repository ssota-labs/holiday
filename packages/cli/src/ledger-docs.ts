import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface LedgerDocsScaffoldResult {
  readonly created: readonly string[];
  readonly skipped: readonly string[];
}

function templatesDir(): string {
  return fileURLToPath(new URL('../templates/', import.meta.url));
}

function walkFiles(path: string): string[] {
  const st = statSync(path);
  if (st.isFile()) return [path];
  if (!st.isDirectory()) return [];
  return readdirSync(path).flatMap((e) => walkFiles(join(path, e)));
}

/**
 * `holiday init` — write the ledger project's AGENTS.md / CLAUDE.md, and (when
 * missing) Cursor `.cursor/hooks.json` for soft-fail document-skills refresh
 * and status.md ensure.
 *
 * Never clobbered: nested paths are created file-by-file so a pre-existing
 * `.cursor/` does not block a missing hooks file.
 */
export function scaffoldLedgerDocs(dest: string, version: string): LedgerDocsScaffoldResult {
  const src = join(templatesDir(), 'ledger');
  if (!existsSync(src)) {
    throw new Error(`holiday: the ledger docs template is missing from this install (looked in ${src})`);
  }
  const created: string[] = [];
  const skipped: string[] = [];
  for (const abs of walkFiles(src)) {
    const rel = relative(src, abs);
    const to = join(dest, rel);
    if (existsSync(to)) {
      skipped.push(rel);
      continue;
    }
    mkdirSync(dirname(to), { recursive: true });
    const mode = statSync(abs).mode;
    const body = readFileSync(abs);
    const isText = !rel.endsWith('.png') && !rel.endsWith('.wasm');
    if (isText) {
      writeFileSync(to, body.toString('utf8').replaceAll('__HOLIDAY_VERSION__', version), { mode });
    } else {
      writeFileSync(to, body, { mode });
    }
    chmodSync(to, mode);
    created.push(rel);
  }
  return { created, skipped };
}
