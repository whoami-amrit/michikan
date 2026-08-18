import {
  FileTextIcon,
  FolderIcon,
  SearchIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
  XIcon,
} from 'lucide-react';
import * as React from 'react';

import MichikanIcon from '@/assets/michikan-icon.svg?react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
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

import { Button } from './ui/button';

const data = {
  navMain: [
    {
      title: 'Analysis',
      url: '/analysis',
      icon: <SearchIcon />,
    },
    {
      title: 'Jobs',
      url: '/jobs',
      icon: <FolderIcon />,
    },
    {
      title: 'Resumes',
      url: '/resumes',
      icon: <FileTextIcon />,
    },
  ],
};
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { open, toggleSidebar, isMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" {...props}>
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
                  <XIcon />
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
                {open ? <SidebarCloseIcon /> : <SidebarOpenIcon />}
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
