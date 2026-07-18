'use client';

import { defineRegistry } from '@json-render/react';

import { Alert, AlertDescription, AlertTitle } from '@holiday-cfo/ui/components/alert';
import { Badge } from '@holiday-cfo/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@holiday-cfo/ui/components/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@holiday-cfo/ui/components/table';
import { CategorizeQueue } from './categorize.js';
import { catalog } from './catalog.js';
import { useDatasets } from './data.js';
import { formatAmount, signOf } from './money.js';

/**
 * Where the domain nouns become shadcn.
 *
 * The catalog says `CashRunway`; this file is the only place that knows it is a
 * Card with a Table in it. That indirection is what lets the look change without
 * the agent's vocabulary changing — and, more importantly, what stops the agent
 * from reaching for a Card directly and reassembling a different dashboard every
 * session.
 *
 * Every block reads its figures from useDatasets(). None takes an amount as a
 * prop, because the catalog gives it no way to.
 */
const money = (minor: string, commodity: string) => {
  const sign = signOf(minor);
  return (
    <span className={sign < 0 ? 'text-destructive tabular-nums' : 'tabular-nums'}>
      {formatAmount(minor, commodity)}
    </span>
  );
};

export const { registry } = defineRegistry(catalog, {
  components: {
    Dashboard: ({ props, children }) => (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{props.title}</h1>
          {props.asOf ? <p className="text-muted-foreground text-sm">{props.asOf} 기준</p> : null}
        </div>
        {children}
      </div>
    ),

    Row: ({ props, children }) => (
      <div
        className={
          props.cols === 1 ? 'grid gap-4' : props.cols === 3 ? 'grid gap-4 md:grid-cols-3' : 'grid gap-4 md:grid-cols-2'
        }
      >
        {children}
      </div>
    ),

    CashRunway: ({ props }) => {
      const { cashflow } = useDatasets();
      const rows = cashflow.runway.slice(0, 12);
      // The first day the projected balance goes negative. This is the whole
      // question the block exists to answer, so it is stated in words rather than
      // left for the reader to spot in a column of numbers.
      const breach = cashflow.runway.find((r) => signOf(r.balanceAfterMinor) < 0);
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{props.title}</span>
              {breach ? (
                <Badge variant="destructive">{breach.date} 부족</Badge>
              ) : (
                <Badge variant="secondary">{props.horizonDays ?? 90}일 이상 버팀</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-3 text-sm">
              현재 현금 {money(cashflow.openingCashMinor, cashflow.commodity)}
            </p>
            {rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">확정된 지출이 없습니다. 카드 청구·할부·정기지출을 등록하면 여기에 나옵니다.</p>
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
              // Shown, never folded away. The CLI prints these; a dashboard that
              // drops them turns "I don't know" into "you're fine".
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
    },

    BalanceTable: ({ props }) => {
      const { balances } = useDatasets();
      const rows = balances
        .filter((b) => !props.account || b.accountCode === props.account || b.accountCode.startsWith(`${props.account}:`))
        .slice(0, props.limit);
      return (
        <Card>
          <CardHeader>
            <CardTitle>{props.title}</CardTitle>
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
    },

    LedgerHealth: ({ props }) => {
      const { health } = useDatasets();
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{props.title}</span>
              <Badge variant={health.ok ? 'secondary' : 'destructive'}>{health.ok ? '정상' : `문제 ${health.problems.length}건`}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">거래 {health.checked}건 검사, 감사 체인 {health.ok ? '무결' : '이상'}</p>
            {health.problems.map((p, i) => (
              <p key={i} className="text-destructive">
                {p.kind}: {p.detail}
              </p>
            ))}
            {health.head ? (
              // Printed on purpose. The chain is only self-consistent until this
              // value is anchored somewhere outside the file.
              <p className="text-muted-foreground font-mono text-xs">
                head #{health.head.seq} {health.head.hash.slice(0, 16)}…
              </p>
            ) : null}
          </CardContent>
        </Card>
      );
    },

    CategorizeQueue: ({ props }) => <CategorizeQueue title={props.title} limit={props.limit} />,

    Note: ({ props }) =>
      props.tone === 'warning' ? (
        <Alert variant="destructive">
          <AlertTitle>주의</AlertTitle>
          <AlertDescription>{props.body}</AlertDescription>
        </Alert>
      ) : (
        <p className="text-muted-foreground text-sm">{props.body}</p>
      ),
  },
  actions: {},
});
