import { FormProps } from '@rjsf/core';
import { generateForm } from '@rjsf/shadcn';
import { RJSFSchema } from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { Resume } from 'db';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ICreateResumeDto, IResumeJson, ResumeJsonSchema } from 'shared';
import { toast } from 'sonner';
import useSWR from 'swr';

import AppHeader from '@/components/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { api } from '@/lib/utils';

const Form = generateForm<ICreateResumeDto['json']>();
const validator = customizeValidator<ICreateResumeDto['json']>();

type ResumeFormProps = Pick<FormProps, 'disabled'> &
  (
    | {
        type: 'edit';
        data: IResumeJson;
      }
    | {
        type: 'new';
        data?: never;
      }
  );

function ResumeForm({ type, data }: ResumeFormProps) {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center">
      <Form
        className="grow max-w-2xl"
        schema={ResumeJsonSchema as RJSFSchema}
        validator={validator}
        liveValidate
        omitExtraData
        noHtml5Validate
        formData={data ?? undefined}
        onSubmit={({ formData }) => {
          if (formData === undefined) {
            toast.error('Form is empty. Please fill out the form correctly.');
            return;
          }

          if (type === 'new') {
            void api
              .post('/resumes', {
                json: {
                  json: formData,
                  name: 'test',
                  description: 'Test resume',
                } satisfies ICreateResumeDto,
              })
              .then(() => navigate('/resumes'));
            return;
          }

          void api.patch('/resumes/1', {});
        }}
      />
    </div>
  );
}

function EditResumePage() {
  const { id } = useParams();

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
      <AppHeader crumbs={crumbs} />

      {isLoading ? (
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
        <ResumeForm type="edit" data={detail?.json as IResumeJson} />
      )}
    </div>
  );
}

function NewResumePage() {
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

export default function ResumeDetailPage({
  type,
}: {
  type: React.ComponentProps<typeof ResumeForm>['type'];
}) {
  return type === 'new' ? <NewResumePage /> : <EditResumePage />;
}
