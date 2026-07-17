/**
 * @holiday-cfo/blocks — what a dashboard is allowed to be made of.
 *
 * Ships SOURCE, like the rest of the shadcn world: the consuming project compiles
 * it. That is why `exports` points at .ts and there is no build step — a
 * dashboard is styled with Tailwind, and Tailwind has to see the class names.
 */
export { catalog, type DashCatalog } from './catalog.js';
export { registry } from './registry.js';
export { DataProvider, useDatasets, type Datasets } from './data.js';
export { formatAmount, exponentOf, signOf, type Amount } from './money.js';
