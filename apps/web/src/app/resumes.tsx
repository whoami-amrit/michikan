import { type IGetResumesResponse } from 'shared';
import useSWR from 'swr';

import { AppBreadcrumb } from '@/components/app-breadcrumb';
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

export function ResumeDetailPage() {
  return null;
}

export function NewResumePage() {
  return null;
}

export default function ResumesPage() {
  const { data, isLoading } = useSWR('resumes', async () =>
    api.get('/resumes').json<IGetResumesResponse[]>(),
  );

  const crumbs = useBreadcrumbs({
    mappings: {
      resumes: {
        label: 'Resumes',
      },
    },
  });

  return (
    <div className="flex-col items-center">
      <header className="flex w-full justify-between">
        <AppBreadcrumb crumbs={crumbs} />
      </header>

      <main>
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
                <TableRow key={resume.id}>
                  <TableCell>{resume.name}</TableCell>
                  <TableCell>{resume.jobApplications.length}</TableCell>
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
