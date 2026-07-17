import { z } from 'zod';

import {
  SchemaDisplay,
  SchemaDisplayContent,
  SchemaDisplayDescription,
  SchemaDisplayExample,
  SchemaDisplayHeader,
  SchemaDisplayMethod,
  SchemaDisplayParameter,
  SchemaDisplayParameters,
  SchemaDisplayPath,
  SchemaDisplayProperty,
  SchemaDisplayResponse,
} from '../ai-elements/schema-display';

/**
 * A CLI command spec.
 *
 * Built on AI Elements SchemaDisplay primitives. holiday has no REST API — the
 * method chip is mutates/reads (never a fake HTTP verb), the path is the command
 * signature, and flag|arg replace path|query|header.
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
    <SchemaDisplay>
      <SchemaDisplayHeader>
        <SchemaDisplayMethod>{mutates ? 'mutates' : 'reads'}</SchemaDisplayMethod>
        <SchemaDisplayPath>holiday {command}</SchemaDisplayPath>
      </SchemaDisplayHeader>
      <SchemaDisplayDescription>{summary}</SchemaDisplayDescription>
      <div className="overflow-x-auto border-b">
        <pre className="px-4 py-3 font-mono text-xs leading-relaxed">{signature}</pre>
      </div>
      <SchemaDisplayContent>
        {flags.length > 0 ? (
          <SchemaDisplayParameters title="Flags / args">
            {flags.map((f) => (
              <SchemaDisplayParameter
                key={f.name}
                name={f.name}
                type={f.type + (f.repeatable ? ' (repeatable)' : '') + (f.default != null ? ` = ${f.default}` : '')}
                required={f.required}
                location={f.kind}
                description={f.description}
              />
            ))}
          </SchemaDisplayParameters>
        ) : null}
        <SchemaDisplayResponse title="Exit codes">
          {exits.map((e) => (
            <SchemaDisplayProperty
              key={e.code}
              name={`exit ${e.code}`}
              type={e.code === 0 ? 'success' : 'error'}
              description={e.meaning}
            />
          ))}
        </SchemaDisplayResponse>
      </SchemaDisplayContent>
      {example ? <SchemaDisplayExample>{example}</SchemaDisplayExample> : null}
    </SchemaDisplay>
  );
}
