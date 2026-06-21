import { Fragment } from 'react/jsx-runtime';
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
import { Skeleton } from './ui/skeleton';

const BreadcrumbItemContent = ({ crumb, isLast }: { crumb: ICrumb; isLast: boolean }) => {
  if (crumb.isLoading) {
    return <Skeleton className="h-4 w-16" />;
  }

  if (isLast) {
    return <BreadcrumbPage>{crumb.label}</BreadcrumbPage>;
  }

  return <BreadcrumbLink render={<NavLink to={crumb.pathname}>{crumb.label}</NavLink>} />;
};

export const AppBreadcrumb = ({ crumbs }: { crumbs: ICrumb[] }) => {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={index}>
            {index !== 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              <BreadcrumbItemContent crumb={crumb} isLast={index === crumbs.length - 1} />
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
