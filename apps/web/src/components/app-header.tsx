import { PropsWithChildren } from 'react';

import { ICrumb } from '@/lib/types';

import { AppBreadcrumb } from './app-breadcrumb';

export default function AppHeader({ crumbs, children }: PropsWithChildren<{ crumbs: ICrumb[] }>) {
  return (
    <header className="flex w-full justify-between p-6 items-center">
      <AppBreadcrumb crumbs={crumbs} />
      {children}
    </header>
  );
}
