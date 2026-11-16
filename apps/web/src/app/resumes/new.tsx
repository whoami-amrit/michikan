import { useState } from 'react';

import AppHeader from '@/components/app-header';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { DEFAULT_RESUME_NAME, getDefaultNewResumeFormValues } from '@/lib/resume-form';

import { ResumeForm } from './form';

export function NewResumePage() {
  const [name, setName] = useState(
    () => getDefaultNewResumeFormValues().name || DEFAULT_RESUME_NAME,
  );

  const crumbs = useBreadcrumbs([
    {
      label: 'Resumes',
    },
    {
      label: name,
      onLabelChange: setName,
    },
  ]);

  return (
    <div className="flex flex-col w-full items-center">
      <AppHeader crumbs={crumbs} />

      <div className="flex flex-col gap-8 grow max-w-2xl w-full px-6 lg:px-0">
        <ResumeForm type="new" name={name} onNameChange={setName} />
      </div>
    </div>
  );
}
