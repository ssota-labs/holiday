import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Local cockpit keeps API routes (CLI bridge). For a deploy photo, set
  // `output: 'export'` — write APIs disappear and blocks fall back to bake JSON.
};

const withMDX = createMDX();

export default withMDX(config);
