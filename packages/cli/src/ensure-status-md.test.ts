import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { type CommodityCode } from '@holiday-cfo/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createWorkspace, openLedger } from './workspace.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const templateScript = fileURLToPath(
  new URL('../templates/ledger/.cursor/hooks/ensure-status-md.sh', import.meta.url),
);
const pluginScript = fileURLToPath(
  new URL('../../../plugins/claude-code/hooks/ensure-status-md.sh', import.meta.url),
);
const cliMain = fileURLToPath(new URL('../dist/main.js', import.meta.url));

beforeAll(() => {
  expect(existsSync(templateScript)).toBe(true);
  expect(existsSync(pluginScript)).toBe(true);
  expect(existsSync(cliMain)).toBe(true);
});

function runEnsure(
  cwd: string,
  env: Record<string, string | undefined> = {},
): { status: number | null; stdout: string } {
  const r = spawnSync('bash', [templateScript], {
    cwd,
    env: { ...process.env, ...env, CLAUDE_PROJECT_DIR: cwd },
    encoding: 'utf8',
    input: '',
  });
  return { status: r.status, stdout: r.stdout ?? '' };
}

describe('ensure-status-md.sh', () => {
  it('creates status.md via HOLIDAY_BIN, keeps existing bytes, soft-fails, and guards', async () => {
    const root = mkdtempSync(join(tmpdir(), 'holiday-ensure-ok-'));
    dirs.push(root);
    const ws = createWorkspace(root, {
      functionalCurrency: 'KRW' as CommodityCode,
      closeGrain: 'month',
      timezone: 'Asia/Seoul',
      store: 'sqlite',
    });
    const store = await openLedger(ws);
    await store.close();

    const binDir = mkdtempSync(join(tmpdir(), 'holiday-bin-'));
    dirs.push(binDir);
    const holidayBin = join(binDir, 'holiday');
    writeFileSync(
      holidayBin,
      `#!/usr/bin/env bash\nexec "${process.execPath}" "${cliMain}" "$@"\n`,
      { mode: 0o755 },
    );
    chmodSync(holidayBin, 0o755);

    expect(existsSync(join(root, 'status.md'))).toBe(false);
    const created = runEnsure(root, { HOLIDAY_BIN: holidayBin });
    expect(created.status).toBe(0);
    expect(existsSync(join(root, 'status.md'))).toBe(true);
    const body = readFileSync(join(root, 'status.md'), 'utf8');
    expect(body).toContain('# 장부 현황');
    expect(body).toContain('## 계좌');
    expect(body).toContain('## 부채');

    writeFileSync(join(root, 'status.md'), '# hand edit kept\n');
    const kept = runEnsure(root, { HOLIDAY_BIN: holidayBin });
    expect(kept.status).toBe(0);
    expect(readFileSync(join(root, 'status.md'), 'utf8')).toBe('# hand edit kept\n');

    // Soft-fail: broken CLI still exits 0 and does not leave a partial file.
    const broken = join(binDir, 'broken');
    writeFileSync(broken, '#!/usr/bin/env bash\nexit 42\n', { mode: 0o755 });
    chmodSync(broken, 0o755);
    rmSync(join(root, 'status.md'));
    const soft = runEnsure(root, { HOLIDAY_BIN: broken });
    expect(soft.status).toBe(0);
    expect(existsSync(join(root, 'status.md'))).toBe(false);

    // No .holiday → no-op
    const empty = mkdtempSync(join(tmpdir(), 'holiday-ensure-empty-'));
    dirs.push(empty);
    const skipEmpty = runEnsure(empty, { HOLIDAY_BIN: holidayBin });
    expect(skipEmpty.status).toBe(0);
    expect(existsSync(join(empty, 'status.md'))).toBe(false);

    // Monorepo markers → no-op even with .holiday/
    const mono = mkdtempSync(join(tmpdir(), 'holiday-ensure-mono-'));
    dirs.push(mono);
    mkdirSync(join(mono, '.holiday'));
    mkdirSync(join(mono, 'packages', 'cli'), { recursive: true });
    mkdirSync(join(mono, 'plugins', 'claude-code'), { recursive: true });
    writeFileSync(join(mono, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    const skipMono = runEnsure(mono, { HOLIDAY_BIN: holidayBin });
    expect(skipMono.status).toBe(0);
    expect(existsSync(join(mono, 'status.md'))).toBe(false);
  });

  it('Cursor template and plugin scripts stay aligned', () => {
    const stripHeader = (s: string) =>
      s
        .split('\n')
        .filter((line) => !line.includes('Keep in sync with'))
        .join('\n');
    expect(stripHeader(readFileSync(templateScript, 'utf8'))).toBe(
      stripHeader(readFileSync(pluginScript, 'utf8')),
    );
  });
});
