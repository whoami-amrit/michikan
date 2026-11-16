import { Edit03Icon } from '@hugeicons/core-free-icons';
import { useEffect, useRef, useState } from 'react';
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
import { Button } from './ui/button';
import { Icon } from './ui/icon';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';

const EditableBreadcrumbPage = ({
  label,
  onLabelChange,
}: {
  label: string;
  onLabelChange: (label: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setDraft(label);
    setIsEditing(true);
  };

  const onBlur = () => {
    const next = draft.trim() || 'Untitled';
    onLabelChange(next);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        maxLength={50}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setDraft(label);
            setIsEditing(false);
          }
        }}
        className="h-7 w-48 px-2 text-sm"
      />
    );
  }

  return (
    <BreadcrumbPage className="min-w-0 overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={startEditing}
        className="h-7 max-w-full px-2 font-normal gap-2.5"
      >
        <span className="truncate">{label}</span>
        <Icon
          icon={Edit03Icon}
          data-icon="inline-end"
          className="size-3.5 shrink-0 text-muted-foreground"
        />
      </Button>
    </BreadcrumbPage>
  );
};

const BreadcrumbItemContent = ({ crumb, isLast }: { crumb: ICrumb; isLast: boolean }) => {
  if (crumb.isLoading) {
    return <Skeleton className="h-4 w-16" />;
  }

  if (isLast) {
    if (crumb.onLabelChange) {
      return <EditableBreadcrumbPage label={crumb.label} onLabelChange={crumb.onLabelChange} />;
    }

    return (
      <BreadcrumbPage className="max-w-[400px] min-w-0 truncate">{crumb.label}</BreadcrumbPage>
    );
  }

  return <BreadcrumbLink render={<NavLink to={crumb.pathname}>{crumb.label}</NavLink>} />;
};

export const AppBreadcrumb = ({ crumbs }: { crumbs: ICrumb[] }) => {
  return (
    <Breadcrumb className="flex items-center h-8 min-w-0 overflow-hidden">
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={index}>
              {index !== 0 && <BreadcrumbSeparator className="shrink-0" />}
              <BreadcrumbItem className={isLast ? 'min-w-0 overflow-hidden' : 'shrink-0'}>
                <BreadcrumbItemContent crumb={crumb} isLast={isLast} />
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
