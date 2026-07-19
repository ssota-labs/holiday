'use client';

import {
  Background,
  Controls,
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
} from '@xyflow/react';

import manifestJson from '../../generated/schema-manifest.json';

interface ManifestColumn {
  name: string;
  semanticType: string;
  primaryKey: boolean;
}

interface ManifestForeignKey {
  name: string;
  sourceTable: string;
  sourceColumns: string[];
  targetTable: string;
  targetColumns: string[];
}

interface ManifestTable {
  name: string;
  columns: ManifestColumn[];
  foreignKeys: ManifestForeignKey[];
}

interface SchemaManifest {
  tables: ManifestTable[];
  foreignKeys: ManifestForeignKey[];
}

interface TableNodeData extends Record<string, unknown> {
  name: string;
  group: string;
  columns: Array<ManifestColumn & { foreignKey: boolean }>;
  otherColumnCount: number;
}

interface GroupDefinition {
  id: string;
  label: string;
  names: string[];
  origin: { x: number; y: number };
}

const manifest = manifestJson as unknown as SchemaManifest;

const GROUPS: GroupDefinition[] = [
  {
    id: 'journal',
    label: 'journal',
    names: ['book', 'commodity', 'account', 'txn', 'posting', 'fx_rate'],
    origin: { x: 0, y: 0 },
  },
  {
    id: 'schedules',
    label: 'schedules',
    names: ['card', 'installment', 'installment_row', 'loan', 'loan_schedule_row', 'recurring', 'recurring_income'],
    origin: { x: 300, y: 0 },
  },
  {
    id: 'ingest',
    label: 'ingest',
    names: ['ingest_batch', 'ingest_item', 'rule'],
    origin: { x: 600, y: 0 },
  },
  {
    id: 'close',
    label: 'close',
    names: ['period', 'balance_assertion', 'snapshot', 'snapshot_balance'],
    origin: { x: 0, y: 1040 },
  },
  {
    id: 'income',
    label: 'income',
    names: ['income_source', 'income_settlement', 'income_settlement_line'],
    origin: { x: 300, y: 1040 },
  },
  {
    id: 'other',
    label: 'config / other',
    names: ['audit_log', 'command_log'],
    origin: { x: 600, y: 1040 },
  },
];

const TYPE_STYLE: Record<string, string> = {
  id: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  i64: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  integer: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  bool: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'decimal-string': 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400',
  text: 'bg-fd-muted text-fd-muted-foreground',
};

const groupByTable = new Map(GROUPS.flatMap((group) => group.names.map((name) => [name, group] as const)));
const fallbackGroup = GROUPS.find((group) => group.id === 'other')!;

const graphNodes: Node<TableNodeData>[] = manifest.tables.map((table) => {
  const group = groupByTable.get(table.name) ?? fallbackGroup;
  const positionInGroup = group.names.indexOf(table.name);
  const fallbackOffset = manifest.tables.filter((candidate) => !groupByTable.has(candidate.name)).findIndex(
    (candidate) => candidate.name === table.name,
  );
  const row = positionInGroup >= 0 ? positionInGroup : group.names.length + fallbackOffset;
  const foreignKeyColumns = new Set(table.foreignKeys.flatMap((foreignKey) => foreignKey.sourceColumns));
  const keyColumns = table.columns
    .filter((column) => column.primaryKey || foreignKeyColumns.has(column.name))
    .map((column) => ({ ...column, foreignKey: foreignKeyColumns.has(column.name) }));

  return {
    id: table.name,
    type: 'table',
    position: {
      x: group.origin.x,
      y: group.origin.y + row * 132,
    },
    data: {
      name: table.name,
      group: group.label,
      columns: keyColumns,
      otherColumnCount: table.columns.length - keyColumns.length,
    },
  };
});

const graphEdges: Edge[] = manifest.foreignKeys.map((foreignKey) => ({
  id: foreignKey.name,
  source: foreignKey.sourceTable,
  target: foreignKey.targetTable,
  type: 'smoothstep',
  interactionWidth: 0,
  style: {
    stroke: 'var(--color-fd-muted-foreground)',
    strokeOpacity: 0.45,
    strokeWidth: 1,
  },
}));

function TableNode({ data }: NodeProps) {
  const table = data as TableNodeData;

  return (
    <div className="bg-fd-card border-fd-border w-60 overflow-hidden rounded-md border shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        className="bg-fd-primary! border-fd-background! size-2.5!"
        isConnectable={false}
      />
      <div className="bg-fd-muted/60 border-b px-2.5 py-2">
        <div className="font-mono text-xs font-semibold">{table.name}</div>
        <div className="text-fd-muted-foreground mt-0.5 text-[10px] uppercase tracking-wide">{table.group}</div>
      </div>
      <div className="divide-y">
        {table.columns.map((column) => (
          <div key={column.name} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px]">
            <span className="text-fd-muted-foreground w-8 shrink-0 font-semibold">
              {[column.primaryKey ? 'PK' : null, column.foreignKey ? 'FK' : null].filter(Boolean).join('/')}
            </span>
            <code className="min-w-0 flex-1 truncate font-mono">{column.name}</code>
            <span
              className={`shrink-0 rounded px-1 py-0.5 font-mono text-[9px] ${TYPE_STYLE[column.semanticType] ?? TYPE_STYLE.text}`}
            >
              {column.semanticType}
            </span>
          </div>
        ))}
        {table.otherColumnCount > 0 ? (
          <div className="text-fd-muted-foreground px-2.5 py-1.5 text-[10px]">+ {table.otherColumnCount} columns</div>
        ) : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="bg-fd-primary! border-fd-background! size-2.5!"
        isConnectable={false}
      />
    </div>
  );
}

const NODE_TYPES = { table: TableNode };

export function SchemaGraph({ height = 850 }: { height?: number }) {
  return (
    <div className="not-prose my-6">
      <div className="text-fd-muted-foreground mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {GROUPS.map((group) => (
          <span key={group.id}>
            <span className="text-fd-foreground font-medium">{group.label}</span>{' '}
            {manifest.tables.filter((table) => (groupByTable.get(table.name) ?? fallbackGroup).id === group.id).length}
          </span>
        ))}
        <span className="ml-auto">
          {manifest.tables.length} tables · {manifest.foreignKeys.length} foreign keys
        </span>
      </div>
      <div className="bg-fd-card overflow-hidden rounded-lg border" style={{ height }}>
        <ReactFlow
          nodes={graphNodes}
          edges={graphEdges}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.2}
          maxZoom={1.5}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          edgesFocusable={false}
          nodesFocusable={false}
          panOnDrag
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: false }}
        >
          <Background bgColor="var(--color-fd-card)" color="var(--color-fd-border)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <p className="text-fd-muted-foreground mt-2 text-xs">
        PK/FK 열만 펼쳐 표시합니다. 캔버스 이동은 드래그, 확대/축소는 컨트롤을 사용합니다.
      </p>
    </div>
  );
}
