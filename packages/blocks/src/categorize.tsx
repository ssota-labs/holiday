'use client';

import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@holiday-cfo/ui/components/badge';
import { Button } from '@holiday-cfo/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@holiday-cfo/ui/components/card';

import { formatAmount } from './money.js';

/**
 * The categorize queue — the one interactive block, and the one place the
 * dashboard can WRITE.
 *
 * It talks to `/api/holiday/*`, which exists only in the locally-running dash
 * (the template ships the route; it shells out to the CLI, so the CLI still owns
 * every invariant). On a deployed snapshot — Codex Sites, any static host — the
 * endpoint does not exist, the first fetch fails, and the block collapses into a
 * one-line notice. That failure mode IS the security boundary: the local dash is
 * a cockpit, the deployed dash is a photograph (ADR-008).
 *
 * Note what stays impossible: the AGENT still cannot put a figure or a write
 * action in MDX props. The only hands on these buttons are the user's.
 */

interface PendingItem {
  readonly id: string;
  readonly payee: string | null;
  readonly date: string | null;
  readonly amountMinor: string | null;
  readonly commodity: string;
}

interface QueueData {
  readonly items: readonly PendingItem[];
  readonly categories: readonly string[];
}

type State =
  | { phase: 'loading' }
  | { phase: 'offline' }
  | { phase: 'ready'; data: QueueData; busy: string | null; error: string | null };

export function CategorizeQueue({ title, limit }: { title: string; limit?: number | undefined }) {
  const [state, setState] = useState<State>({ phase: 'loading' });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/holiday/pending');
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as QueueData;
      setState({ phase: 'ready', data, busy: null, error: null });
    } catch {
      // No bridge — we are a static snapshot. Say so quietly and stop.
      setState({ phase: 'offline' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.phase === 'loading') return null;
  if (state.phase === 'offline') {
    return (
      <p className="text-muted-foreground text-xs">
        분류 대기함은 로컬 대시보드(<code>pnpm dev</code>)에서만 동작합니다 — 배포본은 스냅샷입니다.
      </p>
    );
  }

  const { data, busy, error } = state;
  const items = data.items.slice(0, limit ?? 20);

  const pick = async (item: PendingItem, category: string, remember: boolean) => {
    setState({ phase: 'ready', data, busy: item.id, error: null });
    try {
      const res = await fetch('/api/holiday/categorize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, category, remember, payee: item.payee }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`);
      await load(); // the route re-bakes the snapshot; reload the queue too
    } catch (e) {
      setState({ phase: 'ready', data, busy: null, error: String((e as Error).message ?? e) });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant={items.length > 0 ? 'destructive' : 'secondary'}>{data.items.length}건 대기</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-destructive text-xs">⚠ {error}</p> : null}
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">분류 대기가 없습니다. 장부가 깨끗합니다.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="space-y-2 border-b pb-3 last:border-b-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium">{item.payee ?? '(상대방 없음)'}</span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {item.date ?? ''} {item.amountMinor ? formatAmount(item.amountMinor, item.commodity) : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.categories.map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant="outline"
                    disabled={busy === item.id}
                    // Plain pick posts once. Alt/Option-click also saves a rule, so
                    // the NEXT 스타벅스 never reaches this queue — the queue is
                    // supposed to shrink itself.
                    onClick={(e) => void pick(item, c, e.altKey)}
                    title="클릭: 이 건만 분류 · ⌥클릭: 규칙으로도 저장"
                  >
                    {c.split(':').slice(1).join(':')}
                  </Button>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
