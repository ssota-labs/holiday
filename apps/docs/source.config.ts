import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config';
import { z } from 'zod';

/**
 * The frontmatter schema IS the contract — for readers, for the sidebar, and for
 * agents reading the .md twins.
 *
 * `type` is Diátaxis-shaped: a page that cannot say which of these it is usually
 * hasn't decided what it's for, and ends up half-tutorial half-reference and
 * useless as both.
 */
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    // Emits the raw markdown alongside the compiled page, which is what lets us
    // serve a .md twin of every page. Agents get markdown; browsers get React.
    postprocess: { includeProcessedMarkdown: true },
    schema: frontmatterSchema.extend({
      type: z
        .enum([
          'conceptual', // what this is and why it exists
          'guide', // how to accomplish something
          'reference', // lookup-oriented, exhaustive
          'policy', // a rule that must hold, and the test that proves it
          'decision', // what was chosen, and what was rejected
          'overview',
        ])
        .optional(),
      /**
       * Which snapshot this page belongs to. Folder-based versioning: cutting
       * v0.2 means copying the v0.1 folder, and v0.1 freezes as written.
       */
      version: z.string().optional(),
      summary: z.string().optional(),
      related: z.array(z.string()).optional(),
      /** PRD period label, e.g. "0.1 foundation" or "2026-07". */
      period: z.string().optional(),
      /** PRD lifecycle. */
      status: z.enum(['draft', 'active', 'done']).optional(),
      /** Story IDs included in a PRD. */
      stories: z.array(z.string()).optional(),
    }),
  },
  meta: { schema: metaSchema },
});

export default defineConfig();
