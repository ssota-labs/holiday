import manifestJson from '../../generated/schema-manifest.json';

import { SchemaTable, type Field } from './schema-table';

interface ManifestColumn {
  name: string;
  physicalType: string;
  semanticType: string;
  representation?: string;
  unit?: string;
  nullable: boolean;
  default: string | null;
  primaryKey: boolean;
}

interface ManifestForeignKey {
  name: string;
  sourceTable: string;
  sourceColumns: string[];
  targetTable: string;
  targetColumns: string[];
  onUpdate: string;
  onDelete: string;
}

interface ManifestCheck {
  name: string;
  expression: string;
}

interface ManifestIndex {
  name: string;
  columns: string[];
  unique: boolean;
}

interface ManifestTable {
  name: string;
  columns: ManifestColumn[];
  primaryKey: { name: string; columns: string[] };
  foreignKeys: ManifestForeignKey[];
  checks: ManifestCheck[];
  indexes: ManifestIndex[];
}

interface SchemaManifest {
  metadata: {
    latestMigration: string;
    snapshotPath: string;
    schemaSourcePath: string;
    generatorPath: string;
  };
  tables: ManifestTable[];
  foreignKeys: ManifestForeignKey[];
}

const manifest = manifestJson as unknown as SchemaManifest;

const GROUPS = [
  {
    label: '저널과 기준정보',
    names: ['book', 'commodity', 'account', 'txn', 'posting', 'fx_rate'],
  },
  {
    label: '스케줄',
    names: ['card', 'installment', 'installment_row', 'loan', 'loan_schedule_row', 'recurring', 'recurring_income'],
  },
  {
    label: '수집과 분류',
    names: ['ingest_batch', 'ingest_item', 'rule'],
  },
  {
    label: '마감과 검증',
    names: ['period', 'balance_assertion', 'snapshot', 'snapshot_balance'],
  },
  {
    label: '수입 정산',
    names: ['income_source', 'income_settlement', 'income_settlement_line'],
  },
  {
    label: '운영',
    names: ['audit_log', 'command_log'],
  },
] as const;

function invariantFor(table: ManifestTable, column: ManifestColumn): string | undefined {
  const invariants: string[] = [];

  if (column.primaryKey) {
    const key = table.primaryKey.columns;
    invariants.push(key.length > 1 ? `PK (${key.join(', ')})` : 'PK');
  }

  for (const fk of table.foreignKeys.filter((candidate) => candidate.sourceColumns.includes(column.name))) {
    const actions = [
      fk.onDelete !== 'NO ACTION' ? `delete ${fk.onDelete.toLowerCase()}` : null,
      fk.onUpdate !== 'NO ACTION' ? `update ${fk.onUpdate.toLowerCase()}` : null,
    ].filter(Boolean);
    invariants.push(
      `FK → ${fk.targetTable}(${fk.targetColumns.join(', ')})${actions.length > 0 ? `; ${actions.join(', ')}` : ''}`,
    );
  }

  const quotedName = `"${column.name.replaceAll('"', '""')}"`;
  for (const check of table.checks.filter((candidate) => candidate.expression.includes(quotedName))) {
    invariants.push(`CHECK ${check.expression}`);
  }

  if (column.default !== null) invariants.push(`DEFAULT ${column.default}`);

  return invariants.length > 0 ? invariants.join(' · ') : undefined;
}

function fieldsFor(table: ManifestTable): Field[] {
  return table.columns.map((column) => ({
    name: column.name,
    type: column.semanticType,
    required: !column.nullable,
    ...(column.unit ? { unit: column.unit } : {}),
    description: `SQLite ${column.physicalType}${column.representation ? `; ${column.representation} representation` : ''}`,
    ...(invariantFor(table, column) ? { invariant: invariantFor(table, column) } : {}),
  }));
}

function tableDescription(table: ManifestTable): string {
  const uniqueIndexes = table.indexes.filter((index) => index.unique);
  const parts = [
    `${table.columns.length}개 열`,
    `${table.foreignKeys.length}개 외래 키`,
    `${table.checks.length}개 CHECK`,
    uniqueIndexes.length > 0
      ? `UNIQUE ${uniqueIndexes.map((index) => `(${index.columns.join(', ')})`).join(', ')}`
      : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

export function SchemaSnapshot() {
  const tablesByName = new Map(manifest.tables.map((table) => [table.name, table]));
  const groupedNames = new Set<string>(GROUPS.flatMap((group) => [...group.names]));
  const groups = [
    ...GROUPS.map((group) => ({
      label: group.label,
      tables: group.names.map((name) => tablesByName.get(name)).filter((table): table is ManifestTable => table !== undefined),
    })),
    {
      label: '기타',
      tables: manifest.tables.filter((table) => !groupedNames.has(table.name)),
    },
  ].filter((group) => group.tables.length > 0);

  return (
    <div className="not-prose my-6 space-y-6">
      <div className="bg-fd-card overflow-hidden rounded-lg border">
        <div className="border-b px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-semibold">현재 스키마 요약</span>
            <span className="text-fd-muted-foreground text-xs">
              {manifest.tables.length} tables · {manifest.foreignKeys.length} foreign keys
            </span>
          </div>
          <p className="text-fd-muted-foreground mt-1 text-xs">
            source <code>{manifest.metadata.schemaSourcePath}</code> · latest migration{' '}
            <code>{manifest.metadata.latestMigration}</code> · snapshot <code>{manifest.metadata.snapshotPath}</code>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-fd-muted-foreground border-b text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 font-medium">table</th>
                <th className="px-4 py-2 text-right font-medium">columns</th>
                <th className="px-4 py-2 font-medium">primary key</th>
                <th className="px-4 py-2 font-medium">outgoing foreign keys</th>
              </tr>
            </thead>
            <tbody>
              {manifest.tables.map((table) => (
                <tr key={table.name} className="border-b last:border-0 align-top">
                  <td className="px-4 py-2 font-mono text-xs font-medium">{table.name}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{table.columns.length}</td>
                  <td className="px-4 py-2 font-mono text-xs">{table.primaryKey.columns.join(', ')}</td>
                  <td className="text-fd-muted-foreground px-4 py-2 font-mono text-xs">
                    {table.foreignKeys.length > 0
                      ? table.foreignKeys
                          .map(
                            (fk) =>
                              `${fk.sourceColumns.join(', ')} → ${fk.targetTable}(${fk.targetColumns.join(', ')})`,
                          )
                          .join(' · ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        {groups.map((group, groupIndex) => (
          <details key={group.label} className="bg-fd-card group overflow-hidden rounded-lg border" open={groupIndex === 0}>
            <summary className="hover:bg-fd-muted/40 flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium">
              <span className="text-fd-muted-foreground transition-transform group-open:rotate-90" aria-hidden>
                ›
              </span>
              {group.label}
              <span className="text-fd-muted-foreground ml-auto text-xs">{group.tables.length} tables</span>
            </summary>
            <div className="border-t px-4 pb-1">
              {group.tables.map((table) => (
                <SchemaTable
                  key={table.name}
                  name={table.name}
                  kind="table"
                  source={manifest.metadata.schemaSourcePath}
                  description={tableDescription(table)}
                  fields={fieldsFor(table)}
                />
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
