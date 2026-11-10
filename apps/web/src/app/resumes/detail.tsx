import { ResumeAnalysisError, ResumeAnalysisStatus, WorkerStatus } from 'db';
import { BotOff, BrainCircuit, FileDown, PencilIcon, SearchSlash } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ICreateRenderWorkerResponse,
  ICreateResumeDto,
  IGetResumeResponse,
  IRenderStatusResponse,
  ISSUE_LABELS,
} from 'shared';
import useSWR from 'swr';

import AppHeader from '@/components/app-header';
import { Badge } from '@/components/ui/badge';
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

const ANALYSIS_POLL_INTERVAL_MS = 3000;

const isAnalysisInProgress = (resume?: IGetResumeResponse) =>
  resume?.analysisStatus === ResumeAnalysisStatus.QUEUED ||
  resume?.analysisStatus === ResumeAnalysisStatus.GENERATING;

function AnalysisReport({ report }: { report: NonNullable<IGetResumeResponse['analysisReport']> }) {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-semibold tabular-nums">{report.score}</span>
        <span className="text-muted-foreground">/ 100</span>
      </div>

      {report.findings.length === 0 ? (
        <span className="text-muted-foreground">No issues found.</span>
      ) : (
        <div className="flex flex-col gap-4">
          {report.findings.map((finding) => (
            <div
              key={`${finding.section_id}-${finding.issue}`}
              className="flex flex-col gap-1 rounded-lg border p-4"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{finding.section_id}</Badge>
                <span className="font-medium">{ISSUE_LABELS[finding.issue]}</span>
              </div>
              <span className="text-sm text-muted-foreground">{finding.fix}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummarySection({ resume }: { resume?: IGetResumeResponse }) {
  if (!resume) {
    return <Spinner />;
  }

  switch (resume.analysisStatus) {
    case ResumeAnalysisStatus.QUEUED:
    case ResumeAnalysisStatus.GENERATING:
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Spinner />
            </EmptyMedia>
            <EmptyTitle>Analysing your resume</EmptyTitle>
            <EmptyDescription>
              {resume.analysisStatus === ResumeAnalysisStatus.QUEUED
                ? 'Your resume is in the queue. This page updates on its own.'
                : 'This usually takes a few seconds. This page updates on its own.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );

    case ResumeAnalysisStatus.FAILED:
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BotOff />
            </EmptyMedia>
            <EmptyTitle>Analysis failed</EmptyTitle>
            <EmptyDescription>
              {resume.analysisError === ResumeAnalysisError.PROVIDER_UNAVAILABLE
                ? 'The analysis service is unavailable right now. Try again later.'
                : 'Something went wrong while analysing your resume.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );

    case ResumeAnalysisStatus.DONE:
      if (!resume.analysisReport) {
        return null;
      }

      return <AnalysisReport report={resume.analysisReport} />;

    default:
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BrainCircuit />
            </EmptyMedia>
            <EmptyTitle>No analysis yet</EmptyTitle>
            <EmptyDescription>This resume has not been analysed yet.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
  }
}

export function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();

  const {
    data: detail,
    isLoading,
    error,
    mutate,
  } = useSWR<IGetResumeResponse, undefined>(`/resumes/${id}`, {
    fetcher: () => api.get(`/resumes/${id}`).json<IGetResumeResponse>(),
    refreshInterval: (latest) => (isAnalysisInProgress(latest) ? ANALYSIS_POLL_INTERVAL_MS : 0),
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
      <AppHeader crumbs={crumbs} />

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
            <div className="flex justify-between">
              <TabsList>
                <TabsTrigger value="analysis">
                  <BrainCircuit /> Analysis
                </TabsTrigger>
                <TabsTrigger value="edit">
                  <PencilIcon /> Edit
                </TabsTrigger>
              </TabsList>
              <DownloadButton id={id!} />
            </div>

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
