import { Job } from 'db';
import { PlusIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import useSWR from 'swr';

import AppHeader from '@/components/app-header';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="flex flex-col items-center w-full">
      <AppHeader crumbs={crumbs} />

      <main className="w-2xl flex flex-col gap-4">
        <div className="flex">
          <div className="grow" />
          <Button
            onClick={() => {
              void navigate('/jobs/new');
            }}
          >
            <PlusIcon />
            New Job
          </Button>
        </div>

        {isLoading ? (
          <div className="flex w-full max-w-sm flex-col gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="flex gap-4" key={index}>
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resume</TableHead>
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
                  <TableCell>{job.title}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{job.resumeId}</TableCell>
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
