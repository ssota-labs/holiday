'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { createContext, useContext } from 'react';

type ChangeType = 'major' | 'minor' | 'patch' | 'added' | 'removed';

type PackageInfoContextValue = {
  name: string;
  currentVersion?: string;
  newVersion?: string;
  changeType?: ChangeType;
};

const PackageInfoContext = createContext<PackageInfoContextValue | null>(null);

function usePackageInfo() {
  const ctx = useContext(PackageInfoContext);
  if (!ctx) throw new Error('PackageInfo subcomponents require <PackageInfo>');
  return ctx;
}

const changeStyles: Record<ChangeType, string> = {
  major: 'bg-red-500/10 text-red-700 dark:text-red-400',
  minor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  patch: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  added: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  removed: 'bg-fd-muted text-fd-muted-foreground',
};

export function PackageInfo({
  name,
  currentVersion,
  newVersion,
  changeType,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & PackageInfoContextValue & { children?: ReactNode }) {
  return (
    <PackageInfoContext.Provider value={{ name, currentVersion, newVersion, changeType }}>
      <div
        className={`not-prose bg-fd-card my-6 overflow-hidden rounded-lg border ${className ?? ''}`}
        {...props}
      >
        {children ?? (
          <>
            <PackageInfoHeader>
              <PackageInfoName />
              {changeType ? <PackageInfoChangeType /> : null}
              <PackageInfoVersion />
            </PackageInfoHeader>
          </>
        )}
      </div>
    </PackageInfoContext.Provider>
  );
}

export function PackageInfoHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-wrap items-center gap-2 border-b px-4 py-3 ${className ?? ''}`} {...props} />;
}

export function PackageInfoName({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { name } = usePackageInfo();
  return (
    <div className={`font-mono text-sm font-semibold ${className ?? ''}`} {...props}>
      {children ?? name}
    </div>
  );
}

export function PackageInfoChangeType({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { changeType } = usePackageInfo();
  if (!changeType) return null;
  return (
    <div
      className={`rounded px-2 py-0.5 font-mono text-xs font-medium ${changeStyles[changeType]} ${className ?? ''}`}
      {...props}
    >
      {children ?? changeType}
    </div>
  );
}

export function PackageInfoVersion({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { currentVersion, newVersion } = usePackageInfo();
  const text =
    currentVersion && newVersion
      ? `${currentVersion} → ${newVersion}`
      : (newVersion ?? currentVersion ?? '');
  return (
    <div className={`text-fd-muted-foreground ml-auto font-mono text-xs ${className ?? ''}`} {...props}>
      {children ?? text}
    </div>
  );
}

export function PackageInfoDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-fd-muted-foreground border-b px-4 py-2 text-sm ${className ?? ''}`} {...props} />;
}

export function PackageInfoContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-4 py-3 ${className ?? ''}`} {...props} />;
}

export function PackageInfoDependencies({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`divide-y border-t ${className ?? ''}`} {...props} />;
}

export function PackageInfoDependency({
  name,
  version,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { name: string; version?: string }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2 text-sm ${className ?? ''}`} {...props}>
      <code className="font-mono text-xs">{name}</code>
      {version ? <span className="text-fd-muted-foreground font-mono text-xs">{version}</span> : null}
    </div>
  );
}
