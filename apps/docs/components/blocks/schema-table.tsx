import { z } from 'zod';

/**
 * A data-model table.
 *
 * The name is borrowed from AI Elements' `schema-display`, but not the component:
 * despite the name, that one renders REST endpoint documentation (method, path,
 * query/header params) and cannot describe a SQLite table or a TypeScript type.
 * What is taken from it is the *grammar* — a signature line, a properties table,
 * and nesting via a recursive shape.
 *
 * Two columns exist here that a generic schema renderer would not have, because
 * they are where this ledger's bugs would live:
 *
 * - `unit` — an integer column is meaningless without it. `12500` is ₩12,500 or
 *   $125.00 depending on a commodity exponent stored somewhere else entirely.
 * - `invariant` — the trigger or domain rule that constrains the column. A reader
 *   asking "can this be negative" should not have to open the DDL.
 */
export const fieldSchema: z.ZodType<Field> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    required: z.boolean().optional(),
    /** e.g. "minor units", "ISO date", "sha256 hex" */
    unit: z.string().optional(),
    /** e.g. "SUM = 0 per txn", "immutable once referenced" */
    invariant: z.string().optional(),
    description: z.string().optional(),
    fields: z.array(fieldSchema).optional(),
  }),
);

export interface Field {
  name: string;
  type: string;
  required?: boolean;
  unit?: string;
  invariant?: string;
  description?: string;
  fields?: Field[];
}

export const schemaTableSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['table', 'type', 'port']),
  /** Repo-relative path to where it is actually defined. */
  source: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(fieldSchema).min(1),
});

export type SchemaTableProps = z.infer<typeof schemaTableSchema>;

const KIND_STYLE: Record<string, string> = {
  table: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  type: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  port: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

export function SchemaTable(props: SchemaTableProps) {
  const { name, kind, source, description, fields } = schemaTableSchema.parse(props);

  return (
    <div className="not-prose bg-fd-card my-6 overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className={`rounded px-2 py-0.5 font-mono text-xs font-medium ${KIND_STYLE[kind]}`}>{kind}</span>
        <code className="font-mono text-sm font-semibold">{name}</code>
        {source ? <span className="text-fd-muted-foreground ml-auto font-mono text-xs">{source}</span> : null}
      </div>
      {description ? <p className="text-fd-muted-foreground border-b px-4 py-2 text-sm">{description}</p> : null}

      {/* Wide tables scroll inside their own box; the page must never scroll sideways. */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-fd-muted-foreground border-b text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 font-medium">field</th>
              <th className="px-4 py-2 font-medium">type</th>
              <th className="px-4 py-2 font-medium">unit</th>
              <th className="px-4 py-2 font-medium">invariant</th>
            </tr>
          </thead>
          <tbody>
            {fields.flatMap((f) => renderField(f, 0))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderField(f: Field, depth: number): React.ReactNode[] {
  const rows: React.ReactNode[] = [
    <tr key={`${depth}-${f.name}`} className="border-b last:border-0 align-top">
      <td className="px-4 py-2" style={{ paddingLeft: `${1 + depth * 1.25}rem` }}>
        <code className="font-mono text-xs">{f.name}</code>
        {f.required ? <span className="ml-1 text-red-500">*</span> : null}
        {f.description ? <p className="text-fd-muted-foreground mt-0.5 text-xs">{f.description}</p> : null}
      </td>
      <td className="px-4 py-2">
        <code className="text-fd-muted-foreground font-mono text-xs">{f.type}</code>
      </td>
      <td className="text-fd-muted-foreground px-4 py-2 text-xs">{f.unit ?? '—'}</td>
      <td className="px-4 py-2 text-xs">
        {f.invariant ? <code className="font-mono text-xs">{f.invariant}</code> : <span className="text-fd-muted-foreground">—</span>}
      </td>
    </tr>,
  ];
  for (const child of f.fields ?? []) rows.push(...renderField(child, depth + 1));
  return rows;
}
