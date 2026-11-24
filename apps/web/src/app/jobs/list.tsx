import { Add01Icon, FolderAddIcon } from '@hugeicons/core-free-icons';
import { Job } from 'db';
import { useNavigate } from 'react-router';
import { type JobSortByType, ListJobsQuerySchema, type SortOrderType } from 'shared';
import useSWR from 'swr';

import AppHeader from '@/components/app-header';
import { JobStatusBadge } from '@/components/job-status-badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useSortParams } from '@/hooks/use-sort-params';
import { api } from '@/lib/utils';

const INITIAL_JOB_SORT_ORDER: Record<JobSortByType, SortOrderType> = {
  name: 'asc',
  status: 'asc',
  updatedAt: 'desc',
};

function NewJobButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <Icon icon={Add01Icon} />
      New Job
    </Button>
  );
}

export default function JobsPage() {
  const { sortBy, order, onSort } = useSortParams<JobSortByType>({
    schema: ListJobsQuerySchema,
    defaultSortBy: 'updatedAt',
    defaultOrder: 'desc',
    initialOrderByField: INITIAL_JOB_SORT_ORDER,
  });

  const { data, isLoading } = useSWR(
    ['job-applications', sortBy, order] as const,
    async ([, currentSortBy, currentOrder]) =>
      api
        .get('/jobs', { searchParams: { sortBy: currentSortBy, order: currentOrder } })
        .json<Job[]>(),
    {
      keepPreviousData: true,
    },
  );

  const navigate = useNavigate();

  const crumbs = useBreadcrumbs([
    {
      label: 'Jobs',
    },
  ]);

  const onNewJobClick = () => {
    void navigate('/jobs/new');
  };

  return (
    <div className="flex flex-col items-center w-full">
      <AppHeader crumbs={crumbs} />

      <main className="flex w-full px-6 lg:px-0 flex-col grow items-center">
        <div className="flex max-w-xl w-full flex-col gap-4 grow">
          {!!data?.length && (
            <div className="flex">
              <div className="grow" />
              <NewJobButton onClick={onNewJobClick} />
            </div>
          )}

          {!isLoading && data?.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Icon icon={FolderAddIcon} />
                </EmptyMedia>
                <EmptyTitle>No Jobs Tracked Yet</EmptyTitle>
                <EmptyDescription>
                  You aren't tracking any jobs yet
                  <br />
                  Get started by creating your first entry
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <NewJobButton onClick={onNewJobClick} />
              </EmptyContent>
            </Empty>
          )}

          {isLoading && !data && (
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

          {!!data?.length && (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label="Name"
                    field="name"
                    activeSortBy={sortBy}
                    activeOrder={order}
                    onSort={onSort}
                  />
                  <SortableTableHead
                    label="Status"
                    field="status"
                    activeSortBy={sortBy}
                    activeOrder={order}
                    onSort={onSort}
                    align="right"
                    className="w-24"
                  />
                  <SortableTableHead
                    label="Last Updated"
                    field="updatedAt"
                    activeSortBy={sortBy}
                    activeOrder={order}
                    onSort={onSort}
                    align="right"
                    className="w-36"
                  />
                </TableRow>
              </TableHeader>
              <TableBody
                className={isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}
              >
                {data.map((job) => (
                  <TableRow
                    className="hover:cursor-pointer"
                    onClick={() => {
                      void navigate(`/jobs/${job.id}`);
                    }}
                    key={job.id}
                  >
                    <TableCell className="overflow-hidden text-ellipsis">{`${job.role} - ${job.company}`}</TableCell>
                    <TableCell className="text-right">
                      <JobStatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {new Date(job.updatedAt).toLocaleDateString()}
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
