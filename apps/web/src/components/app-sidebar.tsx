'use client';

import { FileTextIcon, FolderIcon, SearchIcon, UserCircle } from 'lucide-react';
import * as React from 'react';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';

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
    {
      title: 'User',
      url: '/user',
      icon: <UserCircle />,
    },
  ],
};
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <div className="grid flex-1 text-left text-sm font-bold leading-tight px-2 pt-4">
          <span className="truncate font-heading">Michikan</span>
        </div>
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
