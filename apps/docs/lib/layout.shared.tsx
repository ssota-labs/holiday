import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <span className="font-semibold">holiday</span>
          <span className="text-fd-muted-foreground ml-2 text-xs">개인 CFO 원장</span>
        </>
      ),
    },
    githubUrl: 'https://github.com/ssota-labs/holiday',
  };
}
