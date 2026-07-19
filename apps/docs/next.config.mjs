import { createMDX } from 'fumadocs-mdx/next';

const cliCommandRedirects = [
  ['account/add', 'account#account-add'],
  ['account/list', 'account#account-list'],
  ['txn/add', 'txn#txn-add'],
  ['card/add', 'card#card-add'],
  ['card/list', 'card#card-list'],
  ['installment/add', 'installment#installment-add'],
  ['installment/revise', 'installment#installment-revise'],
  ['installment/list', 'installment#installment-list'],
  ['recurring/add', 'recurring#recurring-add'],
  ['recurring/list', 'recurring#recurring-list'],
  ['income/add', 'income#income-add'],
  ['income/list', 'income#income-list'],
  ['income/source-add', 'income#income-source-add'],
  ['income/settle', 'income#income-settle'],
  ['income/check', 'income#income-check'],
  ['loan/add', 'loan#loan-add'],
  ['loan/list', 'loan#loan-list'],
  ['loan/check', 'loan#loan-check'],
  ['loan/pay', 'loan#loan-pay'],
  ['fx/add', 'fx#fx-add'],
  ['fx/list', 'fx#fx-list'],
  ['fx/show', 'fx#fx-show'],
  ['ingest/submit', 'ingest#ingest-submit'],
  ['ingest/list', 'ingest#ingest-list'],
  ['review/list', 'review#review-list'],
  ['review/accept', 'review#review-accept'],
  ['review/reject', 'review#review-reject'],
  ['tax/return-add', 'tax#tax-return-add'],
  ['tax/return-list', 'tax#tax-return-list'],
  ['tax/return-show', 'tax#tax-return-show'],
].map(([source, destination]) => ({
  source: `/docs/spec/cli/${source}`,
  destination: `/docs/spec/cli/${destination}`,
  permanent: true,
}));

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [
      ...cliCommandRedirects,
      { source: '/docs/workflow', destination: '/docs/workflow/planning', permanent: true },
      {
        source: '/docs/spec/development/docs-first-workflow',
        destination: '/docs/workflow/development',
        permanent: true,
      },
      { source: '/docs/planning/vision', destination: '/docs/vision', permanent: true },
      {
        source: '/docs/planning/journeys',
        destination: '/docs/planning/stories/journeys',
        permanent: true,
      },
      {
        source: '/docs/planning/plans/:path*',
        destination: '/docs/development/plans/:path*',
        permanent: true,
      },
      { source: '/docs/design/system', destination: '/docs/spec/system-model', permanent: true },
      { source: '/docs/design/adr', destination: '/docs/development/adr', permanent: true },
      { source: '/docs/dev/cli', destination: '/docs/spec/cli', permanent: true },
      { source: '/docs/dev/cli/:path*', destination: '/docs/spec/cli/:path*', permanent: true },
      { source: '/docs/dev/data-model', destination: '/docs/spec/data-model', permanent: true },
      { source: '/docs/dev/system', destination: '/docs/spec/system-model', permanent: true },
      { source: '/docs/dev/adr', destination: '/docs/development/adr', permanent: true },
      { source: '/docs/dev/skill', destination: '/docs/agent/skill', permanent: true },
      { source: '/docs/dev', destination: '/docs/spec/system-model', permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: '/docs/:path*.md', destination: '/md/:path*' },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(config);
