'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type * as PageTree from 'fumadocs-core/page-tree';
import Link from 'fumadocs-core/link';
import { usePathname } from 'fumadocs-core/framework';
import { useTreePath } from 'fumadocs-ui/contexts/tree';
import { SidebarFolder, useFolderDepth } from 'fumadocs-ui/components/sidebar/base';
import { ArrowUpRight, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * Native sidebar folder accordion with localStorage persistence.
 *
 * `<details>/<summary>` owns the toggle. Open/closed state is stored so
 * folders stay as the user left them across navigations and reloads.
 *
 * Index-only catalogs (no children) render as a plain link to the index page —
 * no empty accordion.
 */

const STORAGE_KEY = 'holiday-docs.sidebar-folders';

const itemClass =
  'relative flex flex-row items-center gap-1 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0 transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary data-[active=true]:hover:transition-colors w-full';

type FolderOpenMap = Record<string, boolean>;

function getItemOffset(depth: number) {
  return `calc(${2 + 3 * depth} * var(--spacing))`;
}

function normalize(url: string) {
  return url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url;
}

function isActivePath(href: string, pathname: string) {
  return normalize(href) === normalize(pathname);
}

function folderLabel(name: ReactNode): string {
  if (typeof name === 'string' || typeof name === 'number') return String(name);
  return '섹션';
}

function folderStorageKey(item: PageTree.Folder): string {
  if (item.$id) return item.$id;
  if (item.index?.url) return item.index.url;
  return `name:${folderLabel(item.name)}`;
}

function readOpenMap(): FolderOpenMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as FolderOpenMap) : {};
  } catch {
    return {};
  }
}

function writeOpenState(key: string, open: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const next = { ...readOpenMap(), [key]: open };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function FolderContent({ children }: { children: ReactNode }) {
  const depth = useFolderDepth();

  return (
    <div
      className={cn(
        'relative flex flex-col gap-0.5 pt-0.5',
        depth === 1 &&
          "before:content-[''] before:absolute before:w-px before:inset-y-1 before:bg-fd-border before:inset-s-2.5",
      )}
    >
      {children}
    </div>
  );
}

function IndexLink({
  item,
  indexActive,
  inPath,
  label,
}: {
  item: PageTree.Folder;
  indexActive: boolean;
  inPath: boolean;
  label: string;
}) {
  const depth = useFolderDepth();
  const href = item.index?.url;
  if (!href) return null;

  return (
    <Link
      href={href}
      external={item.index?.external}
      className={cn(itemClass, (inPath || indexActive) && 'bg-fd-primary/10 text-fd-primary')}
      style={{ paddingInlineStart: getItemOffset(depth - 1) }}
      data-active={Boolean(inPath || indexActive)}
      title={label}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {item.icon}
        {item.name}
      </span>
    </Link>
  );
}

function PersistentDetails({
  item,
  inPath,
  indexActive,
  href,
  external,
  label,
  header,
  children,
}: {
  item: PageTree.Folder;
  inPath: boolean;
  indexActive?: boolean;
  href?: string;
  external?: boolean;
  label: string;
  header: ReactNode;
  children: ReactNode;
}) {
  const depth = useFolderDepth();
  const key = folderStorageKey(item);
  const wasInPath = useRef(inPath);
  // SSR and first client paint share the same default to avoid hydration mismatch.
  const [open, setOpen] = useState(() => inPath || Boolean(item.defaultOpen));

  // Restore persisted user preference after mount.
  useEffect(() => {
    const stored = readOpenMap()[key];
    if (typeof stored === 'boolean') setOpen(stored);
  }, [key]);

  // Entering a folder via navigation opens it and persists that.
  useEffect(() => {
    if (inPath && !wasInPath.current) {
      setOpen(true);
      writeOpenState(key, true);
    }
    wasInPath.current = inPath;
  }, [inPath, key]);

  return (
    <details
      className="group/sidebar-folder"
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        if (next === open) return;
        setOpen(next);
        writeOpenState(key, next);
      }}
    >
      <summary
        className={cn(
          itemClass,
          'cursor-pointer list-none [&::-webkit-details-marker]:hidden',
          (inPath || indexActive) && 'bg-fd-primary/10 text-fd-primary',
        )}
        style={{ paddingInlineStart: getItemOffset(depth - 1) }}
        data-active={Boolean(inPath || indexActive)}
        title={`${label} 접기/펼치기`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {header}
          <ChevronDown
            className="text-fd-muted-foreground ms-auto size-4 shrink-0 -rotate-90 transition-transform group-open/sidebar-folder:rotate-0 rtl:rotate-90 rtl:group-open/sidebar-folder:rotate-0"
            aria-hidden
          />
        </span>
        {href ? (
          <Link
            href={href}
            external={external}
            title={`${label} 페이지로 이동`}
            aria-label={`${label} 페이지로 이동`}
            className="text-fd-muted-foreground hover:bg-fd-accent/80 hover:text-fd-accent-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md"
            onClick={(event) => event.stopPropagation()}
          >
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </summary>
      <FolderContent>{children}</FolderContent>
    </details>
  );
}

export function DocsSidebarFolder({
  item,
  children,
}: {
  item: PageTree.Folder;
  children: ReactNode;
}) {
  const path = useTreePath();
  const pathname = usePathname();
  const inPath = path.includes(item);
  const label = folderLabel(item.name);
  const indexActive = item.index ? isActivePath(item.index.url, pathname) : false;
  const indexOnly = item.children.length === 0 && Boolean(item.index);

  return (
    <SidebarFolder collapsible={false} active={false}>
      {indexOnly ? (
        <IndexLink item={item} indexActive={indexActive} inPath={inPath} label={label} />
      ) : (
        <PersistentDetails
          item={item}
          inPath={inPath}
          indexActive={indexActive}
          href={item.index?.url}
          external={item.index?.external}
          label={label}
          header={
            <>
              {item.icon}
              {item.name}
            </>
          }
        >
          {children}
        </PersistentDetails>
      )}
    </SidebarFolder>
  );
}
