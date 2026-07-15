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
    <div className="flex flex-col w-full items-center">
      <AppHeader crumbs={crumbs} />

      <div className="flex flex-col gap-8 grow max-w-2xl w-full">
        <ResumeForm type="new" />
      </div>
    </div>
  );
}
