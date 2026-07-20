import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { dashLedgerPath, looksLikeLegacyVinextDash, scaffold } from './dash.js';

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('dash scaffold (fumadocs)', () => {
  it('copies fumadocs template, pins version, and has no json-render/spec.json', () => {
    const dest = mkdtempSync(join(tmpdir(), 'holiday-dash-'));
    dirs.push(dest);

    const result = scaffold(dest, '0.4.0');
    expect(result.created).toEqual(
      expect.arrayContaining(['AGENTS.md', 'package.json', 'app', 'content', 'data', 'components']),
    );
    expect(existsSync(join(dest, '.gitignore'))).toBe(true);

    const pkg = readFileSync(join(dest, 'package.json'), 'utf8');
    expect(pkg).toContain('"next"');
    expect(pkg).toContain('fumadocs-ui');
    expect(pkg).toContain('"@holiday-cfo/blocks": "0.4.0"');
    expect(pkg).toContain('"@holiday-cfo/ui": "0.4.0"');
    expect(pkg).not.toContain('vinext');
    expect(pkg).not.toContain('json-render');
    expect(pkg).not.toContain('__HOLIDAY_VERSION__');

    expect(existsSync(join(dest, 'src', 'data', 'spec.json'))).toBe(false);
    expect(existsSync(join(dest, 'app', 'dashboard', 'page.tsx'))).toBe(true);
    expect(existsSync(join(dest, 'app', 'api', 'holiday', 'snapshot', 'route.ts'))).toBe(true);
    expect(existsSync(join(dest, 'content', 'docs', 'index.mdx'))).toBe(true);
    expect(existsSync(dashLedgerPath(dest))).toBe(true);

    const agents = readFileSync(join(dest, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('fumadocs');
    expect(agents).toContain('data/ledger.json');
    expect(agents).toMatch(/json-render 경로는 없습니다/);

    const cliBridge = readFileSync(join(dest, 'lib', 'holiday-cli.ts'), 'utf8');
    expect(cliBridge).toContain('@holiday-cfo/cli@0.4.0');
    expect(cliBridge).not.toContain('__HOLIDAY_VERSION__');
  });

  it('does not clobber existing content / dashboard sources on re-init', () => {
    const dest = mkdtempSync(join(tmpdir(), 'holiday-dash-re-'));
    dirs.push(dest);
    scaffold(dest, '0.4.0');

    const memo = join(dest, 'content', 'docs', 'index.mdx');
    writeFileSync(memo, '---\ntitle: mine\n---\nuser memo\n');
    const dashPage = join(dest, 'app', 'dashboard', 'page.tsx');
    writeFileSync(dashPage, '// custom layout\n');

    const second = scaffold(dest, '9.9.9');
    expect(second.skipped).toEqual(expect.arrayContaining(['content', 'app', 'data', 'AGENTS.md']));
    expect(readFileSync(memo, 'utf8')).toContain('user memo');
    expect(readFileSync(dashPage, 'utf8')).toBe('// custom layout\n');
    // Skipped trees keep the first pin — only newly created entries are rewritten.
    expect(readFileSync(join(dest, 'package.json'), 'utf8')).toContain('"0.4.0"');
  });

  it('detects legacy vinext dash folders', () => {
    const dest = mkdtempSync(join(tmpdir(), 'holiday-dash-legacy-'));
    dirs.push(dest);
    mkdirSync(join(dest, 'src', 'data'), { recursive: true });
    writeFileSync(join(dest, 'src', 'data', 'spec.json'), '{"root":"x"}');
    writeFileSync(join(dest, 'package.json'), '{"devDependencies":{"vinext":"1"}}\n');
    expect(looksLikeLegacyVinextDash(dest)).toBe(true);

    const fresh = mkdtempSync(join(tmpdir(), 'holiday-dash-fresh-'));
    dirs.push(fresh);
    scaffold(fresh, '0.4.0');
    expect(looksLikeLegacyVinextDash(fresh)).toBe(false);
  });
});
