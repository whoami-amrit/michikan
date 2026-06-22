import AppHeader from '@/components/app-header';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';

import { ResumeForm } from './form';

export function NewResumePage() {
  const crumbs = useBreadcrumbs([
    {
      label: 'Resumes',
    },
    {
      label: `New Resume`,
    },
  ]);

  return (
    <div className="flex flex-col w-full">
      <AppHeader crumbs={crumbs} />

      <ResumeForm type="new" />
    </div>
  );
}
