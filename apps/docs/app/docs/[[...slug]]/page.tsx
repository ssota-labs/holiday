import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { ChevronLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DocKind, docKindFromSlug } from '@/components/blocks/doc-kind';
import { DocsInlineToc } from '@/components/docs-inline-toc';
import { getMDXComponents } from '@/components/mdx';
import { catalogFooterItems, catalogIndexLink, source } from '@/lib/source';

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const kind = docKindFromSlug(params.slug);
  const ticker = typeof page.data.ticker === 'string' ? page.data.ticker : undefined;
  const toc = page.data.toc;
  const footerItems = catalogFooterItems(params.slug);
  const indexLink = catalogIndexLink(params.slug);

  return (
    <DocsPage
      toc={toc}
      full={page.data.full}
      footer={footerItems ? { items: footerItems } : undefined}
    >
      {indexLink ? (
        <Link
          href={indexLink.href}
          className="text-fd-muted-foreground hover:bg-fd-accent/50 hover:text-fd-accent-foreground -mt-1 inline-flex w-fit items-center gap-1 rounded-lg border px-2.5 py-1.5 text-sm no-underline transition-colors"
        >
          <ChevronLeft className="size-4 shrink-0" />
          {indexLink.label}
        </Link>
      ) : null}
      <DocsTitle>
        <span className="inline-flex flex-wrap items-center gap-2">
          {kind ? <DocKind kind={kind} ticker={ticker} /> : null}
          {page.data.title}
        </span>
      </DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsInlineToc items={toc} />
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return { title: page.data.title, description: page.data.description };
}
