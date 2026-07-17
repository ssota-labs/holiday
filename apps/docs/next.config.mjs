import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/docs/dev/cli', destination: '/docs/spec/cli', permanent: true },
      { source: '/docs/dev/cli/:path*', destination: '/docs/spec/cli/:path*', permanent: true },
      { source: '/docs/dev/data-model', destination: '/docs/spec/data-model', permanent: true },
      { source: '/docs/dev/system', destination: '/docs/design/system', permanent: true },
      { source: '/docs/dev/adr', destination: '/docs/design/adr', permanent: true },
      { source: '/docs/dev/skill', destination: '/docs/agent/skill', permanent: true },
      { source: '/docs/dev', destination: '/docs/design/system', permanent: true },
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
