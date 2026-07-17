import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit generates the DDL from src/schema.drizzle.ts into migrations/.
 * Nothing here is used at runtime — see the note in schema.drizzle.ts for why the
 * query layer stays ours, and scripts/inline-migrations.ts for how the generated
 * SQL reaches the bundle.
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.drizzle.ts',
  out: './migrations',
  // No `dbCredentials`: `generate` diffs the schema against the migration
  // journal, not against a live database. `push` would need one — and push is
  // deliberately not used here, since it applies changes without leaving a
  // migration behind, which is the opposite of what a ledger wants.
  strict: true,
  verbose: true,
});
