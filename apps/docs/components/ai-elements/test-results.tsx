'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

type TestStatus = 'passed' | 'failed' | 'skipped' | 'running';

type Summary = {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration?: number;
};

const TestResultsContext = createContext<{ summary: Summary } | null>(null);
const TestSuiteContext = createContext<{ status: TestStatus } | null>(null);
const TestContext = createContext<{ status: TestStatus; name: string; duration?: number } | null>(null);

const statusColor: Record<TestStatus, string> = {
  passed: 'text-emerald-600',
  failed: 'text-red-600',
  skipped: 'text-amber-600',
  running: 'text-blue-600',
};

export function TestResults({
  summary,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { summary: Summary; children?: ReactNode }) {
  return (
    <TestResultsContext.Provider value={{ summary }}>
      <div className={`not-prose bg-fd-card my-6 overflow-hidden rounded-lg border ${className ?? ''}`} {...props}>
        {children}
      </div>
    </TestResultsContext.Provider>
  );
}

export function TestResultsHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-wrap items-center gap-3 border-b px-4 py-3 ${className ?? ''}`} {...props} />;
}

export function TestResultsSummary({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(TestResultsContext);
  if (!ctx) return null;
  const { passed, failed, skipped, total } = ctx.summary;
  return (
    <div className={`flex flex-wrap gap-3 text-sm ${className ?? ''}`} {...props}>
      <span className="font-medium">{total} tests</span>
      <span className="text-emerald-600">{passed} passed</span>
      {failed > 0 ? <span className="text-red-600">{failed} failed</span> : null}
      {skipped > 0 ? <span className="text-amber-600">{skipped} skipped</span> : null}
    </div>
  );
}

export function TestResultsDuration({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  const ctx = useContext(TestResultsContext);
  if (!ctx?.summary.duration) return null;
  return (
    <span className={`text-fd-muted-foreground ml-auto font-mono text-xs ${className ?? ''}`} {...props}>
      {ctx.summary.duration}ms
    </span>
  );
}

export function TestResultsProgress({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(TestResultsContext);
  if (!ctx) return null;
  const { passed, failed, skipped, total } = ctx.summary;
  if (total === 0) return null;
  const p = (passed / total) * 100;
  const f = (failed / total) * 100;
  const s = (skipped / total) * 100;
  return (
    <div className={`bg-fd-muted h-1.5 w-full overflow-hidden ${className ?? ''}`} {...props}>
      <div className="flex h-full w-full">
        <div className="bg-emerald-500" style={{ width: `${p}%` }} />
        <div className="bg-red-500" style={{ width: `${f}%` }} />
        <div className="bg-amber-500" style={{ width: `${s}%` }} />
      </div>
    </div>
  );
}

export function TestResultsContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`divide-y ${className ?? ''}`} {...props} />;
}

export function TestSuite({
  name,
  status,
  defaultOpen = false,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  name: string;
  status: TestStatus;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <TestSuiteContext.Provider value={{ status }}>
      <div className={className} {...props}>
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-fd-accent/40"
          onClick={() => setOpen((v) => !v)}
        >
          <TestStatus />
          <span className="font-medium">{name}</span>
          <span className="text-fd-muted-foreground ml-auto text-xs">{open ? '▾' : '▸'}</span>
        </button>
        {open ? <div className="border-t bg-fd-background/40">{children}</div> : null}
      </div>
    </TestSuiteContext.Provider>
  );
}

export function TestSuiteName({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={className} {...props} />;
}

export function TestSuiteStats({
  passed = 0,
  failed = 0,
  skipped = 0,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { passed?: number; failed?: number; skipped?: number }) {
  return (
    <div className={`text-fd-muted-foreground flex gap-2 text-xs ${className ?? ''}`} {...props}>
      <span className="text-emerald-600">{passed}</span>
      <span className="text-red-600">{failed}</span>
      <span className="text-amber-600">{skipped}</span>
    </div>
  );
}

export function TestSuiteContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />;
}

export function Test({
  name,
  status,
  duration,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  name: string;
  status: TestStatus;
  duration?: number;
  children?: ReactNode;
}) {
  return (
    <TestContext.Provider value={{ status, name, duration }}>
      <div className={`px-4 py-2 ${className ?? ''}`} {...props}>
        <div className="flex items-center gap-2 text-sm">
          <TestStatus />
          <TestName />
          <TestDuration />
        </div>
        {children}
      </div>
    </TestContext.Provider>
  );
}

export function TestStatus({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  const suite = useContext(TestSuiteContext);
  const test = useContext(TestContext);
  const status = test?.status ?? suite?.status ?? 'passed';
  const label = status === 'passed' ? '✓' : status === 'failed' ? '✗' : status === 'skipped' ? '○' : '…';
  return (
    <span className={`font-mono text-xs ${statusColor[status]} ${className ?? ''}`} {...props}>
      {label}
    </span>
  );
}

export function TestName({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  const test = useContext(TestContext);
  return (
    <span className={`font-mono text-xs ${className ?? ''}`} {...props}>
      {test?.name}
    </span>
  );
}

export function TestDuration({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  const test = useContext(TestContext);
  if (test?.duration == null) return null;
  return (
    <span className={`text-fd-muted-foreground ml-auto font-mono text-[10px] ${className ?? ''}`} {...props}>
      {test.duration}ms
    </span>
  );
}

export function TestError({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-2 rounded border border-red-500/30 bg-red-500/5 p-2 ${className ?? ''}`} {...props} />;
}

export function TestErrorMessage({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-red-700 dark:text-red-400 ${className ?? ''}`} {...props} />;
}

export function TestErrorStack({ className, ...props }: HTMLAttributes<HTMLPreElement>) {
  return <pre className={`mt-1 overflow-x-auto font-mono text-[10px] opacity-80 ${className ?? ''}`} {...props} />;
}
