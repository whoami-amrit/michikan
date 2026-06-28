import AppHeader from '@/components/app-header';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';

import { JobForm } from './form';

export function NewJobPage() {
  const crumbs = useBreadcrumbs([
    {
      label: 'Jobs',
    },
    {
      label: `New Job`,
    },
  ]);

  return (
    <div className="flex flex-col w-full">
      <AppHeader crumbs={crumbs} />

      <JobForm type="new" />
    </div>
  );
}
