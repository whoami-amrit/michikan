import { Job } from 'db';
import { FolderPlusIcon, PlusIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
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
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { api } from '@/lib/utils';

function NewJobButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <PlusIcon />
      New Job
    </Button>
  );
}

export default function JobsPage() {
  const { data, isLoading } = useSWR('job-applications', async () =>
    api.get('/jobs').json<Job[]>(),
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

      <main className="w-2xl flex flex-col gap-4 grow">
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
                <FolderPlusIcon />
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

        {isLoading && (
          <div className="flex w-full max-w-sm flex-col gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="flex gap-4" key={index}>
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        )}
        {!!data?.length && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((job) => (
                <TableRow
                  onClick={() => {
                    void navigate(`/jobs/${job.id}`);
                  }}
                  key={job.id}
                >
                  <TableCell>{job.role}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{new Date(job.updatedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>
    </div>
  );
}
