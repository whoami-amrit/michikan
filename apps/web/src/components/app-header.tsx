import { PanelLeftOpenIcon } from '@hugeicons/core-free-icons';
import { PropsWithChildren } from 'react';

import { Icon } from '@/components/ui/icon';
import { ICrumb } from '@/lib/types';

import { AppBreadcrumb } from './app-breadcrumb';
import { Button } from './ui/button';
import { useSidebar } from './ui/sidebar';

export default function AppHeader({ crumbs, children }: PropsWithChildren<{ crumbs: ICrumb[] }>) {
  const { toggleSidebar } = useSidebar();
  return (
    <header className="flex w-full justify-between gap-2 p-6 items-center sticky top-0 right-0 bg-background/30 backdrop-blur-2xl z-10 overflow-hidden">
      <AppBreadcrumb crumbs={crumbs} />
      {children}
      <Button onClick={toggleSidebar} variant="ghost" className="shrink-0 md:hidden">
        <Icon icon={PanelLeftOpenIcon} />
      </Button>
    </header>
  );
}
