import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <span className="font-semibold">holiday</span>
          <span className="text-fd-muted-foreground ml-2 text-xs">장부 화면</span>
        </>
      ),
    },
    links: [
      {
        text: '대시보드',
        url: '/dashboard',
        active: 'nested-url',
      },
    ],
  };
}
