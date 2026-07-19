#!/usr/bin/env node

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_REPO_ROOT = resolve(dirname(SCRIPT_PATH), '../../..');

function repositoryPath(repoRoot, path) {
  return relative(repoRoot, path).split(sep).join('/');
}

export function findLatestSnapshot(repoRoot = DEFAULT_REPO_ROOT) {
  const migrationsRoot = join(repoRoot, 'packages/store-sqlite/migrations');
  const migration = readdirSync(migrationsRoot, { withFileTypes: true })
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

  if (!migration) {
    throw new Error(`No migration snapshot found in ${migrationsRoot}`);
  }

  return {
    migration,
    path: join(migrationsRoot, migration, 'snapshot.json'),
  };
}

function isBooleanColumn(column, checks) {
  if (column.type.toLowerCase() !== 'integer') return false;

  const escapedName = column.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const booleanCheck = new RegExp(`^"${escapedName}"\\s+IN\\s*\\(\\s*0\\s*,\\s*1\\s*\\)$`, 'i');
  return checks.some((constraint) => booleanCheck.test(constraint.value.trim()));
}

function semanticType(column, checks) {
  if (column.name.endsWith('_minor')) {
    return { semanticType: 'i64', unit: 'minor' };
  }
  if (isBooleanColumn(column, checks)) {
    return { semanticType: 'bool' };
  }
  if (
    column.type.toLowerCase() === 'text' &&
    (column.name === 'rate' || column.name.endsWith('_rate_text'))
  ) {
    return { semanticType: 'decimal-string' };
  }
  if (
    column.type.toLowerCase() === 'text' &&
    (column.name === 'id' || column.name.endsWith('_id'))
  ) {
    return { semanticType: 'id', representation: 'text' };
  }

  const physicalType = column.type.toLowerCase();
  if (physicalType === 'text') return { semanticType: 'text' };
  if (physicalType === 'integer') return { semanticType: 'integer' };
  return { semanticType: physicalType };
}

function normalizeIndex(entity) {
  return {
    name: entity.name,
    columns: entity.columns.map((column) =>
      typeof column === 'string' ? column : column.value,
    ),
    unique: entity.entityType === 'uniques' || entity.isUnique === true,
    ...(entity.where == null ? {} : { where: entity.where }),
  };
}

function normalizeForeignKey(entity) {
  return {
    name: entity.name,
    sourceTable: entity.table,
    sourceColumns: entity.columns,
    targetTable: entity.tableTo,
    targetColumns: entity.columnsTo,
    onUpdate: entity.onUpdate,
    onDelete: entity.onDelete,
  };
}

export function buildSchemaManifest(snapshot, metadata) {
  const entities = snapshot.ddl;
  const tableNames = entities
    .filter((entity) => entity.entityType === 'tables')
    .map((entity) => entity.name)
    .sort();
  const foreignKeys = entities
    .filter((entity) => entity.entityType === 'fks')
    .map(normalizeForeignKey)
    .sort((left, right) => left.name.localeCompare(right.name));

  const tables = tableNames.map((name) => {
    const checks = entities
      .filter((entity) => entity.entityType === 'checks' && entity.table === name)
      .map(({ name: checkName, value }) => ({ name: checkName, expression: value }))
      .sort((left, right) => left.name.localeCompare(right.name));
    const rawChecks = entities.filter(
      (entity) => entity.entityType === 'checks' && entity.table === name,
    );
    const primaryKeyEntity = entities.find(
      (entity) => entity.entityType === 'pks' && entity.table === name,
    );
    const primaryKey = primaryKeyEntity
      ? { name: primaryKeyEntity.name, columns: primaryKeyEntity.columns }
      : null;
    const columns = entities
      .filter((entity) => entity.entityType === 'columns' && entity.table === name)
      .map((column) => ({
        name: column.name,
        physicalType: column.type,
        ...semanticType(column, rawChecks),
        nullable: !(column.notNull || primaryKey?.columns.includes(column.name)),
        default: column.default,
        primaryKey: primaryKey?.columns.includes(column.name) ?? false,
      }));
    const indexes = entities
      .filter(
        (entity) =>
          (entity.entityType === 'indexes' || entity.entityType === 'uniques') &&
          entity.table === name,
      )
      .map(normalizeIndex)
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      name,
      columns,
      primaryKey,
      foreignKeys: foreignKeys.filter((foreignKey) => foreignKey.sourceTable === name),
      checks,
      indexes,
    };
  });

  return {
    metadata,
    tables,
    foreignKeys,
  };
}

export function generateSchemaManifest(repoRoot = DEFAULT_REPO_ROOT) {
  const latest = findLatestSnapshot(repoRoot);
  const snapshot = JSON.parse(readFileSync(latest.path, 'utf8'));
  return buildSchemaManifest(snapshot, {
    latestMigration: latest.migration,
    snapshotPath: repositoryPath(repoRoot, latest.path),
    schemaSourcePath: 'packages/store-sqlite/src/schema.drizzle.ts',
    generatorPath: 'apps/docs/scripts/generate-schema-manifest.mjs',
  });
}

export function serializeSchemaManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function writeSchemaManifest(repoRoot = DEFAULT_REPO_ROOT) {
  const outputPath = join(repoRoot, 'apps/docs/generated/schema-manifest.json');
  const manifest = generateSchemaManifest(repoRoot);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serializeSchemaManifest(manifest));
  return outputPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const outputPath = writeSchemaManifest();
  console.log(`wrote ${repositoryPath(DEFAULT_REPO_ROOT, outputPath)}`);
}
