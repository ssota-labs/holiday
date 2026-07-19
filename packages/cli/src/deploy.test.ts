import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { D1_ENGINE_ELIGIBLE, scaffoldDeploy } from './deploy.js';

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('holiday deploy scaffold', () => {
  it('scaffolds vercel-supabase without clobbering and without forbidden paths', () => {
    const dest = mkdtempSync(join(tmpdir(), 'holiday-deploy-'));
    dirs.push(dest);
    const a = scaffoldDeploy({ dest, target: 'vercel-supabase', version: '0.1.0' });
    expect(a.created.length).toBeGreaterThan(0);
    expect(existsSync(join(dest, 'package.json'))).toBe(true);
    expect(readFileSync(join(dest, 'package.json'), 'utf8')).toContain('"@holiday-cfo/core": "0.1.0"');
    expect(existsSync(join(dest, '.gitignore'))).toBe(true);
    const b = scaffoldDeploy({ dest, target: 'vercel-supabase', version: '0.1.0' });
    expect(b.skipped.length).toBeGreaterThan(0);
    expect(existsSync(join(dest, '.holiday'))).toBe(false);
  });

  it('refuses chatgpt-sites engine mode while D1 is ineligible', () => {
    expect(D1_ENGINE_ELIGIBLE).toBe(false);
    const dest = mkdtempSync(join(tmpdir(), 'holiday-sites-'));
    dirs.push(dest);
    expect(() =>
      scaffoldDeploy({ dest, target: 'chatgpt-sites', version: '0.1.0', mode: 'engine' }),
    ).toThrow(/inbox-export/);
    const ok = scaffoldDeploy({ dest, target: 'chatgpt-sites', version: '0.1.0', mode: 'inbox-export' });
    expect(ok.mode).toBe('inbox-export');
    const stamp = JSON.parse(readFileSync(join(dest, 'holiday.deploy.json'), 'utf8')) as {
      d1EngineEligible: boolean;
      mode: string;
    };
    expect(stamp.d1EngineEligible).toBe(false);
    expect(stamp.mode).toBe('inbox-export');
  });
});
