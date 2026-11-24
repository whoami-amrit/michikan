import { ArrowDown02Icon, ArrowUp02Icon, ArrowUpDownIcon } from '@hugeicons/core-free-icons';
import { type ReactNode } from 'react';
import { type SortOrderType } from 'shared';

import { Icon } from '@/components/ui/icon';
import { TableHead } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ISortableTableHeadProps<TSortBy extends string> {
  label: ReactNode;
  field: TSortBy;
  activeSortBy: TSortBy;
  activeOrder: SortOrderType;
  onSort: (field: TSortBy) => void;
  align?: 'left' | 'right';
  tooltip?: ReactNode;
  className?: string;
}

export function SortableTableHead<TSortBy extends string>({
  label,
  field,
  activeSortBy,
  activeOrder,
  onSort,
  align = 'left',
  tooltip,
  className,
}: ISortableTableHeadProps<TSortBy>) {
  const isActive = activeSortBy === field;
  const ariaSort = isActive ? (activeOrder === 'asc' ? 'ascending' : 'descending') : 'none';
  const sortIcon = !isActive
    ? ArrowUpDownIcon
    : activeOrder === 'asc'
      ? ArrowUp02Icon
      : ArrowDown02Icon;

  const trigger = (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'group/sort inline-flex items-center gap-1 rounded-sm cursor-pointer transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        align === 'right' && 'flex-row-reverse',
        isActive ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium',
      )}
    >
      <span>{label}</span>
      <Icon
        icon={sortIcon}
        className={cn(
          'size-3.5 shrink-0 transition-opacity',
          isActive ? 'opacity-100' : 'opacity-30 group-hover/sort:opacity-80',
        )}
      />
    </button>
  );

  return (
    <TableHead aria-sort={ariaSort} className={cn(align === 'right' && 'text-right', className)}>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger render={trigger} />
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
    </TableHead>
  );
}
