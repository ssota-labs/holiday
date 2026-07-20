import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';

/**
 * Planning catalogs keep children registered in meta.json
 * for check:planning, but the sidebar should only show the index entry — open the
 * index page to browse items with DocKind tickers.
 */
const INDEX_ONLY_FOLDER_URLS = new Set([
  '/docs/planning/prds',
  '/docs/planning/stories',
  '/docs/development/plans',
  '/docs/development/adr',
  '/docs/spec/cli',
]);

/** Index-only catalogs that get a back link + sibling prev/next on detail pages. */
const CATALOGS = [
  { prefix: ['planning', 'prds'] as const, indexUrl: '/docs/planning/prds', label: 'PRD' },
  {
    prefix: ['planning', 'stories'] as const,
    indexUrl: '/docs/planning/stories',
    label: '유저 스토리',
  },
  {
    prefix: ['development', 'plans'] as const,
    indexUrl: '/docs/development/plans',
    label: '구현계획',
  },
  { prefix: ['development', 'adr'] as const, indexUrl: '/docs/development/adr', label: 'ADR' },
] as const;

function normalizeUrl(url: string) {
  return url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url;
}

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  pageTree: {
    transformers: [
      {
        folder(node) {
          const indexUrl = node.index?.url ? normalizeUrl(node.index.url) : null;
          if (indexUrl && INDEX_ONLY_FOLDER_URLS.has(indexUrl)) {
            return { ...node, children: [], defaultOpen: false };
          }
          return node;
        },
      },
    ],
  },
});

function matchCatalog(slug: string[] | undefined) {
  if (!slug) return undefined;
  return CATALOGS.find(
    (catalog) =>
      slug.length === catalog.prefix.length + 1 &&
      catalog.prefix.every((segment, i) => slug[i] === segment),
  );
}

/** Back-to-index control above the title on catalog detail pages. */
export function catalogIndexLink(
  slug: string[] | undefined,
): { href: string; label: string } | undefined {
  const catalog = matchCatalog(slug);
  if (!catalog) return undefined;
  return { href: catalog.indexUrl, label: catalog.label };
}

export type CatalogFooterItems = {
  previous?: { name: string; description?: string; url: string };
  next?: { name: string; description?: string; url: string };
};

/** Prev/next footer cards among catalog siblings (hidden from the sidebar tree). */
export function catalogFooterItems(slug: string[] | undefined): CatalogFooterItems | undefined {
  const catalog = matchCatalog(slug);
  if (!catalog || !slug) return undefined;

  const depth = catalog.prefix.length;
  const siblings = source
    .getPages()
    .filter(
      (page) =>
        page.slugs.length === depth + 1 &&
        catalog.prefix.every((segment, i) => page.slugs[i] === segment),
    )
    .sort((a, b) =>
      (a.slugs[depth] ?? '').localeCompare(b.slugs[depth] ?? '', undefined, { numeric: true }),
    );

  const index = siblings.findIndex((page) => page.slugs[depth] === slug[depth]);
  if (index === -1) return undefined;

  const toItem = (page: (typeof siblings)[number]) => ({
    name: page.data.title,
    description:
      typeof page.data.description === 'string' ? page.data.description : undefined,
    url: page.url,
  });

  const previous = index > 0 ? toItem(siblings[index - 1]!) : undefined;
  const next = index < siblings.length - 1 ? toItem(siblings[index + 1]!) : undefined;
  if (!previous && !next) return undefined;
  return {
    ...(previous ? { previous } : {}),
    ...(next ? { next } : {}),
  };
}
