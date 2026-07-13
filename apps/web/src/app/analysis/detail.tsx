import { JobFitAnalysis } from 'db';
import { BotOffIcon, RefreshCcwIcon } from 'lucide-react';
import { useParams } from 'react-router';
import { AnalysisReportSchema, IAnalysisReport } from 'shared';
import useSWR from 'swr';

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
import { api } from '@/lib/utils';

function ReportPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useSWR<IAnalysisReport | null, unknown>(`/analysis/${id}`, {
    fetcher: async () => {
      const response = await api.get(`/analysis/${id}`).json<JobFitAnalysis>();
      const parsedReport = AnalysisReportSchema.safeParse(response.report);
      if (!parsedReport.success) {
        return null;
      }
      return parsedReport.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-4">
          <Skeleton className="h-15 rounded-xl" />
          <Skeleton className="h-15 rounded-xl" />
          <Skeleton className="h-15 rounded-xl" />
          <Skeleton className="h-15 rounded-xl" />
        </div>

        <div className="flex gap-6 flex-col">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-50" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Empty className="h-screen">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BotOffIcon />
          </EmptyMedia>
          <EmptyTitle>Brain freeze :/</EmptyTitle>
          <EmptyDescription>
            Our AI got lost in thought while processing your data. We’re pulling it out of the
            rabbit hole—please try generating the report again.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="secondary">
            <RefreshCcwIcon />
            Retry
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return <div className="flex flex-col gap-6">{JSON.stringify(data)}</div>;
}

export default ReportPage;
