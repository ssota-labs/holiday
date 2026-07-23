import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { scaffoldLedgerDocs } from './ledger-docs.js';

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('scaffoldLedgerDocs', () => {
  it('creates AGENTS/CLAUDE and Cursor sessionStart hooks without clobbering', () => {
    const dest = mkdtempSync(join(tmpdir(), 'holiday-ledger-docs-'));
    dirs.push(dest);

    const first = scaffoldLedgerDocs(dest, '0.3.1');
    expect(first.created).toEqual(
      expect.arrayContaining([
        'AGENTS.md',
        'CLAUDE.md',
        join('.cursor', 'hooks.json'),
        join('.cursor', 'hooks', 'update-document-skills.sh'),
        join('.cursor', 'hooks', 'ensure-status-md.sh'),
      ]),
    );
    expect(readFileSync(join(dest, 'AGENTS.md'), 'utf8')).toContain('holiday v0.3.1');
    const hooks = JSON.parse(readFileSync(join(dest, '.cursor', 'hooks.json'), 'utf8')) as {
      hooks: { sessionStart: unknown[] };
    };
    expect(hooks.hooks.sessionStart.length).toBe(2);
    expect(existsSync(join(dest, '.cursor', 'hooks', 'update-document-skills.sh'))).toBe(true);
    expect(existsSync(join(dest, '.cursor', 'hooks', 'ensure-status-md.sh'))).toBe(true);

    // Pre-existing .cursor/ must not block a missing hooks.json, and existing files stay.
    writeFileSync(join(dest, 'AGENTS.md'), 'user-edited\n');
    rmSync(join(dest, '.cursor', 'hooks.json'));
    mkdirSync(join(dest, '.cursor'), { recursive: true });

    const second = scaffoldLedgerDocs(dest, '0.9.9');
    expect(second.skipped).toEqual(
      expect.arrayContaining([
        'AGENTS.md',
        'CLAUDE.md',
        join('.cursor', 'hooks', 'update-document-skills.sh'),
        join('.cursor', 'hooks', 'ensure-status-md.sh'),
      ]),
    );
    expect(second.created).toEqual(expect.arrayContaining([join('.cursor', 'hooks.json')]));
    expect(readFileSync(join(dest, 'AGENTS.md'), 'utf8')).toBe('user-edited\n');
    expect(existsSync(join(dest, '.cursor', 'hooks.json'))).toBe(true);
  });

  it('preserves executable bit on the Cursor update script', () => {
    const dest = mkdtempSync(join(tmpdir(), 'holiday-ledger-x-'));
    dirs.push(dest);
    scaffoldLedgerDocs(dest, '0.3.1');
    const script = join(dest, '.cursor', 'hooks', 'update-document-skills.sh');
    // Force a known mode on the template copy path is already +x; assert dest is executable by owner.
    chmodSync(script, 0o755);
    const again = scaffoldLedgerDocs(dest, '0.3.1');
    expect(again.skipped).toContain(join('.cursor', 'hooks', 'update-document-skills.sh'));
    expect(readFileSync(script, 'utf8')).toContain('skills update -p -y');
    expect(readFileSync(join(dest, '.cursor', 'hooks', 'ensure-status-md.sh'), 'utf8')).toContain(
      'status.md',
    );
  });
});
