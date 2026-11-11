import { useState } from 'react';
import { IAiUsageResponse, IUserResponse } from 'shared';
import useSWR, { mutate } from 'swr';

import AppHeader from '@/components/app-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useUserContext } from '@/lib/contexts/user/hook';
import { api, CURRENT_USER_KEY, getErrorToastContent } from '@/lib/utils';

const formatDateTime = (iso: string) => new Date(iso).toLocaleString();

function PlanCard() {
  const user = useUserContext();

  if (!user) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Plan <Badge variant={user.plan === 'PRO' ? 'default' : 'secondary'}>{user.plan}</Badge>
        </CardTitle>
        <CardDescription>
          {user.plan === 'PRO'
            ? user.planExpiresAt
              ? `Pro until ${formatDateTime(user.planExpiresAt)}.`
              : 'Pro, with no expiry.'
            : 'Free plan.'}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function UsageCard() {
  const { data: usage, isLoading } = useSWR<IAiUsageResponse>('/users/me/ai-usage', {
    fetcher: () => api.get('/users/me/ai-usage').json<IAiUsageResponse>(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI analysis runs</CardTitle>
        <CardDescription>
          {usage?.window === 'day'
            ? 'Your daily limit resets at midnight UTC.'
            : 'Free runs are a lifetime limit.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !usage ? (
          <Skeleton className="h-6 w-40" />
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold tabular-nums">
              {Math.max(usage.limit - usage.used, 0)} left
            </span>
            <span className="text-sm text-muted-foreground">
              {usage.used} of {usage.limit} used
              {usage.resetsAt && `, resets at ${formatDateTime(usage.resetsAt)}`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsCard() {
  const user = useUserContext();
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return null;
  }

  const setAutoAnalyse = async (autoAnalyseResume: boolean) => {
    setIsSaving(true);

    try {
      await api.patch(CURRENT_USER_KEY, { json: { autoAnalyseResume } });

      await mutate<IUserResponse>(CURRENT_USER_KEY, { ...user, autoAnalyseResume }, false);
    } catch (error) {
      toast.add({ type: 'error', ...getErrorToastContent(error) });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="auto-analyse-resume" className="font-normal leading-snug">
            Analyse resumes automatically when I save. Each run counts toward your limit.
          </Label>
          <Switch
            id="auto-analyse-resume"
            checked={user.autoAnalyseResume}
            disabled={isSaving}
            onCheckedChange={(checked) => void setAutoAnalyse(checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserPage() {
  const crumbs = useBreadcrumbs([{ label: 'Account' }]);

  return (
    <div className="flex w-full flex-col items-center">
      <AppHeader crumbs={crumbs} />
      <div className="flex w-full max-w-2xl grow flex-col gap-6 px-6 pb-8 lg:px-0">
        <PlanCard />
        <UsageCard />
        <SettingsCard />
      </div>
    </div>
  );
}
