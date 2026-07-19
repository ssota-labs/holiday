import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  findLatestSnapshot,
  generateSchemaManifest,
  serializeSchemaManifest,
} from './generate-schema-manifest.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const migrationsRoot = join(repoRoot, 'packages/store-sqlite/migrations');
const generatedPath = join(repoRoot, 'apps/docs/generated/schema-manifest.json');

function sourceSnapshot() {
  const latest = findLatestSnapshot(repoRoot);
  return JSON.parse(readFileSync(latest.path, 'utf8'));
}

function edgeKey(edge) {
  return [
    edge.sourceTable,
    edge.sourceColumns.join(','),
    edge.targetTable,
    edge.targetColumns.join(','),
  ].join('|');
}

test('selects the latest migration snapshot and emits a stable manifest', () => {
  const expectedLatest = readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      try {
        readFileSync(join(migrationsRoot, name, 'snapshot.json'));
        return true;
      } catch {
        return false;
      }
    })
    .sort()
    .at(-1);
  const first = generateSchemaManifest(repoRoot);
  const second = generateSchemaManifest(repoRoot);

  assert.equal(first.metadata.latestMigration, expectedLatest);
  assert.deepEqual(first, second);
  assert.equal(readFileSync(generatedPath, 'utf8'), serializeSchemaManifest(first));
});

test('contains all current tables and excludes planned tax return tables', () => {
  const manifest = generateSchemaManifest(repoRoot);
  const tableNames = manifest.tables.map((table) => table.name);
  const snapshotColumns = sourceSnapshot().ddl
    .filter((entity) => entity.entityType === 'columns')
    .map((entity) => `${entity.table}.${entity.name}`)
    .sort();
  const manifestColumns = manifest.tables
    .flatMap((table) => table.columns.map((column) => `${table.name}.${column.name}`))
    .sort();

  assert.equal(manifest.tables.length, 25);
  assert.deepEqual(manifestColumns, snapshotColumns);
  assert.equal(tableNames.some((name) => name.startsWith('tax_return')), false);
});

test('contains every foreign-key edge from the source snapshot', () => {
  const snapshotEdges = sourceSnapshot().ddl
    .filter((entity) => entity.entityType === 'fks')
    .map((entity) =>
      edgeKey({
        sourceTable: entity.table,
        sourceColumns: entity.columns,
        targetTable: entity.tableTo,
        targetColumns: entity.columnsTo,
      }),
    )
    .sort();
  const manifestEdges = generateSchemaManifest(repoRoot).foreignKeys.map(edgeKey).sort();

  assert.deepEqual(manifestEdges, snapshotEdges);
});

test('maps minor units and safe boolean checks to semantic types', () => {
  const sourceMinorColumns = sourceSnapshot().ddl
    .filter(
      (entity) => entity.entityType === 'columns' && entity.name.endsWith('_minor'),
    )
    .map((entity) => `${entity.table}.${entity.name}`)
    .sort();
  const columns = generateSchemaManifest(repoRoot).tables.flatMap((table) =>
    table.columns.map((column) => ({ table: table.name, ...column })),
  );
  const minorColumns = columns.filter((column) => column.name.endsWith('_minor'));

  assert.deepEqual(
    minorColumns.map((column) => `${column.table}.${column.name}`).sort(),
    sourceMinorColumns,
  );
  for (const column of minorColumns) {
    assert.equal(column.semanticType, 'i64', `${column.table}.${column.name}`);
    assert.equal(column.unit, 'minor', `${column.table}.${column.name}`);
  }

  assert.equal(
    columns.find((column) => column.table === 'account' && column.name === 'cash')
      ?.semanticType,
    'bool',
  );
  assert.equal(
    columns.find((column) => column.table === 'fx_rate' && column.name === 'rate')
      ?.semanticType,
    'decimal-string',
  );
  assert.equal(
    columns.find((column) => column.table === 'loan' && column.name === 'annual_rate_text')
      ?.semanticType,
    'decimal-string',
  );
});
