import { Resume } from 'db';
import { useLocation, useParams } from 'react-router';
import { IResumeJson } from 'shared';
import useSWR from 'swr';

import AppHeader from '@/components/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { api } from '@/lib/utils';

import { ResumeForm } from './form';

export function EditResumePage() {
  const { id } = useParams();

  const { pathname } = useLocation();

  const { data: detail, isLoading } = useSWR<Resume>(pathname, {
    fetcher: () => api.get(`/resumes/${id}`).json<Resume>(),
  });

  const crumbs = useBreadcrumbs([
    {
      label: 'Resumes',
    },
    {
      label: `Edit ${detail?.name}`,
      isLoading,
    },
  ]);

  return (
    <div className="flex flex-col w-full">
      <AppHeader crumbs={crumbs} />

      {isLoading ? (
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
      ) : (
        <ResumeForm type="edit" data={detail?.json as IResumeJson} id={id!} />
      )}
    </div>
  );
}
