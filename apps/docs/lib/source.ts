import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';

/**
 * Planning catalogs (PRDs / Stories / Plans) keep children registered in meta.json
 * for check:planning, but the sidebar should only show the index entry — open the
 * index page to browse items with DocKind tickers.
 */
const INDEX_ONLY_FOLDER_URLS = new Set([
  '/docs/planning/prds',
  '/docs/planning/stories',
  '/docs/planning/plans',
]);

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
