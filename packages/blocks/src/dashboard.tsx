'use client';

import { JSONUIProvider, Renderer, type Spec } from '@json-render/react';

import { DataProvider, type Datasets } from './data.js';
import { registry } from './registry.js';

/**
 * The whole dashboard, in one component: figures in, page out.
 *
 * This wraps three things a dashboard project should not have to know about:
 *
 *   - **JSONUIProvider.** json-render's Renderer reads visibility, state, action
 *     and validation context; without their providers it throws
 *     "useVisibility must be used within a VisibilityProvider" the moment it
 *     renders a single element. JSONUIProvider installs all of them from the
 *     registry, so the dash template never assembles a provider tree by hand.
 *   - **DataProvider.** The figures the blocks read (see useDatasets).
 *   - **the registry.** Which shadcn component each catalog noun becomes.
 *
 * The dash template imports this and nothing else from the render layer — same
 * reason the catalog gives the agent no money prop: the fewer moving parts the
 * consuming project touches, the fewer ways it drifts from what the CLI bakes.
 */
export function Dashboard({ datasets, spec }: { datasets: Datasets; spec: Spec }) {
  return (
    <DataProvider value={datasets}>
      <JSONUIProvider registry={registry}>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>
    </DataProvider>
  );
}
