import { FilePlusCornerIcon, PlusIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { IGetResumesResponse } from 'shared';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { api } from '@/lib/utils';

function NewResumeButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <PlusIcon />
      New Resume
    </Button>
  );
}

export default function ResumesPage() {
  const { data, isLoading } = useSWR(
    'resumes',
    async () => api.get('/resumes').json<IGetResumesResponse[]>(),
    {
      shouldRetryOnError: false,
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
          {!isLoading && (data?.length ?? 0) > 0 && (
            <div className="flex">
              <div className="grow" />
              <NewResumeButton onClick={onNewResumeClick} />
            </div>
          )}

          {!isLoading && data?.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FilePlusCornerIcon />
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

          {isLoading && (
            <div className="flex max-w-sm flex-col gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div className="flex gap-4" key={index}>
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !!data?.length && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="grow">Name</TableHead>
                  <TableHead className="text-right w-15">
                    <Tooltip>
                      <TooltipTrigger>Jobs</TooltipTrigger>
                      <TooltipContent>
                        Number of job applications where this resume has been submitted
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right w-30">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((resume) => (
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
                      {new Date(resume.updatedAt).toLocaleDateString()}
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
