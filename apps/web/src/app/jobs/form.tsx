import { zodResolver } from '@hookform/resolvers/zod';
import { Job, JobStatus, Resume } from 'db';
import { FolderOpen, LoaderCircle, PlusIcon, SquareArrowOutUpRightIcon } from 'lucide-react';
import { Controller, FormProvider, SubmitHandler, useForm, useFormContext } from 'react-hook-form';
import { NavLink, useNavigate } from 'react-router';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  FieldSeparator,
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
import { api } from '@/lib/utils';

type JobFormProps =
  | {
      type: 'edit';
      data?: IUpdateJobDto;
      id?: Job['id'];
    }
  | {
      type: 'new';
      id?: never;
      data?: never;
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

function ResumesCombobox({
  onChange,
  value,
}: {
  onChange: (value: number | undefined) => void;
  value: number | undefined;
}) {
  const navigate = useNavigate();
  const { data: resumeOptions, isLoading } = useSWR<
    { id: Resume['id']; name: string }[],
    undefined
  >('/resumes', {
    fetcher: async () => {
      const resumes = await api.get('/resumes').json<IGetResumesResponse[]>();
      return resumes.map((resume) => ({ id: resume.id, name: resume.name }));
    },
  });

  return (
    <Combobox
      disabled={isLoading}
      onValueChange={(value) => onChange(value ? Number(value) : undefined)}
      value={value ? String(value) : undefined}
      items={resumeOptions ?? []}
    >
      <ComboboxInput className="w-full max-w-80" placeholder="Select a resume for analysis">
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
            <ComboboxItem key={resume.id} value={resume.id.toString()}>
              {resume.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function AIAnalysisFieldSet() {
  const {
    control,
    getValues,
    formState: { errors },
  } = useFormContext<ICreateJobDtoInput>();

  const checked = getValues('shouldAnalyzeOptions.should');

  return (
    <FieldSet>
      <FieldLegend>AI Analysis</FieldLegend>
      <FieldDescription>
        You will have to select a resume for the analysis to run against. Use this feature to get a
        better understanding of how your resume matches the job description and what you can do to
        improve your chances of getting an interview.
      </FieldDescription>
      <FieldGroup>
        <Field orientation="horizontal">
          <Controller
            name="shouldAnalyzeOptions.should"
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                id="job-analysis"
                name="job-analysis"
              />
            )}
          />

          <FieldLabel htmlFor="job-analysis" className="font-normal">
            Let our AI analyze this job
          </FieldLabel>
        </Field>
        {checked && (
          <Field>
            <FieldLabel>Resume</FieldLabel>
            <Controller
              control={control}
              name="shouldAnalyzeOptions.resumeId"
              render={({ field }) => <ResumesCombobox {...field} />}
            />
            <FieldError errors={[errors.shouldAnalyzeOptions?.resumeId]} />
          </Field>
        )}
      </FieldGroup>
    </FieldSet>
  );
}

export function JobForm({ type, data, id }: JobFormProps) {
  const navigate = useNavigate();
  const methods = useForm<ICreateJobDtoInput, unknown, ICreateJobDto>({
    defaultValues:
      type === 'new'
        ? {
            applicationUrl: '',
            company: '',
            jobDescription: '',
            shouldAnalyzeOptions: {
              should: false,
            },
            title: '',
            status: JobStatus.NOT_APPLIED,
          }
        : data,
    mode: 'onBlur',
    resolver: zodResolver(CreateJobSchema),
  });
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = methods;

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
              <FieldLegend>{type === 'new' ? 'Create Job' : 'Update Job'}</FieldLegend>
              <FieldDescription>
                Save a job posting you are interest in by filling in the following. Otherwise you
                could also checkout our{' '}
                <NavLink to="/analysis">
                  Analysis <SquareArrowOutUpRightIcon className="size-3 inline" />
                </NavLink>{' '}
                page where you can simply paste a job description and select a resume and our AI
                expert will analyze it for you save the job for you.
              </FieldDescription>
              <FieldGroup>
                <div className="grid-cols-2 grid gap-4">
                  <Field>
                    <FieldLabel>Title</FieldLabel>
                    <Input {...methods.register('title')} placeholder="Ex. Software Engineer" />
                    <FieldError errors={[errors.title]} />
                  </Field>
                  <Field>
                    <FieldLabel>Company</FieldLabel>
                    <Input {...methods.register('company')} placeholder="Ex. Facebook" />
                    <FieldError errors={[errors.company]} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Job Description</FieldLabel>
                  <Textarea
                    {...methods.register('jobDescription')}
                    placeholder="Ex. We are looking for a software engineer..."
                    className="min-h-36 max-h-64"
                  />
                  <FieldError errors={[errors.jobDescription]} />
                </Field>
                <div className="grid grid-cols-3 gap-4">
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <Controller
                      name="status"
                      control={control}
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
                  <Field className="col-span-2">
                    <FieldLabel>Application URL</FieldLabel>
                    <Input
                      {...methods.register('applicationUrl')}
                      placeholder="Ex. https://company.com/jobs/123"
                    />
                    <FieldError errors={[errors.applicationUrl]} />
                  </Field>
                </div>
              </FieldGroup>
            </FieldSet>
            <FieldSeparator />
            <AIAnalysisFieldSet />
          </FieldGroup>

          {
            // todo: implement shadow for scrollable thing
          }
          <div className="flex justify-end self-end sticky bottom-0 bg-background py-4 shadow-lg shadow-black/10 w-full">
            <div className="flex gap-2 items-center">
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
              <Button type="reset" onClick={() => reset()} variant="secondary">
                Reset
              </Button>
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
