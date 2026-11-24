import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { type SortOrderType } from 'shared';

interface ISortSchema<TSortBy extends string> {
  safeParse: (
    input: unknown,
  ) => { success: true; data: { sortBy: TSortBy; order: SortOrderType } } | { success: false };
}

interface IUseSortParamsOptions<TSortBy extends string> {
  schema: ISortSchema<TSortBy>;
  defaultSortBy: TSortBy;
  defaultOrder: SortOrderType;
  initialOrderByField: Record<TSortBy, SortOrderType>;
}

export function useSortParams<TSortBy extends string>({
  schema,
  defaultSortBy,
  defaultOrder,
  initialOrderByField,
}: IUseSortParamsOptions<TSortBy>) {
  const [searchParams, setSearchParams] = useSearchParams();

  const parsed = schema.safeParse({
    sortBy: searchParams.get('sortBy') ?? undefined,
    order: searchParams.get('order') ?? undefined,
  });

  const sortBy = parsed.success ? parsed.data.sortBy : defaultSortBy;
  const order = parsed.success ? parsed.data.order : defaultOrder;

  const onSort = useCallback(
    (field: TSortBy) => {
      const nextOrder: SortOrderType =
        field === sortBy ? (order === 'asc' ? 'desc' : 'asc') : initialOrderByField[field];

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);

        if (field === defaultSortBy && nextOrder === defaultOrder) {
          next.delete('sortBy');
          next.delete('order');
        } else {
          next.set('sortBy', field);
          next.set('order', nextOrder);
        }

        return next;
      });
    },
    [defaultOrder, defaultSortBy, initialOrderByField, order, setSearchParams, sortBy],
  );

  return { sortBy, order, onSort };
}
