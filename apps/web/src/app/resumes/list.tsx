import { PlusIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { IGetResumesResponse } from 'shared';
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

  return (
    <div className="flex flex-col items-center w-full">
      <AppHeader crumbs={crumbs} />

      <main className="w-2xl flex flex-col gap-4">
        <div className="flex">
          <div className="grow" />
          <Button
            onClick={() => {
              void navigate('/resumes/new');
            }}
          >
            <PlusIcon />
            New Resume
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
                <TableHead>Jobs</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((resume) => (
                <TableRow
                  onClick={() => {
                    void navigate(`/resumes/${resume.id}`);
                  }}
                  key={resume.id}
                >
                  <TableCell>{resume.name}</TableCell>
                  <TableCell>{resume.jobs.length}</TableCell>
                  <TableCell>{new Date(resume.updatedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>
    </div>
  );
}
