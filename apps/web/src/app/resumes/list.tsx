import {
  Add01Icon,
  AlertCircleIcon,
  Briefcase01Icon,
  Edit03Icon,
  FilePlusCornerIcon,
  RefreshIcon,
} from '@hugeicons/core-free-icons';
import { useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import {
  type IGetResumesResponse,
  type IResumeLastInteraction,
  ListResumesQuerySchema,
  type ResumeSortByType,
  type SortOrderType,
} from 'shared';
import useSWR from 'swr';

import AppHeader from '@/components/app-header';
import { SortableTableHead } from '@/components/sortable-table-head';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useSortParams } from '@/hooks/use-sort-params';
import { api } from '@/lib/utils';

const HOVER_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';

const INITIAL_RESUME_SORT_ORDER: Record<ResumeSortByType, SortOrderType> = {
  name: 'asc',
  jobs: 'desc',
  lastInteraction: 'desc',
};

function subscribeHoverMediaQuery(onStoreChange: () => void) {
  const mql = window.matchMedia(HOVER_MEDIA_QUERY);
  mql.addEventListener('change', onStoreChange);
  return () => {
    mql.removeEventListener('change', onStoreChange);
  };
}

function getHoverMediaQuerySnapshot() {
  return window.matchMedia(HOVER_MEDIA_QUERY).matches;
}

function getHoverMediaQueryServerSnapshot() {
  return true;
}

function useSupportsHover() {
  return useSyncExternalStore(
    subscribeHoverMediaQuery,
    getHoverMediaQuerySnapshot,
    getHoverMediaQueryServerSnapshot,
  );
}

function getInteractionDetails(lastInteraction: IResumeLastInteraction) {
  switch (lastInteraction.type) {
    case 'JOB_LINKED':
      return {
        icon: Briefcase01Icon,
        description: `Linked to ${lastInteraction.job.role} - ${lastInteraction.job.company}`,
      };
    case 'RESUME_UPDATED':
      return {
        icon: Edit03Icon,
        description: 'Resume edited',
      };
    case 'RESUME_CREATED':
      return {
        icon: Edit03Icon,
        description: 'Resume created',
      };
  }
}

function LastInteractionCell({ lastInteraction }: { lastInteraction: IResumeLastInteraction }) {
  const supportsHover = useSupportsHover();
  const { icon, description } = getInteractionDetails(lastInteraction);

  return (
    <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
      <span>{new Date(lastInteraction.at).toLocaleDateString()}</span>
      {supportsHover ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                aria-label={description}
                className="inline-flex items-center text-muted-foreground"
              >
                <Icon icon={icon} className="size-3.5 shrink-0" />
              </span>
            }
          />
          <TooltipContent>{description}</TooltipContent>
        </Tooltip>
      ) : (
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label={description}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                className="inline-flex items-center justify-center rounded-sm p-1 -m-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Icon icon={icon} className="size-3.5 shrink-0" />
              </button>
            }
          />
          <PopoverContent
            align="end"
            className="w-fit max-w-64 rounded-xl px-3 py-1.5 text-xs"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {description}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function NewResumeButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <Icon icon={Add01Icon} />
      New Resume
    </Button>
  );
}

export default function ResumesPage() {
  const { sortBy, order, onSort } = useSortParams<ResumeSortByType>({
    schema: ListResumesQuerySchema,
    defaultSortBy: 'lastInteraction',
    defaultOrder: 'desc',
    initialOrderByField: INITIAL_RESUME_SORT_ORDER,
  });

  const resumesKey = ['resumes', sortBy, order] as const;
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    IGetResumesResponse[],
    Error,
    typeof resumesKey
  >(
    resumesKey,
    async ([, currentSortBy, currentOrder]) =>
      api
        .get('/resumes', { searchParams: { sortBy: currentSortBy, order: currentOrder } })
        .json<IGetResumesResponse[]>(),
    {
      shouldRetryOnError: false,
      keepPreviousData: true,
    },
  );

  const navigate = useNavigate();

  const crumbs = useBreadcrumbs([
    {
      label: 'Resumes',
    },
  ]);

  const onNewResumeClick = () => {
    void navigate('/resumes/new');
  };

  return (
    <div className="flex flex-col items-center w-full">
      <AppHeader crumbs={crumbs} />

      <main className="flex w-full px-6 lg:px-0 flex-col grow items-center">
        <div className="flex max-w-xl w-full flex-col gap-4 grow">
          {!error && !!data?.length && (
            <div className="flex">
              <div className="grow" />
              <NewResumeButton onClick={onNewResumeClick} />
            </div>
          )}

          {!error && !isLoading && data?.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Icon icon={FilePlusCornerIcon} />
                </EmptyMedia>
                <EmptyTitle>No Resumes Yet</EmptyTitle>
                <EmptyDescription>
                  You haven't created any resumes yet
                  <br />
                  Get started by creating your first resume
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <NewResumeButton onClick={onNewResumeClick} />
              </EmptyContent>
            </Empty>
          )}

          {!!error && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Icon icon={AlertCircleIcon} />
                </EmptyMedia>
                <EmptyTitle>Failed to Load Resumes</EmptyTitle>
                <EmptyDescription>
                  Something went wrong while loading your resumes.
                  <br />
                  Please try again.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  disabled={isValidating}
                  onClick={() => {
                    void mutate();
                  }}
                >
                  {isValidating ? <Spinner /> : <Icon icon={RefreshIcon} />}
                  Try again
                </Button>
              </EmptyContent>
            </Empty>
          )}

          {!error && isLoading && !data && (
            <div className="flex flex-col gap-6 items-center">
              <div className="flex w-full">
                <div className="grow" />
                <Skeleton className="h-8 w-32" />
              </div>

              <div className="flex w-full flex-col gap-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div className="flex gap-4" key={index}>
                    <Skeleton className="h-6 flex-1" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!error && !!data?.length && (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label="Name"
                    field="name"
                    activeSortBy={sortBy}
                    activeOrder={order}
                    onSort={onSort}
                    className="grow"
                  />
                  <SortableTableHead
                    label="Jobs"
                    field="jobs"
                    activeSortBy={sortBy}
                    activeOrder={order}
                    onSort={onSort}
                    align="right"
                    className="w-20"
                  />
                  <SortableTableHead
                    label="Last Interaction"
                    field="lastInteraction"
                    activeSortBy={sortBy}
                    activeOrder={order}
                    onSort={onSort}
                    align="right"
                    className="w-44"
                  />
                </TableRow>
              </TableHeader>
              <TableBody
                className={isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}
              >
                {data.map((resume) => (
                  <TableRow
                    className="hover:cursor-pointer"
                    onClick={() => {
                      void navigate(`/resumes/${resume.id}`);
                    }}
                    key={resume.id}
                  >
                    <TableCell className="max-w-50 text-ellipsis overflow-hidden">
                      {resume.name}
                    </TableCell>
                    <TableCell className="text-right">
                      {!!resume.jobs.length ? resume.jobs.length : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <LastInteractionCell lastInteraction={resume.lastInteraction} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}
