import { zodResolver } from '@hookform/resolvers/zod';
import { Job, JobStatus, Resume } from 'db';
import { FolderOpen, LoaderCircle, PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Controller,
  FormProvider,
  SubmitHandler,
  useForm,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { useNavigate } from 'react-router';
import {
  CreateJobSchema,
  ICreateJobDto,
  ICreateJobDtoInput,
  IGetResumesResponse,
  IUpdateJobDto,
} from 'shared';
import { toast } from 'sonner';
import useSWR from 'swr';

import { ErrorToast } from '@/components/error-toast';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroupAddon } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, convertNullsToUndefined } from '@/lib/utils';

type JobFormProps =
  | {
      type: 'edit';
      data: IUpdateJobDto;
      id: Job['id'];
      mutate: () => void;
    }
  | {
      type: 'new';
      id?: never;
      data?: never;
      mutate?: never;
    };

const jobStatusOptions: { value: JobStatus; label: string }[] = [
  { value: JobStatus.NOT_APPLIED, label: 'Not Applied' },
  { value: JobStatus.APPLIED, label: 'Applied' },
  { value: JobStatus.SHORTLISTED, label: 'Shortlisted' },
  { value: JobStatus.NOT_SHORTLISTED, label: 'Not Shortlisted' },
  { value: JobStatus.INTERVIEW_ONGOING, label: 'Interview Ongoing' },
  { value: JobStatus.ACCEPTED, label: 'Offer Received' },
  { value: JobStatus.REJECTED, label: 'Rejected' },
];

type UnpackArray<T> = T extends readonly (infer U)[] ? U : never;

interface ResumeOptionType {
  id: Resume['id'];
  name: string;
}

function ResumesCombobox({
  onChange,
  value,
}: {
  onChange: (value: number | null | undefined) => void;
  value: number | undefined;
}) {
  const navigate = useNavigate();

  const [selectedOption, setSelectedOption] = useState<ResumeOptionType | null>(null);

  const { data: resumeOptions, isLoading } = useSWR<ResumeOptionType[], undefined>('/resumes', {
    fetcher: async () => {
      const resumes = await api.get('/resumes').json<IGetResumesResponse[]>();
      const options: ResumeOptionType[] = resumes.map((resume) => ({
        id: resume.id,
        name: resume.name,
      }));
      if (value) {
        setSelectedOption(options.find((option) => option.id === value) ?? null);
      }
      return options;
    },
  });

  return (
    <Combobox<ResumeOptionType>
      disabled={isLoading}
      onValueChange={(value, { reason }) => {
        onChange(reason === 'clear-press' ? null : value?.id);
        setSelectedOption(value);
      }}
      value={selectedOption}
      items={resumeOptions ?? []}
      itemToStringLabel={(item) => item.name}
    >
      <ComboboxInput className="w-full" placeholder="Select a resume for analysis" showClear>
        <InputGroupAddon>
          {isLoading && <LoaderCircle className="size-3 animate-spin" />}
        </InputGroupAddon>
      </ComboboxInput>
      <ComboboxContent>
        <ComboboxEmpty>
          {resumeOptions?.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderOpen />
                </EmptyMedia>
                <EmptyTitle className="text-foreground">No Resumes</EmptyTitle>
                <EmptyDescription>Create a resume to get started.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={() => void navigate('/resumes/new')}>
                  <PlusIcon data-icon="inline-start" />
                  Create
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            'No items found'
          )}
        </ComboboxEmpty>
        <ComboboxList>
          {(resume: UnpackArray<typeof resumeOptions>) => (
            <ComboboxItem key={resume.id} value={resume}>
              {resume.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function SubmittedResumeField() {
  const {
    formState: { errors },
  } = useFormContext<ICreateJobDto>();
  const status = useWatch<ICreateJobDto>({ name: 'status' });

  return (
    status !== JobStatus.NOT_APPLIED && (
      <Field>
        <FieldLabel>Submitted Resume</FieldLabel>
        <Controller
          name="submittedResumeId"
          render={({ field }) => <ResumesCombobox {...field} />}
        />
        <FieldError errors={[errors.submittedResumeId]} />
      </Field>
    )
  );
}

const LOCAL_STORAGE_KEY = 'new-job-form';

const getDefaultNewFormValues = (): ICreateJobDtoInput => {
  const unsavedFormState = localStorage.getItem(LOCAL_STORAGE_KEY);

  try {
    return JSON.parse(unsavedFormState!) as ICreateJobDtoInput;
  } catch (error) {
    if (unsavedFormState) {
      console.log(error);
    }

    return {
      applyLink: '',
      company: '',
      jobDescription: '',
      role: '',
      status: JobStatus.NOT_APPLIED,
      submittedResumeId: undefined,
      notes: '',
      source: '',
    };
  }
};

export function JobForm({ type, data, id, mutate }: JobFormProps) {
  const navigate = useNavigate();
  const methods = useForm<ICreateJobDtoInput, unknown, ICreateJobDto>({
    defaultValues:
      type === 'new'
        ? getDefaultNewFormValues()
        : (convertNullsToUndefined(data) as ICreateJobDtoInput),
    mode: 'onBlur',
    resolver: zodResolver(CreateJobSchema),
  });
  const {
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    subscribe,
  } = methods;

  useEffect(() => {
    if (type === 'edit') {
      return;
    }

    const callback = subscribe({
      formState: {
        values: true,
      },
      callback: ({ values }) => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(values));
      },
    });

    return () => {
      callback();
    };
  }, [subscribe, type]);

  const onSubmit: SubmitHandler<ICreateJobDto> = async (formData, event) => {
    event?.preventDefault();

    try {
      if (type === 'new') {
        const { id } = await api
          .post('/jobs', {
            json: formData,
          })
          .json<Job>();

        await navigate(`/jobs/${id}`);
        return;
      }

      await api.patch(`/jobs/${id}`, {
        json: formData,
      });

      mutate();
    } catch (error) {
      toast.error(<ErrorToast error={error} />);
    }
  };

  return (
    <div className="flex justify-center grow">
      <FormProvider {...methods}>
        <form
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 max-w-2xl grow px-6 lg:px-0"
        >
          <FieldGroup className="grow">
            <FieldSet>
              {type === 'new' && (
                <>
                  <FieldLegend>Your job search, finally organized</FieldLegend>
                  <FieldDescription>
                    Save every role in one place — company, source, status, all at a glance. Paste
                    the job description once, and we'll distill it into a clean summary
                    automatically.
                  </FieldDescription>
                </>
              )}
              <FieldGroup>
                <div className="grid-cols-2 grid gap-4">
                  <Field>
                    <FieldLabel required>Role</FieldLabel>
                    <Input
                      {...methods.register('role', { disabled: type === 'edit' })}
                      placeholder="Ex. Software Engineer"
                    />
                    <FieldError errors={[errors.role]} />
                  </Field>
                  <Field>
                    <FieldLabel required>Company</FieldLabel>
                    <Input
                      {...methods.register('company', { disabled: type === 'edit' })}
                      placeholder="Ex. Facebook"
                    />
                    <FieldError errors={[errors.company]} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel required>Job Description</FieldLabel>
                  <Textarea
                    {...methods.register('jobDescription', { disabled: type === 'edit' })}
                    placeholder="Ex. We are looking for a software engineer..."
                    className="min-h-36 max-h-64"
                  />
                  <FieldError errors={[errors.jobDescription]} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel required>Status</FieldLabel>
                    <Controller
                      name="status"
                      render={({ field }) => (
                        <Select
                          {...field}
                          defaultValue={jobStatusOptions[0].value}
                          onValueChange={field.onChange}
                          items={jobStatusOptions}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Set status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Job Application Status</SelectLabel>
                              {jobStatusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[errors.status]} />
                  </Field>
                  <Field>
                    <FieldLabel required>Source</FieldLabel>
                    <Input
                      {...methods.register('source', { disabled: type === 'edit' })}
                      placeholder="Ex. Linkedin, Naukri, etc"
                    />
                    <FieldError errors={[errors.source]} />
                  </Field>
                </div>
                <div className="flex gap-4">
                  <SubmittedResumeField />
                  <Field className="grow">
                    <FieldLabel>Apply Link</FieldLabel>
                    <Input
                      {...methods.register('applyLink')}
                      placeholder="Ex. https://company.com/jobs/123"
                    />
                    <FieldError errors={[errors.applyLink]} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Notes</FieldLabel>
                  <FieldDescription>
                    Jot down anything worth remembering — interview prep, contacts, follow-ups, or
                    your own notes on the role.
                  </FieldDescription>
                  <Textarea className="min-h-36 max-h-92" {...methods.register('notes')} />
                  <FieldError errors={[errors.notes]} />
                </Field>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>

          {
            // todo: implement shadow for scrollable thing
          }
          <div className="flex justify-end self-end sticky bottom-0 py-4 z-10 w-full after:content-[''] after:w-[calc(100%+24px)] after:bg-background after:absolute after:-left-3 after:h-full after:top-0 after:z-[-1]">
            <div className="flex gap-2 items-center">
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
              {type === 'new' && (
                <Button
                  type="reset"
                  onClick={() => {
                    reset();
                    localStorage.removeItem(LOCAL_STORAGE_KEY);
                  }}
                  variant="secondary"
                >
                  Reset
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {type === 'new' ? 'Save' : 'Update'}
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
