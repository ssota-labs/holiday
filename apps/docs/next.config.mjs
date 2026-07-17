import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // `/docs/v0.1/policy.md` → the raw-markdown handler at app/md/.
      // Next refuses a route.ts and a page.tsx at the same path, so the handler
      // lives elsewhere and this keeps the URL the reader (and the agent) sees.
      { source: '/docs/:path*.md', destination: '/md/:path*' },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(config);
