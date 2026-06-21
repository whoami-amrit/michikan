import { useMemo } from 'react';
import { useLocation } from 'react-router';

import type { ICrumb } from '@/lib/types';

interface IMapping {
  label: string;
  isLoading?: boolean;
}

export const useBreadcrumbs = (mappings: IMapping[]) => {
  const { pathname } = useLocation();

  const crumbs: ICrumb[] = useMemo(() => {
    const path = pathname.split('/').filter(Boolean);

    return path.map((segment, index) => ({
      label: mappings[index].label ?? segment,
      isLoading: mappings[index].isLoading,
      pathname: `/${path.slice(0, index + 1).join('/')}`,
    }));
  }, [pathname, mappings]);

  return crumbs;
};
