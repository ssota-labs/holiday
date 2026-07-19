/**
 * Verifies the PRD → story/spec → implementation-plan graph.
 *
 * Run: pnpm --filter @holiday-cfo/docs check:planning
 */
import { resolve } from 'node:path';
import { validatePlanning } from './planning-validation.ts';

const contentDir = resolve(import.meta.dirname, '../content/docs');
const problems = validatePlanning(contentDir);

if (problems.length > 0) {
  console.error(`✗ ${problems.length} problem(s) with planning documents:\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log('✓ planning document IDs, references, lifecycle, and navigation are valid.');
