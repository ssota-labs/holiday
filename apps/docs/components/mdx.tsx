import { Card, Cards } from 'fumadocs-ui/components/card';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { createGenerator, createFileSystemGeneratorCache } from 'fumadocs-typescript';
import { AutoTypeTable, type AutoTypeTableProps } from 'fumadocs-typescript/ui';

import {
  PackageInfo,
  PackageInfoChangeType,
  PackageInfoContent,
  PackageInfoDependencies,
  PackageInfoDependency,
  PackageInfoDescription,
  PackageInfoHeader,
  PackageInfoName,
  PackageInfoVersion,
} from './ai-elements/package-info';
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
  SchemaDisplayRequest,
  SchemaDisplayResponse,
} from './ai-elements/schema-display';
import {
  Test,
  TestDuration,
  TestError,
  TestErrorMessage,
  TestErrorStack,
  TestName,
  TestResults,
  TestResultsContent,
  TestResultsDuration,
  TestResultsHeader,
  TestResultsProgress,
  TestResultsSummary,
  TestStatus,
  TestSuite,
  TestSuiteContent,
  TestSuiteName,
  TestSuiteStats,
} from './ai-elements/test-results';
import { Canvas, CanvasLegend } from './blocks/canvas';
import { CommandSpec } from './blocks/command-spec';
import { Decision } from './blocks/decision';
import { LedgerExample } from './blocks/ledger-example';
import { Rule } from './blocks/rule';
import { SpecVersion } from './blocks/spec-version';
import { SchemaTable } from './blocks/schema-table';
import { Glossary, Term } from './blocks/term';

const generator = createGenerator({
  cache: createFileSystemGeneratorCache('.next/fumadocs-typescript'),
  tsconfigPath: '../../packages/core/tsconfig.json',
});

/**
 * The block vocabulary.
 *
 * Registered rather than imported per-page, on purpose. Closed, discoverable
 * vocabulary with Zod-validated blocks where applicable.
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
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
    SpecVersion,
    LedgerExample,
    Canvas,
    CanvasLegend,
    AutoTypeTable: (props: Partial<AutoTypeTableProps>) => (
      <AutoTypeTable
        {...props}
        generator={generator}
        options={{ basePath: '../..', ...props.options }}
      />
    ),
    PackageInfo,
    PackageInfoHeader,
    PackageInfoName,
    PackageInfoChangeType,
    PackageInfoVersion,
    PackageInfoDescription,
    PackageInfoContent,
    PackageInfoDependencies,
    PackageInfoDependency,
    SchemaDisplay,
    SchemaDisplayHeader,
    SchemaDisplayMethod,
    SchemaDisplayPath,
    SchemaDisplayDescription,
    SchemaDisplayContent,
    SchemaDisplayParameters,
    SchemaDisplayParameter,
    SchemaDisplayRequest,
    SchemaDisplayResponse,
    SchemaDisplayProperty,
    SchemaDisplayExample,
    TestResults,
    TestResultsHeader,
    TestResultsSummary,
    TestResultsDuration,
    TestResultsProgress,
    TestResultsContent,
    TestSuite,
    TestSuiteName,
    TestSuiteStats,
    TestSuiteContent,
    Test,
    TestStatus,
    TestName,
    TestDuration,
    TestError,
    TestErrorMessage,
    TestErrorStack,
    ...components,
  };
}
