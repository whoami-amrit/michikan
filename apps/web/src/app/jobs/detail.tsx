import { Job } from 'db';
import dompurify from 'dompurify';
import { BotOff, PencilIcon, RefreshCw, SearchSlash, SummaryIcon } from 'lucide-react';
import { marked } from 'marked';
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
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { api } from '@/lib/utils';

import { JobForm } from './form';

function SummarySection({ job }: { job: Job | undefined }) {
  if (!job || job.atAGlanceGenerateStatus === 'GENERATING') {
    return <Spinner />;
  }

  if (job.atAGlanceGenerateStatus === 'FAILED') {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BotOff />
          </EmptyMedia>
          <EmptyTitle>Summary generation failed</EmptyTitle>
          <EmptyDescription>Cat spilled coffee on our AI :/ Please try again</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline">
            <RefreshCw />
            Retry
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <article
      className="typeset pb-8"
      dangerouslySetInnerHTML={{
        __html: dompurify.sanitize(marked(job.atAGlance!, { async: false })),
      }}
    />
  );
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: jobDetail,
    isLoading,
    error,
    mutate,
  } = useSWR<Job, undefined>(`/jobs/${id}`, () => api.get(`/jobs/${id}`).json<Job>());
  const navigate = useNavigate();

  const crumbs = useBreadcrumbs([
    {
      label: 'Jobs',
    },
    {
      label: jobDetail ? `${jobDetail.role} - ${jobDetail.company}` : 'Detail',
      isLoading,
    },
  ]);

  return (
    <div className="flex flex-col w-full items-center">
      <AppHeader crumbs={crumbs} />

      {error && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchSlash />
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

      {!error && isLoading && (
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

      {!error && !isLoading && (
        <div className="flex flex-col grow max-w-2xl lg:px-0 px-6 w-full">
          <Tabs className="gap-8 grow">
            <TabsList>
              <TabsTrigger value="summary">
                <SummaryIcon /> Summary
              </TabsTrigger>
              <TabsTrigger value="edit">
                <PencilIcon /> Edit
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <SummarySection job={jobDetail} />
            </TabsContent>
            <TabsContent value="edit" className="flex flex-col">
              <JobForm
                type="edit"
                data={jobDetail as IUpdateJobDto}
                id={Number(id)}
                mutate={() => {
                  void mutate();
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
