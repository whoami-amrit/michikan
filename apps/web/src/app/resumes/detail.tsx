import { Resume } from 'db';
import dompurify from 'dompurify';
import { BrainCircuit, FileDown, PencilIcon } from 'lucide-react';
import { marked } from 'marked';
import { useState } from 'react';
import { useLocation, useParams } from 'react-router';
import {
  ICreateRenderWorkerResponse,
  ICreateWorkerResponse,
  IRenderStatusResponse,
  IResumeJson,
} from 'shared';
import { toast } from 'sonner';
import useSWR from 'swr';

import AppHeader from '@/components/app-header';
import { ErrorToast } from '@/components/error-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { api } from '@/lib/utils';

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
  const [progress, setProgress] = useState<'pending' | 'completed' | 'failed'>();

  useSWR(`/resumes/worker/${id}`, {
    refreshInterval: 500,
    isOnline: () => progress === 'pending',
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

      if (response.status === 'FAILED') {
        toast.error(<ErrorToast />);
        setProgress('failed');
        return;
      }

      if (response.status !== 'COMPLETED') {
        return;
      }

      toast.success('Resume ready for download');
      download(response.downloadUrl!);
      setProgress('completed');
    },
  });

  return (
    <Button
      variant="outline"
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={async () => {
        try {
          setWorkerInfo(await api.post(`/resumes/${id}/render`).json<ICreateWorkerResponse>());
          setProgress('pending');
          toast.success('Resume download started! Please wait...');
        } catch (error) {
          toast.error(<ErrorToast error={error} />);
        }
      }}
    >
      {progress === 'pending' ? <Spinner className="size-4" /> : <FileDown />}
      Download
    </Button>
  );
}

export function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { pathname } = useLocation();

  const { data: detail, isLoading } = useSWR<Resume>(pathname, {
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
    <div className="flex flex-col w-full">
      <AppHeader crumbs={crumbs}>
        <DownloadButton id={id!} />
      </AppHeader>

      {isLoading || detail === undefined ? (
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
      ) : (
        <div className="flex justify-center content-center grow">
          <div className="flex flex-col grow max-w-2xl lg:px-0 px-6">
            <Tabs className="gap-8 grow">
              <TabsList>
                <TabsTrigger value="analysis">
                  <BrainCircuit /> Analysis
                </TabsTrigger>
                <TabsTrigger value="edit">
                  <PencilIcon /> Edit
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="analysis"
                className="typeset typeset-doc"
                dangerouslySetInnerHTML={{
                  __html: dompurify.sanitize(marked(detail.analysisReport ?? '', { async: false })),
                }}
              />
              <TabsContent value="edit" className="flex flex-col">
                <ResumeForm
                  type="edit"
                  data={{
                    json: detail.json as IResumeJson,
                    name: detail.name,
                    description: detail.description ?? undefined,
                  }}
                  id={id!}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
