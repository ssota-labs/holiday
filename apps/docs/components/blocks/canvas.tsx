'use client';

import { Background, Controls, type Edge, type Node, type NodeProps, ReactFlow, Handle, Position } from '@xyflow/react';
import type { ReactNode } from 'react';

/**
 * A diagram canvas, following AI Elements' `canvas`.
 *
 * AI Elements' Canvas is a ~20-line wrapper over React Flow — `CanvasProps =
 * ReactFlowProps & { children }` with a `<Background>` injected and pan/zoom
 * defaults flipped for a chat surface. Rather than install the registry component
 * and inherit its chat-shaped defaults, this takes the same shape and tunes it
 * for a docs page: no dragging, no selection, fit-to-view, and a fixed height so
 * the diagram cannot swallow the article.
 *
 * Client-only, like the original — React Flow measures the DOM.
 */
export function Canvas({
  nodes,
  edges,
  height = 420,
  children,
}: {
  nodes: Node[];
  edges: Edge[];
  height?: number;
  children?: ReactNode;
}) {
  return (
    <div className="not-prose bg-fd-card my-6 overflow-hidden rounded-lg border" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        // A diagram in prose is a picture, not a workspace. Everything that would
        // let a reader accidentally rearrange it is off.
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        // React Flow defaults preventScrolling to TRUE, which swallows the wheel
        // event over the canvas. In an app that is correct; in an article it means
        // a reader scrolling down gets stuck the moment the cursor crosses a
        // diagram. The page must always win.
        preventScrolling={false}
        proOptions={{ hideAttribution: false }}
      >
        <Background bgColor="var(--color-fd-card)" />
        <Controls showInteractive={false} />
        {children}
      </ReactFlow>
    </div>
  );
}

export interface DocNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  /** Visual weight — `fact` is the journal, `forecast` is a schedule, `derived` is computed. */
  kind?: 'fact' | 'forecast' | 'derived' | 'external';
  handles?: { target?: boolean; source?: boolean };
}

const KIND_STYLE: Record<string, string> = {
  fact: 'border-sky-500/50 bg-sky-500/5',
  forecast: 'border-amber-500/50 bg-amber-500/5',
  derived: 'border-violet-500/50 bg-violet-500/5',
  external: 'border-fd-border bg-fd-muted/30 border-dashed',
};

/**
 * A node, in the shape AI Elements gives them: a card with a header, an optional
 * description, and handles declared in `data` rather than as props.
 *
 * `kind` is the holiday-specific part, and it carries the distinction the whole
 * architecture rests on — a fact is in the journal and immutable, a forecast is a
 * schedule outside it, a derived value is a query. A diagram that does not
 * colour those apart is drawing the wrong system.
 */
function DocNode({ data }: NodeProps) {
  const d = data as DocNodeData;
  // Each side defaults independently. `d.handles ?? {target:true, source:true}`
  // looks equivalent and is not: passing `{ target: false }` satisfies the ??,
  // leaving `source` undefined and the node with no source handle — and React
  // Flow silently DROPS every edge that has nowhere to attach. The page still
  // renders, the nodes still look right, and the diagram is just a list.
  const showTarget = d.handles?.target ?? true;
  const showSource = d.handles?.source ?? true;
  return (
    <div className={`min-w-40 rounded-lg border-2 px-3 py-2 shadow-sm ${KIND_STYLE[d.kind ?? 'fact']}`}>
      {showTarget ? <Handle type="target" position={Position.Left} /> : null}
      <div className="text-sm font-semibold">{d.label}</div>
      {d.description ? <div className="text-fd-muted-foreground mt-0.5 text-xs">{d.description}</div> : null}
      {showSource ? <Handle type="source" position={Position.Right} /> : null}
    </div>
  );
}

const NODE_TYPES = { doc: DocNode };

/** A legend, since the node colours carry meaning rather than decoration. */
export function CanvasLegend() {
  const items: [string, string][] = [
    ['fact', '원장 — 불변, 이미 일어난 일'],
    ['forecast', '스케줄 — 예측, 원장 밖'],
    ['derived', '유도 — 쿼리, 저장 안 함'],
  ];
  return (
    <div className="not-prose text-fd-muted-foreground -mt-4 mb-6 flex flex-wrap gap-4 text-xs">
      {items.map(([kind, label]) => (
        <span key={kind} className="flex items-center gap-1.5">
          <span className={`inline-block size-3 rounded border-2 ${KIND_STYLE[kind]}`} />
          {label}
        </span>
      ))}
    </div>
  );
}
