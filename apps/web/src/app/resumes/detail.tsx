import { ResumeAnalysisError, ResumeAnalysisStatus, WorkerStatus } from 'db';
import { isHTTPError } from 'ky';
import {
  BotOff,
  BrainCircuit,
  FileDown,
  PencilIcon,
  RefreshCw,
  SearchSlash,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  IAiUsageResponse,
  ICreateRenderWorkerResponse,
  ICreateResumeDto,
  IGetResumeResponse,
  IQueueAnalysisResponse,
  IRenderStatusResponse,
} from 'shared';
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
import { HttpStatus } from '@/lib/constants';
import { useUserContext } from '@/lib/contexts/user/hook';
import { type IResolvedFinding, type IResumeJumpTarget } from '@/lib/resume-lint';
import { api, getErrorToastContent } from '@/lib/utils';

import { AnalysisReport } from './analysis-report';
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

const AI_USAGE_KEY = '/users/me/ai-usage';

const FREE_RUN_LIMIT_FALLBACK = 10;

const getQuotaMessage = (resetsAt: string | null, limit = FREE_RUN_LIMIT_FALLBACK) =>
  resetsAt
    ? `Limit reached. Resets at ${new Date(resetsAt).toLocaleString()}.`
    : `You've used your ${limit} free runs.`;

const getUsageLabel = (usage: IAiUsageResponse) => {
  const left = Math.max(usage.limit - usage.used, 0);

  return usage.window === 'lifetime'
    ? `${left} of ${usage.limit} free runs left`
    : `${left} / ${usage.limit} left today`;
};

function QuotaExceededMessage() {
  const { data: usage } = useSWR<IAiUsageResponse>(AI_USAGE_KEY, {
    fetcher: () => api.get(AI_USAGE_KEY).json<IAiUsageResponse>(),
  });

  if (!usage) {
    return 'You have reached your analysis limit.';
  }

  return getQuotaMessage(usage.resetsAt, usage.limit);
}

function AnalyseControls({
  id,
  resume,
  autoAnalyse,
  onQueued,
}: {
  id: string;
  resume: IGetResumeResponse;
  autoAnalyse: boolean;
  onQueued: () => void;
}) {
  const { data: usage, mutate: mutateUsage } = useSWR<IAiUsageResponse>(AI_USAGE_KEY, {
    fetcher: () => api.get(AI_USAGE_KEY).json<IAiUsageResponse>(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quota, setQuota] = useState(false);

  const wasInProgress = useRef(isAnalysisInProgress(resume));
  const inProgress = isAnalysisInProgress(resume);

  useEffect(() => {
    if (wasInProgress.current && !inProgress) {
      void mutateUsage();
    }

    wasInProgress.current = inProgress;
  }, [inProgress, mutateUsage]);

  const isFailed = resume.analysisStatus === ResumeAnalysisStatus.FAILED;
  const isStale = resume.isAnalysisStale;
  const isRetry =
    isFailed && (autoAnalyse || resume.analysisError !== ResumeAnalysisError.QUOTA_EXCEEDED);
  const showButton = !autoAnalyse || isFailed;

  const analyse = async () => {
    setIsSubmitting(true);
    setQuota(false);

    try {
      await api.post(`/resumes/${id}/analysis`).json<IQueueAnalysisResponse>();
      onQueued();
    } catch (error) {
      if (isHTTPError(error) && error.response.status === HttpStatus.PAYMENT_REQUIRED) {
        setQuota(true);
        return;
      }

      toast.add({ type: 'error', ...getErrorToastContent(error) });
    } finally {
      setIsSubmitting(false);
      void mutateUsage();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {showButton && (
          <Button disabled={isSubmitting || inProgress} onClick={() => void analyse()}>
            {isSubmitting || inProgress ? <Spinner className="size-4" /> : <Sparkles />}
            {isRetry ? 'Retry' : isStale ? 'Re-analyse' : 'Analyse'}
          </Button>
        )}
        {usage && <span className="text-sm text-muted-foreground">{getUsageLabel(usage)}</span>}
      </div>
      {quota && (
        <span role="alert" className="text-sm text-destructive">
          <QuotaExceededMessage />
        </span>
      )}
    </div>
  );
}

function StaleBanner({ autoAnalyse }: { autoAnalyse: boolean }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">Resume changed since this analysis</span>
        {autoAnalyse ? (
          <span className="flex items-center gap-1.5">
            <RefreshCw className="size-3 animate-spin" aria-hidden />
            Updating after your edits
          </span>
        ) : (
          <span>Re-analyse to refresh the score and findings.</span>
        )}
      </div>
    </div>
  );
}

function SummarySection({
  resume,
  autoAnalyse,
  onOpenField,
}: {
  resume?: IGetResumeResponse;
  autoAnalyse: boolean;
  onOpenField: (target: IResolvedFinding) => void;
}) {
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
            <EmptyTitle>
              {resume.analysisError === ResumeAnalysisError.QUOTA_EXCEEDED
                ? 'Limit reached'
                : 'Analysis failed'}
            </EmptyTitle>
            <EmptyDescription>
              {resume.analysisError === ResumeAnalysisError.QUOTA_EXCEEDED ? (
                <QuotaExceededMessage />
              ) : resume.analysisError === ResumeAnalysisError.PROVIDER_UNAVAILABLE ? (
                'The analysis service is unavailable right now. Try again later.'
              ) : (
                'Something went wrong while analysing your resume.'
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );

    case ResumeAnalysisStatus.DONE:
      if (!resume.analysisReport) {
        return null;
      }

      return (
        <div className="flex flex-col gap-6">
          {resume.isAnalysisStale && <StaleBanner autoAnalyse={autoAnalyse} />}
          <AnalysisReport
            report={resume.analysisReport}
            resumeJson={resume.json}
            onOpenField={onOpenField}
          />
        </div>
      );

    default:
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BrainCircuit />
            </EmptyMedia>
            <EmptyTitle>No analysis yet</EmptyTitle>
            <EmptyDescription>
              {autoAnalyse
                ? 'Analysis will run after your next edit.'
                : 'This resume has not been analysed yet.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
  }
}

export function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('analysis');
  const [jumpTo, setJumpTo] = useState<IResumeJumpTarget>();
  const autoAnalyse = useUserContext()?.autoAnalyseResume ?? false;

  const {
    data: detail,
    isLoading,
    error,
    mutate,
  } = useSWR<IGetResumeResponse, undefined>(`/resumes/${id}`, {
    fetcher: () => api.get(`/resumes/${id}`).json<IGetResumeResponse>(),
    refreshInterval: (latest) =>
      isAnalysisInProgress(latest) || (autoAnalyse && latest?.isAnalysisStale)
        ? ANALYSIS_POLL_INTERVAL_MS
        : 0,
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
          <Tabs
            className="gap-8 grow"
            value={activeTab}
            onValueChange={(value) => {
              setJumpTo(undefined);
              setActiveTab(String(value));
            }}
          >
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

            <TabsContent value="analysis" className="typeset flex flex-col gap-6 pb-8">
              {detail && (
                <AnalyseControls
                  id={id!}
                  resume={detail}
                  autoAnalyse={autoAnalyse}
                  onQueued={() => {
                    void mutate(
                      {
                        ...detail,
                        analysisStatus: ResumeAnalysisStatus.QUEUED,
                        analysisError: null,
                      },
                      { revalidate: true },
                    );
                  }}
                />
              )}
              <SummarySection
                resume={detail}
                autoAnalyse={autoAnalyse}
                onOpenField={({ tab, anchorId, line }) => {
                  setJumpTo({ tab, anchorId, line });
                  setActiveTab('edit');
                }}
              />
            </TabsContent>
            <TabsContent value="edit" className="flex flex-col">
              <ResumeForm
                type="edit"
                data={detail as unknown as ICreateResumeDto}
                id={id!}
                jumpTo={jumpTo}
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
