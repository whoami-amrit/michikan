import { Outlet } from 'react-router';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider } from '@/lib/contexts/sidebar/provider';

export default function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <Outlet />
    </SidebarProvider>
  );
}
