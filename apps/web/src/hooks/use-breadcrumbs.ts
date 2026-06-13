import { useMemo } from 'react';
import { useLocation } from 'react-router';

export const useBreadcrumbs = ({ mapping }: { mapping: Record<string, string> }) => {
  const { pathname } = useLocation();

  const crumbs = useMemo(
    () =>
      pathname
        .split('/')
        .filter(Boolean)
        .map((part, index, arr) => {
          const path = `/${arr.slice(0, index + 1).join('/')}`;
          return { name: mapping[part], path };
        }),
    [pathname, mapping],
  );

  return crumbs;
};
