'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { createContext, useContext } from 'react';

export type SchemaParameter = {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  location?: 'path' | 'query' | 'header' | 'flag' | 'arg';
};

export type SchemaProperty = {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  properties?: SchemaProperty[];
  items?: SchemaProperty;
};

type SchemaDisplayContextValue = {
  method?: string;
  path?: string;
  description?: string;
  parameters?: SchemaParameter[];
  requestBody?: SchemaProperty[];
  responseBody?: SchemaProperty[];
};

const SchemaDisplayContext = createContext<SchemaDisplayContextValue | null>(null);

function useSchemaDisplay() {
  return useContext(SchemaDisplayContext) ?? {};
}

const methodStyles: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  POST: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  PUT: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  PATCH: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  DELETE: 'bg-red-500/10 text-red-700 dark:text-red-400',
  mutates: 'bg-red-500/10 text-red-700 dark:text-red-400',
  reads: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
};

export function SchemaDisplay({
  method,
  path,
  description,
  parameters,
  requestBody,
  responseBody,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> &
  SchemaDisplayContextValue & {
    children?: ReactNode;
  }) {
  return (
    <SchemaDisplayContext.Provider
      value={{ method, path, description, parameters, requestBody, responseBody }}
    >
      <div
        className={`not-prose bg-fd-card my-6 overflow-hidden rounded-lg border ${className ?? ''}`}
        {...props}
      >
        {children ?? (
          <>
            <SchemaDisplayHeader>
              {method ? <SchemaDisplayMethod /> : null}
              {path ? <SchemaDisplayPath /> : null}
            </SchemaDisplayHeader>
            {description ? <SchemaDisplayDescription>{description}</SchemaDisplayDescription> : null}
            <SchemaDisplayContent>
              {parameters && parameters.length > 0 ? (
                <SchemaDisplayParameters>
                  {parameters.map((p) => (
                    <SchemaDisplayParameter key={`${p.location ?? 'flag'}:${p.name}`} {...p} />
                  ))}
                </SchemaDisplayParameters>
              ) : null}
              {requestBody && requestBody.length > 0 ? (
                <SchemaDisplayRequest>
                  {requestBody.map((p) => (
                    <SchemaDisplayProperty key={p.name} {...p} />
                  ))}
                </SchemaDisplayRequest>
              ) : null}
              {responseBody && responseBody.length > 0 ? (
                <SchemaDisplayResponse>
                  {responseBody.map((p) => (
                    <SchemaDisplayProperty key={p.name} {...p} />
                  ))}
                </SchemaDisplayResponse>
              ) : null}
            </SchemaDisplayContent>
          </>
        )}
      </div>
    </SchemaDisplayContext.Provider>
  );
}

export function SchemaDisplayHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-wrap items-center gap-2 border-b px-4 py-3 ${className ?? ''}`} {...props} />;
}

export function SchemaDisplayMethod({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  const { method } = useSchemaDisplay();
  if (!method && children == null) return null;
  const label = typeof children === 'string' ? children : (method ?? '');
  const style = methodStyles[label] ?? 'bg-fd-muted text-fd-foreground';
  return (
    <span className={`rounded px-2 py-0.5 font-mono text-xs font-medium ${style} ${className ?? ''}`} {...props}>
      {children ?? method}
    </span>
  );
}

export function SchemaDisplayPath({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  const { path } = useSchemaDisplay();
  return (
    <code className={`font-mono text-sm font-semibold ${className ?? ''}`} {...props}>
      {children ?? path}
    </code>
  );
}

export function SchemaDisplayDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-fd-muted-foreground border-b px-4 py-2 text-sm ${className ?? ''}`} {...props} />;
}

export function SchemaDisplayContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`divide-y ${className ?? ''}`} {...props} />;
}

export function SchemaDisplayParameters({
  children,
  className,
  title = 'Parameters',
  ...props
}: HTMLAttributes<HTMLDivElement> & { title?: string }) {
  return (
    <div className={`px-4 py-3 ${className ?? ''}`} {...props}>
      <div className="text-fd-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function SchemaDisplayParameter({
  name,
  type,
  required,
  description,
  location,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & SchemaParameter) {
  return (
    <div className={`text-sm ${className ?? ''}`} {...props}>
      <div className="flex flex-wrap items-baseline gap-2">
        <code className="font-mono text-xs">{name}</code>
        {required ? <span className="text-red-500 text-xs">*</span> : null}
        {location ? <span className="text-fd-muted-foreground font-mono text-[10px]">{location}</span> : null}
        <code className="text-fd-muted-foreground font-mono text-xs">{type}</code>
      </div>
      {description ? <p className="text-fd-muted-foreground mt-0.5 text-xs">{description}</p> : null}
    </div>
  );
}

export function SchemaDisplayRequest({
  children,
  className,
  title = 'Request',
  ...props
}: HTMLAttributes<HTMLDivElement> & { title?: string }) {
  return (
    <div className={`px-4 py-3 ${className ?? ''}`} {...props}>
      <div className="text-fd-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function SchemaDisplayResponse({
  children,
  className,
  title = 'Response',
  ...props
}: HTMLAttributes<HTMLDivElement> & { title?: string }) {
  return (
    <div className={`px-4 py-3 ${className ?? ''}`} {...props}>
      <div className="text-fd-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function SchemaDisplayProperty({
  name,
  type,
  required,
  description,
  properties,
  items,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & SchemaProperty) {
  return (
    <div className={`text-sm ${className ?? ''}`} {...props}>
      <div className="flex flex-wrap items-baseline gap-2">
        <code className="font-mono text-xs">{name}</code>
        {required ? <span className="text-red-500 text-xs">*</span> : null}
        <code className="text-fd-muted-foreground font-mono text-xs">{type}</code>
      </div>
      {description ? <p className="text-fd-muted-foreground mt-0.5 text-xs">{description}</p> : null}
      {properties && properties.length > 0 ? (
        <div className="mt-2 ml-3 space-y-2 border-l pl-3">
          {properties.map((p) => (
            <SchemaDisplayProperty key={p.name} {...p} />
          ))}
        </div>
      ) : null}
      {items ? (
        <div className="mt-2 ml-3 border-l pl-3">
          <SchemaDisplayProperty {...items} />
        </div>
      ) : null}
    </div>
  );
}

export function SchemaDisplayExample({ className, ...props }: HTMLAttributes<HTMLPreElement>) {
  return (
    <pre
      className={`overflow-x-auto border-t px-4 py-3 font-mono text-xs leading-relaxed ${className ?? ''}`}
      {...props}
    />
  );
}
