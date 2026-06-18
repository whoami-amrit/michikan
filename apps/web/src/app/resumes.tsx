import { PlusIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { type IGetResumesResponse, ResumeJsonSchema } from 'shared';
import useSWR from 'swr';

import { AppBreadcrumb } from '@/components/app-breadcrumb';
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

export function ResumeDetailPage() {
  return null;
}

export function NewResumePage() {
  const crumbs = useBreadcrumbs({
    mappings: {
      resumes: {
        label: 'Resumes',
        children: {
          new: {
            label: 'New Resume',
          },
        },
      },
    },
  });

  console.log('ResumeJsonSchema', ResumeJsonSchema);

  return (
    <div className="flex flex-col items-center w-full">
      <header className="flex w-full justify-between p-6">
        <AppBreadcrumb crumbs={crumbs} />
      </header>
    </div>
  );
}

export default function ResumesPage() {
  const { data, isLoading } = useSWR('resumes', async () =>
    api.get('/resumes').json<IGetResumesResponse[]>(),
  );

  const navigate = useNavigate();

  const crumbs = useBreadcrumbs({
    mappings: {
      resumes: {
        label: 'Resumes',
      },
    },
  });

  return (
    <div className="flex flex-col items-center w-full">
      <header className="flex w-full justify-between p-6">
        <AppBreadcrumb crumbs={crumbs} />
      </header>

      <main className="w-2xl flex flex-col gap-4">
        <div className="flex">
          <div className="grow" />
          <Button
            variant="default"
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
