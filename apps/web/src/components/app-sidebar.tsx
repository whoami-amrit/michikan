import {
  FileTextIcon,
  FolderIcon,
  SearchIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
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
} from '@/components/ui/sidebar';
import { useSidebar } from '@/lib/contexts/sidebar/hook';

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
  const { open, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="pt-3">
            <SidebarMenuButton onClick={toggleSidebar}>
              {open && (
                <div className="flex flex-1 text-left shrink-0 items-center gap-2">
                  <MichikanIcon className="size-6" />
                  <span className="font-sm font-bold font-heading">Michikan</span>
                </div>
              )}
              {open ? <SidebarCloseIcon /> : <SidebarOpenIcon />}
            </SidebarMenuButton>
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
