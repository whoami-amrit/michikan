import { NavLink } from 'react-router';

import type { ICrumb } from '@/lib/types';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';

export const AppBreadcrumb = ({ crumbs }: { crumbs: ICrumb[] }) => {
  return (
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
  );
};
