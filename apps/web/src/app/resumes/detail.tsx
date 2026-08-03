import { Resume, WorkerStatus } from 'db';
import dompurify from 'dompurify';
import { BotOff, BrainCircuit, FileDown, PencilIcon, RefreshCw, SearchSlash } from 'lucide-react';
import { marked } from 'marked';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ICreateRenderWorkerResponse, ICreateResumeDto, IRenderStatusResponse } from 'shared';
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
import { toast } from '@/components/ui/toast';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { api, getErrorToastContent } from '@/lib/utils';

import { ResumeForm } from './form';

const download = (url: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `resume-${new Date().toISOString()}.pdf`);
  document.body.appendChild(link);
  link.click();
};

function DownloadButton({ id }: { id: string }) {
  const [workerInfo, setWorkerInfo] = useState<ICreateRenderWorkerResponse>();

  useSWR(`/resumes/worker/${id}`, {
    refreshInterval: 500,
    isOnline: () => workerInfo?.status === WorkerStatus.IN_PROGRESS,
    fetcher: async () => {
      if (!workerInfo) {
        return;
      }

      if (workerInfo.status === 'COMPLETED') {
        download(workerInfo.downloadUrl!);
        return;
      }

      const response = await api
        .get(`/resumes/worker/${workerInfo.workerId}`)
        .json<IRenderStatusResponse>();

      setWorkerInfo({ ...workerInfo, status: response.status, downloadUrl: response.downloadUrl });

      if (response.status === 'FAILED') {
        toast.add({
          type: 'error',
          title: 'Download failed',
          description: 'Resume rendering did not complete. Please try again.',
        });
        return;
      }

      if (response.status !== 'COMPLETED') {
        return;
      }

      toast.add({
        type: 'success',
        title: 'Resume ready',
        description: 'Your PDF is ready and downloading now.',
      });
      download(response.downloadUrl!);
    },
  });

  return (
    <Button
      variant="outline"
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={async () => {
        try {
          const info = await api.post(`/resumes/${id}/render`).json<ICreateRenderWorkerResponse>();
          setWorkerInfo(info);
          if (info.status === WorkerStatus.COMPLETED) {
            toast.add({
              type: 'success',
              title: 'Resume ready',
              description: 'Your PDF is ready and downloading now.',
            });
            download(info.downloadUrl!);
            return;
          }
          toast.add({
            type: 'loading',
            title: 'Preparing download',
            description: 'We are rendering your resume. Download will start automatically.',
          });
        } catch (error) {
          toast.add({
            type: 'error',
            ...getErrorToastContent(error),
          });
        }
      }}
    >
      {workerInfo?.status === WorkerStatus.IN_PROGRESS ? (
        <Spinner className="size-4" />
      ) : (
        <FileDown />
      )}
      Download
    </Button>
  );
}

function SummarySection({ resume }: { resume?: Resume }) {
  if (!resume || resume.analysisReportGenerateStatus === 'GENERATING') {
    return <Spinner />;
  }

  if (resume.analysisReportGenerateStatus === 'FAILED') {
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
        __html: dompurify.sanitize(marked(resume.analysisReport!, { async: false })),
      }}
    />
  );
}

export function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();

  const {
    data: detail,
    isLoading,
    error,
    mutate,
  } = useSWR<Resume, undefined>(`/resumes/${id}`, {
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
    <div className="flex flex-col w-full items-center">
      <AppHeader crumbs={crumbs}>
        <DownloadButton id={id!} />
      </AppHeader>

      {error && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchSlash />
            </EmptyMedia>
            <EmptyTitle>404 Not Found</EmptyTitle>
            <EmptyDescription>No Resume found with the specified ID</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => void navigate('/resumes')} variant="outline">
              Go back
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {!error && isLoading && (
        <div className="flex flex-col gap-8 max-w-2xl grow w-full">
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
      )}

      {!error && !isLoading && (
        <div className="flex flex-col grow max-w-2xl lg:px-0 px-6 w-full">
          <Tabs className="gap-8 grow">
            <TabsList>
              <TabsTrigger value="analysis">
                <BrainCircuit /> Analysis
              </TabsTrigger>
              <TabsTrigger value="edit">
                <PencilIcon /> Edit
              </TabsTrigger>
            </TabsList>
            <TabsContent value="analysis" className="typeset pb-8">
              <SummarySection resume={detail} />
            </TabsContent>
            <TabsContent value="edit" className="flex flex-col">
              <ResumeForm
                type="edit"
                data={detail as unknown as ICreateResumeDto}
                id={id!}
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
