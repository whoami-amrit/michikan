import { ICrumb } from '@/lib/types';

import { AppBreadcrumb } from './app-breadcrumb';

export default function AppHeader({ crumbs }: { crumbs: ICrumb[] }) {
  return (
    <header className="flex w-full justify-between p-6">
      <AppBreadcrumb crumbs={crumbs} />
    </header>
  );
}
