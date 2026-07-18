import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { parse } from 'yaml';

export type DocumentKind = 'prd' | 'story' | 'spec' | 'plan';

export interface PlanningDocument {
  readonly file: string;
  readonly slug: string;
  readonly kind: DocumentKind;
  readonly id: string;
  readonly status?: string;
  readonly stage?: string;
  readonly changeType?: string;
  readonly prd?: string;
  readonly specs: readonly string[];
  readonly stories: readonly string[];
  readonly codeAreas: readonly string[];
}

interface Frontmatter {
  readonly title?: unknown;
  readonly id?: unknown;
  readonly status?: unknown;
  readonly stage?: unknown;
  readonly changeType?: unknown;
  readonly prd?: unknown;
  readonly specs?: unknown;
  readonly stories?: unknown;
  readonly codeAreas?: unknown;
}

const PREFIX: Readonly<Record<DocumentKind, string>> = {
  prd: 'PRD-',
  story: 'US-',
  spec: 'SPEC-',
  plan: 'PLAN-',
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.mdx') ? [full] : [];
  });
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : [];
}

export function parseFrontmatter(source: string, file: string): Frontmatter {
  if (!source.startsWith('---\n')) throw new Error(`${file}: frontmatter must start on the first line`);
  const end = source.indexOf('\n---', 4);
  if (end === -1) throw new Error(`${file}: frontmatter is not closed`);

  const parsed: unknown = parse(source.slice(4, end));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${file}: frontmatter must be a mapping`);
  }
  return parsed as Frontmatter;
}

function classify(file: string, contentDir: string, frontmatter: Frontmatter): DocumentKind | null {
  const rel = relative(contentDir, file).replaceAll('\\', '/');
  if (rel.startsWith('planning/prds/') && basename(file) !== 'index.mdx') return 'prd';
  if (rel.startsWith('planning/stories/') && basename(file) !== 'index.mdx') return 'story';
  if (rel.startsWith('planning/plans/') && basename(file) !== 'index.mdx') return 'plan';
  if (rel.startsWith('spec/') && asString(frontmatter.id)?.startsWith(PREFIX.spec)) return 'spec';
  return null;
}

function documentId(kind: DocumentKind, frontmatter: Frontmatter): string | undefined {
  const explicit = asString(frontmatter.id);
  if (explicit) return explicit;

  // Existing PRDs and stories predate stable `id` frontmatter. Their title is
  // already the public identifier, so keep them valid without a bulk rewrite.
  if (kind === 'prd' || kind === 'story') return asString(frontmatter.title);
  return undefined;
}

export function collectPlanningDocuments(contentDir: string): {
  readonly documents: readonly PlanningDocument[];
  readonly problems: readonly string[];
} {
  const documents: PlanningDocument[] = [];
  const problems: string[] = [];

  for (const file of walk(contentDir)) {
    let frontmatter: Frontmatter;
    try {
      frontmatter = parseFrontmatter(readFileSync(file, 'utf8'), relative(contentDir, file));
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
      continue;
    }

    const kind = classify(file, contentDir, frontmatter);
    if (!kind) continue;

    const id = documentId(kind, frontmatter);
    const rel = relative(contentDir, file).replaceAll('\\', '/');
    if (!id) {
      problems.push(`${rel}: ${kind} document is missing id`);
      continue;
    }
    if (!id.toUpperCase().startsWith(PREFIX[kind])) {
      problems.push(`${rel}: ${kind} id must start with ${PREFIX[kind]} (found ${id})`);
    }

    documents.push({
      file: rel,
      slug: basename(file, '.mdx'),
      kind,
      id,
      ...(asString(frontmatter.status) ? { status: asString(frontmatter.status) } : {}),
      ...(asString(frontmatter.stage) ? { stage: asString(frontmatter.stage) } : {}),
      ...(asString(frontmatter.changeType)
        ? { changeType: asString(frontmatter.changeType) }
        : {}),
      ...(asString(frontmatter.prd) ? { prd: asString(frontmatter.prd) } : {}),
      specs: asStringArray(frontmatter.specs),
      stories: asStringArray(frontmatter.stories),
      codeAreas: asStringArray(frontmatter.codeAreas),
    });
  }

  return { documents, problems };
}

function checkNavigation(contentDir: string, document: PlanningDocument, problems: string[]): void {
  const folder = join(contentDir, dirname(document.file));
  const metaPath = join(folder, 'meta.json');
  let pages: unknown;
  try {
    const meta: unknown = JSON.parse(readFileSync(metaPath, 'utf8'));
    pages =
      typeof meta === 'object' && meta !== null && !Array.isArray(meta)
        ? (meta as { readonly pages?: unknown }).pages
        : undefined;
  } catch {
    problems.push(`${document.file}: sibling meta.json is missing or invalid`);
    return;
  }

  if (!Array.isArray(pages) || !pages.includes(document.slug)) {
    problems.push(`${document.file}: ${document.slug} is not registered in sibling meta.json`);
  }
}

export function validatePlanning(contentDir: string): readonly string[] {
  const collected = collectPlanningDocuments(contentDir);
  const problems = [...collected.problems];
  const byId = new Map<string, PlanningDocument>();

  for (const document of collected.documents) {
    const prior = byId.get(document.id);
    if (prior) {
      problems.push(`${document.file}: duplicate id ${document.id} (also in ${prior.file})`);
    } else {
      byId.set(document.id, document);
    }
    checkNavigation(contentDir, document, problems);
  }

  const requireReference = (
    owner: PlanningDocument,
    id: string,
    kind: DocumentKind,
  ): PlanningDocument | undefined => {
    const target = byId.get(id);
    if (!target) {
      problems.push(`${owner.file}: ${kind} reference does not exist — ${id}`);
      return undefined;
    }
    if (target.kind !== kind) {
      problems.push(`${owner.file}: ${id} is ${target.kind}, expected ${kind}`);
      return undefined;
    }
    return target;
  };

  for (const document of collected.documents) {
    if (document.kind === 'prd') {
      for (const story of document.stories) requireReference(document, story, 'story');
      continue;
    }
    if (document.kind === 'spec') {
      if (!['draft', 'accepted', 'superseded'].includes(document.stage ?? '')) {
        problems.push(`${document.file}: spec stage must be draft, accepted, or superseded`);
      }
      continue;
    }
    if (document.kind !== 'plan') continue;

    if (!['draft', 'ready', 'active', 'done', 'superseded'].includes(document.stage ?? '')) {
      problems.push(`${document.file}: plan stage must be draft, ready, active, done, or superseded`);
    }
    if (!['product', 'bugfix', 'maintenance'].includes(document.changeType ?? '')) {
      problems.push(`${document.file}: plan changeType must be product, bugfix, or maintenance`);
    }
    if (document.codeAreas.length === 0) {
      problems.push(`${document.file}: plan must declare at least one codeAreas entry`);
    }

    if (document.changeType === 'product' || document.changeType === 'bugfix') {
      if (!document.prd) problems.push(`${document.file}: ${document.changeType} plan requires prd`);
      if (document.specs.length === 0) {
        problems.push(`${document.file}: ${document.changeType} plan requires at least one spec`);
      }
    }
    if (document.changeType === 'product' && document.stories.length === 0) {
      problems.push(`${document.file}: product plan requires at least one story`);
    }

    const prd = document.prd ? requireReference(document, document.prd, 'prd') : undefined;
    const specs = document.specs
      .map((id) => requireReference(document, id, 'spec'))
      .filter((item): item is PlanningDocument => item !== undefined);
    for (const story of document.stories) requireReference(document, story, 'story');

    if (['ready', 'active', 'done'].includes(document.stage ?? '')) {
      if (prd?.status === 'draft') {
        problems.push(`${document.file}: ${document.stage} plan references draft PRD ${prd.id}`);
      }
      for (const spec of specs) {
        if (spec.stage !== 'accepted') {
          problems.push(
            `${document.file}: ${document.stage} plan requires accepted spec ${spec.id} ` +
              `(found ${spec.stage ?? 'missing'})`,
          );
        }
      }
    }
  }

  return problems;
}
