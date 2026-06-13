import { NavLink, Outlet } from 'react-router';

import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { SidebarProvider } from '@/lib/contexts/sidebar/provider';

export default function Layout() {
  const crumbs = useBreadcrumbs({
    mapping: {
      overview: 'Overview',
      jobs: 'Jobs',
      user: 'User Settings',
      analysis: 'AI Job Analysis',
      resumes: 'Resumes',
    },
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {crumbs.map((crumb, index) => (
                  <>
                    {index !== 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem key={crumb.name}>
                      {index === crumbs.length - 1 ? (
                        <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink render={<NavLink to={crumb.path}>{crumb.name}</NavLink>} />
                      )}
                    </BreadcrumbItem>
                  </>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
