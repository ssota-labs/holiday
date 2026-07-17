import { z } from 'zod';

/**
 * A CLI command spec.
 *
 * AI Elements' `schema-display` renders REST endpoints — a coloured method chip,
 * a path, then parameters grouped by location. holiday has no REST API; it has a
 * CLI that agents shell out to. So this steals the grammar and swaps the nouns:
 * the method chip becomes a **mutates / reads** chip, the path becomes a command
 * signature, and `location: path|query|header` becomes `flag|arg`.
 *
 * The mutates/reads distinction is the one that earns its colour here. An agent
 * deciding whether it needs the user's confirmation before running something
 * needs that answer at a glance, and it is the difference between `balance` and
 * `txn add`.
 *
 * `exits` is required because this CLI's contract with an agent is its exit code
 * and its stderr envelope, not its prose output.
 */
export const flagSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['flag', 'arg']).default('flag'),
  type: z.string().min(1),
  required: z.boolean().optional(),
  repeatable: z.boolean().optional(),
  default: z.string().optional(),
  description: z.string().optional(),
});

export const commandSpecSchema = z.object({
  command: z.string().min(1),
  mutates: z.boolean(),
  summary: z.string().min(1),
  signature: z.string().min(1),
  flags: z.array(flagSchema).default([]),
  exits: z
    .array(z.object({ code: z.number().int(), meaning: z.string().min(1) }))
    .min(1, { message: 'an agent-facing command must document its exit codes' }),
  example: z.string().optional(),
});

export type CommandSpecProps = z.infer<typeof commandSpecSchema>;

export function CommandSpec(props: CommandSpecProps) {
  const { command, mutates, summary, signature, flags, exits, example } = commandSpecSchema.parse(props);

  return (
    <div className="not-prose bg-fd-card my-6 overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span
          className={`rounded px-2 py-0.5 font-mono text-xs font-medium ${
            mutates ? 'bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          }`}
        >
          {mutates ? 'mutates' : 'reads'}
        </span>
        <code className="font-mono text-sm font-semibold">holiday {command}</code>
      </div>

      <p className="text-fd-muted-foreground border-b px-4 py-2 text-sm">{summary}</p>

      <div className="overflow-x-auto border-b">
        <pre className="px-4 py-3 font-mono text-xs leading-relaxed">{signature}</pre>
      </div>

      {flags.length > 0 ? (
        <div className="overflow-x-auto border-b">
          <table className="w-full text-sm">
            <thead className="text-fd-muted-foreground border-b text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 font-medium">name</th>
                <th className="px-4 py-2 font-medium">type</th>
                <th className="px-4 py-2 font-medium">default</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.name} className="border-b align-top last:border-0">
                  <td className="px-4 py-2">
                    <code className="font-mono text-xs">{f.name}</code>
                    {f.required ? <span className="ml-1 text-red-500">*</span> : null}
                    {f.repeatable ? <span className="text-fd-muted-foreground ml-1 text-xs">(repeatable)</span> : null}
                    {f.description ? <p className="text-fd-muted-foreground mt-0.5 text-xs">{f.description}</p> : null}
                  </td>
                  <td className="px-4 py-2">
                    <code className="text-fd-muted-foreground font-mono text-xs">{f.type}</code>
                  </td>
                  <td className="text-fd-muted-foreground px-4 py-2 font-mono text-xs">{f.default ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 py-3 text-xs">
        {exits.map((e) => (
          <span key={e.code} className="text-fd-muted-foreground">
            <code
              className={`font-mono font-medium ${e.code === 0 ? 'text-emerald-600' : 'text-red-600'}`}
            >
              exit {e.code}
            </code>{' '}
            {e.meaning}
          </span>
        ))}
      </div>

      {example ? (
        <div className="overflow-x-auto border-t">
          <pre className="px-4 py-3 font-mono text-xs leading-relaxed">{example}</pre>
        </div>
      ) : null}
    </div>
  );
}
