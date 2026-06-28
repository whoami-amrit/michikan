import { Job } from 'db';
import { SearchCodeIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { IUpdateJobDto } from 'shared';
import useSWR from 'swr';

import AppHeader from '@/components/app-header';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { api } from '@/lib/utils';

import { JobForm } from './form';

export function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: jobDetail,
    isLoading,
    error,
  } = useSWR<Job, undefined>(`/jobs/${id}`, () => api.get(`/jobs/${id}`).json<Job>());
  const navigate = useNavigate();

  const crumbs = useBreadcrumbs([
    {
      label: 'Jobs',
    },
    {
      label: `Edit "${jobDetail?.title ?? ''}"`,
      isLoading,
    },
  ]);

  return (
    <div className="flex flex-col w-full">
      <AppHeader crumbs={crumbs} />

      {error && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchCodeIcon />
            </EmptyMedia>
            <EmptyTitle>404 Not Found</EmptyTitle>
            <EmptyDescription>No Job found with the specified ID</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => void navigate('/jobs')} variant="outline">
              Go back
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {!error && (isLoading || jobDetail === undefined) && (
        <div className="flex justify-center">
          <div className="flex flex-col gap-8 max-w-2xl grow">
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="w-1/2 h-4" />
              <Skeleton className="w-full h-6" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="w-1/2 h-4" />
              <Skeleton className="w-full h-6" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="w-1/2 h-4" />
              <Skeleton className="w-full h-6" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="w-1/2 h-4" />
              <Skeleton className="w-full h-6" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="w-1/2 h-4" />
              <Skeleton className="w-full h-6" />
            </div>
          </div>
        </div>
      )}
      {!error && !isLoading && jobDetail !== undefined && (
        <JobForm type="edit" data={jobDetail as IUpdateJobDto} id={Number(id)} />
      )}
    </div>
  );
}
