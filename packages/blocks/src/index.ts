/**
 * @holiday-cfo/blocks — what a dashboard / MDX page is allowed to be made of.
 *
 * Ships SOURCE, like the rest of the shadcn world: the consuming project compiles
 * it. That is why `exports` points at .ts and there is no build step — a
 * dashboard is styled with Tailwind, and Tailwind has to see the class names.
 *
 * There is no json-render layer. Agents write MDX tags and dashboard JSX;
 * figures come only from DataProvider (API or bake).
 */
export {
  catalog,
  blockProps,
  parseBlockProps,
  BLOCK_TYPES,
  BLOCK_DESCRIPTIONS,
  type BlockType,
  type DashCatalog,
} from './catalog.js';
export { DataProvider, useDatasets, type Datasets } from './data.js';
export { formatAmount, exponentOf, signOf, type Amount } from './money.js';
export {
  Dashboard,
  Row,
  CashRunway,
  BalanceTable,
  LedgerHealth,
  CategorizeQueue,
  Note,
  holidayBlockComponents,
} from './components.js';
export { DefaultDashboard } from './dashboard.js';
