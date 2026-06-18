import { useMemo } from 'react';
import { useLocation } from 'react-router';

import type { ICrumb } from '@/lib/types';

interface IMapping {
  label: string | ((segment: string) => string);
  children?: Record<string, IMapping>;
}

const recursiveBuildCrumbs = (
  index: number,
  path: string[],
  mappings: Record<string, IMapping>,
): ICrumb[] => {
  if (index >= path.length) {
    return [];
  }
  const { label, children } = mappings[path[index]] ?? { label: path[index] };
  return [
    {
      name: typeof label === 'function' ? label(path[index]) : label,
      path: `/${path.slice(0, index + 1).join('/')}`,
    },
    ...recursiveBuildCrumbs(index + 1, path, children ?? {}),
  ];
};

export const useBreadcrumbs = ({ mappings }: { mappings: Record<string, IMapping> }) => {
  const { pathname } = useLocation();

  const crumbs = useMemo(() => {
    const path = pathname.split('/').filter(Boolean);

    return recursiveBuildCrumbs(0, path, mappings);
  }, [pathname, mappings]);

  return crumbs;
};
