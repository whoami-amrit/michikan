import {
  Cancel01Icon,
  CrownPlusIcon,
  ExternalLinkIcon,
  File02Icon,
  Folder01Icon,
  LayoutLeftIcon,
  PanelLeftOpenIcon,
} from '@hugeicons/core-free-icons';
import { Plan } from 'db';
import * as React from 'react';
import { IAiUsageResponse } from 'shared';
import useSWR from 'swr';

import MichikanIcon from '@/assets/michikan-icon.svg?react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Icon } from '@/components/ui/icon';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { PAYMENTS_URL } from '@/lib/constants';
import { api } from '@/lib/utils';

import { Button } from './ui/button';

const data = {
  navMain: [
    {
      title: 'Jobs',
      url: '/jobs',
      icon: <Icon icon={Folder01Icon} />,
    },
    {
      title: 'Resumes',
      url: '/resumes',
      icon: <Icon icon={File02Icon} />,
    },
  ],
};
const AI_USAGE_KEY = '/users/me/ai-usage';

function UpgradePlanItem() {
  const { data: usage } = useSWR<IAiUsageResponse>(AI_USAGE_KEY, {
    fetcher: () => api.get(AI_USAGE_KEY).json<IAiUsageResponse>(),
  });

  if (usage?.plan !== Plan.FREE) {
    return null;
  }

  const left = Math.max(usage.limit - usage.used, 0);
  const title = left > usage.limit / 2 ? 'Unlock unlimited polish' : "Don't lose your momentum";

  return (
    <div className="px-1 md:px-1.5">
      <Item
        variant="outline"
        size="xs"
        className="cursor-pointer hover:bg-muted group/upgrade-item group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:p-0"
        render={
          <a href={PAYMENTS_URL} target="_blank" rel="noopener noreferrer" aria-label={title} />
        }
      >
        <ItemMedia
          variant="icon"
          className="group-data-[collapsible=icon]:translate-y-0 group-data-[collapsible=icon]:self-center"
        >
          <Icon icon={ExternalLinkIcon} className="hidden group-hover/upgrade-item:block" />
          <Icon icon={CrownPlusIcon} className="group-hover/upgrade-item:hidden" />
        </ItemMedia>
        <ItemContent className="group-data-[collapsible=icon]:hidden">
          <ItemTitle>
            <span>{title}</span>
          </ItemTitle>
          <ItemDescription className="text-xs">
            {left} of {usage.limit} free runs left
          </ItemDescription>
        </ItemContent>
      </Item>
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { open, toggleSidebar, isMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" side={isMobile ? 'right' : 'left'} {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className={`pt-3 ${isMobile ? 'pl-2 pt-4' : ''}`}>
            {isMobile ? (
              <div className="flex justify-between gap-6">
                <div className="flex grow text-left shrink-0 items-center gap-2">
                  <MichikanIcon className="size-6" />
                  <span className="font-sm font-bold font-heading">Michikan</span>
                </div>

                <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} className="shrink">
                  <Icon icon={Cancel01Icon} />
                </Button>
              </div>
            ) : (
              <SidebarMenuButton onClick={toggleSidebar}>
                {open && (
                  <div className="flex flex-1 text-left shrink-0 items-center gap-2">
                    <MichikanIcon className="size-6" />
                    <span className="font-sm font-bold font-heading">Michikan</span>
                  </div>
                )}
                {open ? <Icon icon={PanelLeftOpenIcon} /> : <Icon icon={LayoutLeftIcon} />}
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <UpgradePlanItem />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
