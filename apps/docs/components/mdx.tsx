import { Card, Cards } from 'fumadocs-ui/components/card';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import { Canvas, CanvasLegend } from './blocks/canvas';
import { CommandSpec } from './blocks/command-spec';
import { Decision } from './blocks/decision';
import { LedgerExample } from './blocks/ledger-example';
import { Rule } from './blocks/rule';
import { SchemaTable } from './blocks/schema-table';
import { Glossary, Term } from './blocks/term';

/**
 * The block vocabulary.
 *
 * Registered rather than imported per-page, on purpose. This is the idea worth
 * taking from agent-native: the set of blocks a page may use is a closed,
 * discoverable vocabulary with schemas, not arbitrary JSX. Every block below
 * validates its props with Zod, so a malformed block fails the build instead of
 * rendering something subtly wrong — and an agent writing MDX here has a fixed
 * list to write against rather than a blank page.
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    // From fumadocs-ui. Registered explicitly rather than star-spread: the
    // vocabulary is closed on purpose, and a missing registration should fail the
    // build — as it did for <Files> — rather than render a hole.
    Card,
    Cards,
    Files,
    Folder,
    File,
    Rule,
    Term,
    Glossary,
    Decision,
    SchemaTable,
    CommandSpec,
    LedgerExample,
    Canvas,
    CanvasLegend,
    ...components,
  };
}
