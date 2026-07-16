import { PropsWithChildren } from 'react';

import { ICrumb } from '@/lib/types';

import { AppBreadcrumb } from './app-breadcrumb';

export default function AppHeader({ crumbs, children }: PropsWithChildren<{ crumbs: ICrumb[] }>) {
  return (
    <header className="flex w-full justify-between p-6 items-center sticky top-0 right-0 bg-background/30 backdrop-blur-2xl z-10">
      <AppBreadcrumb crumbs={crumbs} />
      {children}
    </header>
  );
}
