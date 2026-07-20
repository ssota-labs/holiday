import { Badge } from '@holiday-cfo/ui/components/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@holiday-cfo/ui/components/table';
import { holidayBlockComponents } from '@holiday-cfo/blocks';
import { Callout } from 'fumadocs-ui/components/callout';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

/**
 * Closed MDX vocabulary for the user dash.
 *
 * fumadocs defaults + a small UI shell set + 가계부 blocks.
 * Docs-only blocks (Rule, SchemaTable, …) are intentionally absent.
 * Unregistered tags fail at MDX compile/render — no silent empty cards.
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Card,
    Cards,
    Callout,
    Files,
    Folder,
    File,
    Badge,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    ...holidayBlockComponents,
    ...components,
  };
}
