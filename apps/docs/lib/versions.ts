/**
 * Folder-based versioning.
 *
 * Fumadocs ships no versioning — its docs say it "provides the primitives for you
 * to implement versioning on your own way". The two options are a folder per
 * version (one deployment, content duplicated in git) or a branch per version
 * (no duplication, N deployments, cross-version links break). For a personal
 * project the duplication is cheap and the single deployment is not, so: folders.
 *
 * Cutting a version is `cp -r content/docs/v0.1 content/docs/v0.2` and adding an
 * entry below. v0.1 then freezes exactly as written — that is the snapshot.
 *
 * Honest note: there is one version today, so the switcher has one entry and buys
 * nothing yet. The structure is here so that cutting v0.2 is a copy rather than a
 * refactor.
 */
export interface DocsVersion {
  readonly slug: string;
  readonly label: string;
  /** The version being written against. Exactly one. */
  readonly current: boolean;
}

export const VERSIONS: readonly DocsVersion[] = [{ slug: 'v0.1', label: 'v0.1', current: true }];

export const CURRENT_VERSION: DocsVersion = VERSIONS.find((v) => v.current) ?? VERSIONS[0]!;

export function versionFromSlug(slug: readonly string[] | undefined): DocsVersion {
  const first = slug?.[0];
  return VERSIONS.find((v) => v.slug === first) ?? CURRENT_VERSION;
}
