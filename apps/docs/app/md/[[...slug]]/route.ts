import { notFound } from 'next/navigation';

import { source } from '@/lib/source';

/**
 * The `.md` twin of every page.
 *
 * `/docs/v0.1/policy` renders React; `/docs/v0.1/policy.md` returns raw markdown.
 * This is the pattern agent-native and Vercel's own docs both use: an agent
 * reading these docs should get markdown, not a React shell to reverse-engineer.
 * `includeProcessedMarkdown` in source.config.ts is what makes the text available.
 *
 * These docs describe a tool that is *driven by an agent*, so this is not a nice
 * to have — the skill in plugin/ and this site get read by the same thing.
 *
 * It lives under /md rather than /docs because Next refuses a route.ts and a
 * page.tsx at the same path. next.config.mjs rewrites `/docs/**.md` to here, so
 * the clean URL is what the reader sees.
 */
export const dynamicParams = false;

export async function GET(_req: Request, props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const content = await page.data.getText('processed');
  return new Response(content, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

export async function generateStaticParams() {
  return source.generateParams();
}
