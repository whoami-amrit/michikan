import {
  AiSearchLinesIcon,
  BotOffIcon,
  CrownIcon,
  Download01Icon,
  Edit03Icon,
  FileEmpty02Icon,
  RefreshIcon,
  SearchRemoveIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from '@hugeicons/core-free-icons';
import { Plan, ResumeAnalysisError, ResumeAnalysisStatus, WorkerStatus } from 'db';
import { isHTTPError } from 'ky';
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
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { HttpStatus, PAYMENTS_URL } from '@/lib/constants';
import { useUserContext } from '@/lib/contexts/user/hook';
import { type IResolvedFinding, type IResumeJumpTarget } from '@/lib/resume-lint';
import { api, getErrorToastContent } from '@/lib/utils';

import { AnalysisReport } from './analysis-report';
import { ResumeForm } from './form';

const ANALYSIS_POLL_INTERVAL_MS = 3000;
const AI_USAGE_KEY = '/users/me/ai-usage';
const FREE_RUN_LIMIT_FALLBACK = 10;

const download = (url: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `resume-${new Date().toISOString()}.pdf`);
  document.body.appendChild(link);
  link.click();
};

const isAnalysisInProgress = (resume?: IGetResumeResponse) =>
  resume?.analysisStatus === ResumeAnalysisStatus.QUEUED ||
  resume?.analysisStatus === ResumeAnalysisStatus.GENERATING;

const getQuotaMessage = (resetsAt: string | null, limit = FREE_RUN_LIMIT_FALLBACK) =>
  resetsAt
    ? `Limit reached. Resets at ${new Date(resetsAt).toLocaleString()}.`
    : `You've used your ${limit} free runs. Upgrade to our pro plan for use.`;

const getUsageLabel = (usage: IAiUsageResponse) => {
  const left = Math.max(usage.limit - usage.used, 0);

  return usage.window === 'lifetime'
    ? `${left} of ${usage.limit} free runs left`
    : `${left} / ${usage.limit} left today`;
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
        <Icon icon={Download01Icon} />
      )}
      Download
    </Button>
  );
}

function QuotaExceededMessage() {
  const { data: usage } = useSWR<IAiUsageResponse>(AI_USAGE_KEY, {
    fetcher: () => api.get(AI_USAGE_KEY).json<IAiUsageResponse>(),
  });

  if (!usage) {
    return <span>You have reached your analysis limit.</span>;
  }

  return <span>{getQuotaMessage(usage.resetsAt, usage.limit)}</span>;
}

function useResumeAnalysis({
  id,
  resume,
  onQueued,
}: {
  id: string;
  resume?: IGetResumeResponse;
  onQueued: () => void;
}) {
  const { data: usage, mutate: mutateUsage } = useSWR<IAiUsageResponse>(AI_USAGE_KEY, {
    fetcher: () => api.get(AI_USAGE_KEY).json<IAiUsageResponse>(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wasInProgress = useRef(isAnalysisInProgress(resume));
  const inProgress = isAnalysisInProgress(resume);

  useEffect(() => {
    if (wasInProgress.current && !inProgress) {
      void mutateUsage();
    }

    wasInProgress.current = inProgress;
  }, [inProgress, mutateUsage]);

  const analyse = async () => {
    setIsSubmitting(true);

    try {
      await api.post(`/resumes/${id}/analysis`).json<IQueueAnalysisResponse>();
      onQueued();
    } catch (error) {
      if (isHTTPError(error) && error.response.status === HttpStatus.PAYMENT_REQUIRED) {
        const latestUsage = await mutateUsage();
        toast.add({
          type: 'error',
          title: 'Limit reached',
          description: getQuotaMessage(latestUsage?.resetsAt ?? null, latestUsage?.limit),
        });
        return;
      }

      toast.add({ type: 'error', ...getErrorToastContent(error) });
    } finally {
      setIsSubmitting(false);
      void mutateUsage();
    }
  };

  return { usage, isSubmitting, inProgress, analyse };
}

function StaleBanner({
  autoAnalyse,
  isSubmitting,
  inProgress,
  onReanalyse,
}: {
  autoAnalyse: boolean;
  isSubmitting: boolean;
  inProgress: boolean;
  onReanalyse: () => void;
}) {
  return (
    <Alert role="status" variant="warning">
      <Icon icon={TriangleAlertIcon} aria-hidden />
      <AlertTitle>Resume changed since this analysis</AlertTitle>
      <AlertDescription>
        {autoAnalyse ? (
          <span className="flex items-center gap-1.5">
            <Icon icon={RefreshIcon} className="size-3 animate-spin" aria-hidden />
            Updating after your edits
          </span>
        ) : (
          <span>Re-analyse to refresh the score and findings.</span>
        )}
      </AlertDescription>
      {!autoAnalyse && (
        <AlertAction>
          <Button size="sm" disabled={isSubmitting || inProgress} onClick={onReanalyse}>
            {isSubmitting || inProgress ? (
              <Spinner className="size-4" />
            ) : (
              <Icon icon={SparklesIcon} />
            )}
            Re-analyse
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}

function SummarySection({
  resume,
  autoAnalyse,
  freeUsageLabel,
  hasRemainingQuota,
  isSubmitting,
  inProgress,
  onAnalyse,
  onOpenField,
}: {
  resume?: IGetResumeResponse;
  autoAnalyse: boolean;
  freeUsageLabel?: string;
  hasRemainingQuota: boolean;
  isSubmitting: boolean;
  inProgress: boolean;
  onAnalyse: () => void;
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
              Your resume is in the queue. This page updates on its own.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );

    case ResumeAnalysisStatus.FAILED: {
      const isQuotaExceeded = resume.analysisError === ResumeAnalysisError.QUOTA_EXCEEDED;
      const canRetry = !isQuotaExceeded || hasRemainingQuota;

      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon icon={BotOffIcon} />
            </EmptyMedia>
            <EmptyTitle>{isQuotaExceeded ? 'Limit reached' : 'Analysis failed'}</EmptyTitle>
            <EmptyDescription>
              {isQuotaExceeded ? (
                <QuotaExceededMessage />
              ) : resume.analysisError === ResumeAnalysisError.PROVIDER_UNAVAILABLE ? (
                'The analysis service is unavailable right now. Try again later.'
              ) : (
                'Something went wrong while analysing your resume.'
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="gap-2">
            {canRetry ? (
              <Button disabled={isSubmitting || inProgress} onClick={onAnalyse}>
                {isSubmitting || inProgress ? (
                  <Spinner className="size-4" />
                ) : (
                  <Icon icon={RefreshIcon} />
                )}
                Try again
              </Button>
            ) : (
              <Button
                nativeButton={false}
                render={<a href={PAYMENTS_URL} target="_blank" rel="noopener noreferrer" />}
              >
                <Icon icon={CrownIcon} />
                Upgrade
              </Button>
            )}
            {freeUsageLabel && (
              <span className="text-xs text-muted-foreground">{freeUsageLabel}</span>
            )}
          </EmptyContent>
        </Empty>
      );
    }

    case ResumeAnalysisStatus.DONE:
      if (!resume.analysisReport) {
        return null;
      }

      return (
        <div className="flex flex-col gap-6">
          {resume.isAnalysisStale && (
            <StaleBanner
              autoAnalyse={autoAnalyse}
              isSubmitting={isSubmitting}
              inProgress={inProgress}
              onReanalyse={onAnalyse}
            />
          )}
          <AnalysisReport
            report={resume.analysisReport}
            resumeJson={resume.json}
            usageLabel={freeUsageLabel}
            onOpenField={onOpenField}
          />
        </div>
      );

    default:
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon icon={FileEmpty02Icon} />
            </EmptyMedia>
            <EmptyTitle>No analysis yet</EmptyTitle>
            <EmptyDescription>This resume has not been analysed yet.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="gap-2">
            <Button disabled={isSubmitting || inProgress} onClick={onAnalyse}>
              {isSubmitting || inProgress ? (
                <Spinner className="size-4" />
              ) : (
                <Icon icon={AiSearchLinesIcon} />
              )}
              Analyse
            </Button>
            {freeUsageLabel && (
              <span className="text-xs text-muted-foreground">{freeUsageLabel}</span>
            )}
          </EmptyContent>
        </Empty>
      );
  }
}

export function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('analysis');
  const [jumpTo, setJumpTo] = useState<IResumeJumpTarget>();
  const [isScrolled, setIsScrolled] = useState(false);
  const tabScrollYRef = useRef<Record<string, number>>({});
  const shouldRestoreScrollRef = useRef(false);
  const autoAnalyse = useUserContext()?.autoAnalyseResume ?? false;

  const switchTab = (nextTab: string, restoreScroll = true) => {
    tabScrollYRef.current[activeTab] = window.scrollY;
    shouldRestoreScrollRef.current = restoreScroll;
    setActiveTab(nextTab);
  };

  useEffect(() => {
    if (!shouldRestoreScrollRef.current) {
      return;
    }

    shouldRestoreScrollRef.current = false;
    window.scrollTo({ top: tabScrollYRef.current[activeTab] ?? 0, behavior: 'instant' });
  }, [activeTab]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const { usage, isSubmitting, inProgress, analyse } = useResumeAnalysis({
    id: id!,
    resume: detail,
    onQueued: () => {
      if (!detail) {
        return;
      }

      void mutate(
        {
          ...detail,
          analysisStatus: ResumeAnalysisStatus.QUEUED,
          analysisError: null,
        },
        { revalidate: true },
      );
    },
  });

  const freeUsageLabel = usage?.plan === Plan.FREE ? getUsageLabel(usage) : undefined;
  const hasRemainingQuota = usage ? usage.used < usage.limit : false;

  const crumbs = useBreadcrumbs([
    {
      label: 'Resumes',
    },
    {
      label: detail?.name ?? '',
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
              <Icon icon={SearchRemoveIcon} />
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
        <div className="flex flex-col gap-8 max-w-2xl grow w-full lg:px-0 px-6">
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
              switchTab(String(value));
            }}
          >
            <div
              className={`sticky top-24 md:top-20 z-10 flex items-center justify-between after:content-[''] after:absolute after:-inset-2 after:bg-muted after:rounded-full after:z-[-1] after:transition-opacity after:duration-250 after:ease-in-out ${
                isScrolled ? 'after:opacity-100' : 'after:opacity-0'
              }`}
            >
              <TabsList
                className={`transition-[padding] duration-600 ease-in-out ${
                  isScrolled ? 'p-0' : 'p-1'
                }`}
              >
                <TabsTrigger value="analysis">
                  <Icon icon={AiSearchLinesIcon} /> Analysis
                </TabsTrigger>
                <TabsTrigger value="edit">
                  <Icon icon={Edit03Icon} /> Edit
                </TabsTrigger>
              </TabsList>
              <DownloadButton id={id!} />
            </div>

            <TabsContent value="analysis" keepMounted className="typeset flex flex-col gap-6 pb-8">
              <SummarySection
                resume={detail}
                autoAnalyse={autoAnalyse}
                freeUsageLabel={freeUsageLabel}
                hasRemainingQuota={hasRemainingQuota}
                isSubmitting={isSubmitting}
                inProgress={inProgress}
                onAnalyse={() => void analyse()}
                onOpenField={({ tab, anchorId, line }) => {
                  setJumpTo({ tab, anchorId, line });
                  switchTab('edit', false);
                }}
              />
            </TabsContent>
            <TabsContent value="edit" keepMounted className="flex flex-col">
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
