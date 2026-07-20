'use client';

import type { ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@holiday-cfo/ui/components/alert';
import { Badge } from '@holiday-cfo/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@holiday-cfo/ui/components/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@holiday-cfo/ui/components/table';

import { CategorizeQueue as CategorizeQueueInner } from './categorize.js';
import { useDatasets } from './data.js';
import { formatAmount, signOf } from './money.js';

/**
 * 가계부 blocks — domain nouns that read figures from useDatasets().
 *
 * None takes an amount as a prop. The catalog (catalog.ts) is the same contract
 * Zod-enforced for agents; these components are what MDX and the dashboard mount.
 */

const money = (minor: string, commodity: string) => {
  const sign = signOf(minor);
  return (
    <span className={sign < 0 ? 'text-destructive tabular-nums' : 'tabular-nums'}>
      {formatAmount(minor, commodity)}
    </span>
  );
};

export function Dashboard({
  title = '가계부',
  asOf,
  children,
}: {
  title?: string;
  asOf?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {asOf ? <p className="text-muted-foreground text-sm">{asOf} 기준</p> : null}
      </div>
      {children}
    </div>
  );
}

export function Row({ cols = 2, children }: { cols?: 1 | 2 | 3; children?: ReactNode }) {
  return (
    <div
      className={
        cols === 1 ? 'grid gap-4' : cols === 3 ? 'grid gap-4 md:grid-cols-3' : 'grid gap-4 md:grid-cols-2'
      }
    >
      {children}
    </div>
  );
}

export function CashRunway({
  title = '현금 런웨이',
  horizonDays = 90,
}: {
  title?: string;
  horizonDays?: number;
}) {
  const { cashflow } = useDatasets();
  const rows = cashflow.runway.slice(0, 12);
  const breach = cashflow.runway.find((r) => signOf(r.balanceAfterMinor) < 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          {breach ? (
            <Badge variant="destructive">{breach.date} 부족</Badge>
          ) : (
            <Badge variant="secondary">{horizonDays}일 이상 버팀</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-3 text-sm">
          현재 현금 {money(cashflow.openingCashMinor, cashflow.commodity)}
        </p>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            확정된 지출이 없습니다. 카드 청구·할부·정기지출·정기수입을 등록하면 여기에 나옵니다.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>날짜</TableHead>
                <TableHead>내역</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead className="text-right">잔액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.date}-${i}`}>
                  <TableCell className="tabular-nums">{r.date}</TableCell>
                  <TableCell>{r.items.map((it) => it.label).join(', ')}</TableCell>
                  <TableCell className="text-right">-{money(r.outflowMinor, cashflow.commodity)}</TableCell>
                  <TableCell className="text-right">{money(r.balanceAfterMinor, cashflow.commodity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {cashflow.gaps.length > 0 ? (
          <div className="mt-3 space-y-1">
            {cashflow.gaps.map((g, i) => (
              <p key={i} className="text-destructive text-xs">
                ⚠ {g.subject} {g.detail}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function BalanceTable({
  title = '잔액',
  account,
  limit = 20,
}: {
  title?: string;
  account?: string;
  limit?: number;
}) {
  const { balances } = useDatasets();
  const rows = balances
    .filter((b) => !account || b.accountCode === account || b.accountCode.startsWith(`${account}:`))
    .slice(0, limit);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>계정</TableHead>
              <TableHead className="text-right">잔액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.accountCode}>
                <TableCell className="font-mono text-xs">{b.accountCode}</TableCell>
                <TableCell className="text-right">{money(b.unitsMinor, b.commodity)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function LedgerHealth({ title = '장부 상태' }: { title?: string }) {
  const { health } = useDatasets();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant={health.ok ? 'secondary' : 'destructive'}>
            {health.ok ? '정상' : `문제 ${health.problems.length}건`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          거래 {health.checked}건 검사, 감사 체인 {health.ok ? '무결' : '이상'}
        </p>
        {health.problems.map((p, i) => (
          <p key={i} className="text-destructive">
            {p.kind}: {p.detail}
          </p>
        ))}
        {health.head ? (
          <p className="text-muted-foreground font-mono text-xs">
            head #{health.head.seq} {health.head.hash.slice(0, 16)}…
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function CategorizeQueue({ title = '분류 대기', limit }: { title?: string; limit?: number }) {
  return <CategorizeQueueInner title={title} limit={limit} />;
}

export function Note({
  body,
  tone = 'neutral',
}: {
  body: string;
  tone?: 'neutral' | 'warning';
}) {
  if (tone === 'warning') {
    return (
      <Alert variant="destructive">
        <AlertTitle>주의</AlertTitle>
        <AlertDescription>{body}</AlertDescription>
      </Alert>
    );
  }
  return <p className="text-muted-foreground text-sm">{body}</p>;
}

/** Map of 가계부 tags for MDX `getMDXComponents`. */
export const holidayBlockComponents = {
  Dashboard,
  Row,
  CashRunway,
  BalanceTable,
  LedgerHealth,
  CategorizeQueue,
  Note,
} as const;
