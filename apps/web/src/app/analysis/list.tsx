import { zodResolver } from '@hookform/resolvers/zod';
import { JobFitAnalysis } from 'db';
import { CheckIcon, FileTextIcon, SearchIcon, SendIcon } from 'lucide-react';
import { MouseEvent, useRef, useState } from 'react';
import { FormProvider, SubmitHandler, useController, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import {
  CreateAnalysisSchema,
  ICreateAnalysisDto,
  ICreateAnalysisDtoInput,
  IGetResumesResponse,
} from 'shared';
import { toast } from 'sonner';
import useSWR from 'swr';

import AppHeader from '@/components/app-header';
import { ErrorToast } from '@/components/error-toast';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { api } from '@/lib/utils';

function ResumeSelectPopover() {
  const { field } = useController<ICreateAnalysisDto>({
    name: 'resumeId',
  });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [selectedResumeId, setSelectedResumeId] = useState<number>();
  const [search, setSearch] = useState<string>('');

  const { data: resumes, isLoading } = useSWR(`resumes?${search}`, async () =>
    api
      .get('/resumes', {
        searchParams: {
          search,
        },
      })
      .json<IGetResumesResponse[]>(),
  );

  const onButtonClicked = (event: MouseEvent<HTMLDivElement>) => {
    const resumeId = Number(event.currentTarget.dataset.resumeId!);
    triggerRef.current?.click();
    void field.onChange(resumeId);
    setSelectedResumeId(resumeId);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button className="max-w-60" ref={triggerRef} type="button" variant="ghost">
            <FileTextIcon />
            <span className="truncate">
              {selectedResumeId
                ? resumes?.find((resume) => resume.id === selectedResumeId)?.name
                : 'Select Resume'}
            </span>
          </Button>
        }
      />
      <PopoverContent align="start" className="p-2 flex flex-col gap-2">
        <InputGroup>
          <InputGroupInput
            placeholder="Search your resumes"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setSearch(event.currentTarget.value);
                return;
              }

              if (event.key === 'Backspace' && event.currentTarget.value === '') {
                setSearch('');
              }
            }}
          />
          <InputGroupAddon align="inline-start">
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
          </div>
        ) : (
          <div className="flex flex-col">
            {resumes?.map((resume) => (
              <div
                role="button"
                key={resume.id}
                onClick={onButtonClicked}
                data-resume-id={resume.id}
                className="text-left px-2 py-1.5 rounded-md hover:bg-muted hover:text-foreground cursor-pointer flex justify-between items-center"
              >
                {resume.name}
                {selectedResumeId === resume.id && <CheckIcon className="size-4" />}
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function AnalysisPage() {
  const { data, isLoading } = useSWR('analysis', async () =>
    api.get('/analysis').json<JobFitAnalysis[]>(),
  );

  const methods = useForm<ICreateAnalysisDtoInput, unknown, ICreateAnalysisDto>({
    defaultValues: {
      jobDescription: '',
      resumeId: undefined,
    },
    mode: 'onBlur',
    resolver: zodResolver(CreateAnalysisSchema),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = methods;

  const navigate = useNavigate();

  const crumbs = useBreadcrumbs([
    {
      label: 'Job Fit Analysis',
    },
  ]);

  const onSubmit: SubmitHandler<ICreateAnalysisDto> = async (formData) => {
    try {
      const { id } = await api.post('/analysis', { json: formData }).json<JobFitAnalysis>();
      void navigate(`/analysis/${id}`);
    } catch (error) {
      console.error('Error creating analysis:', error);
      toast.error(<ErrorToast error={error} />);
    }
  };

  return (
    <div className="flex flex-col items-center w-full relative">
      <AppHeader crumbs={crumbs} />

      <main className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl w-full flex flex-col gap-5 grow">
        <FormProvider {...methods}>
          <form
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onSubmit={handleSubmit(onSubmit)}
          >
            <InputGroup>
              <InputGroupTextarea
                id="analysis-textarea"
                placeholder="Enter job description"
                className="max-h-60"
                {...register('jobDescription')}
              />
              <InputGroupAddon align="block-end">
                <ResumeSelectPopover />
                <InputGroupButton type="submit" className="ml-auto" variant="default" size="sm">
                  Analyze <SendIcon />
                </InputGroupButton>
              </InputGroupAddon>
              {errors?.jobDescription && (
                <InputGroupAddon align="block-start">
                  <FieldError errors={[errors.jobDescription]} />
                </InputGroupAddon>
              )}
            </InputGroup>
          </form>
        </FormProvider>
        {isLoading && (
          <div className="flex w-full max-w-sm flex-col gap-4">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
          </div>
        )}
        {!isLoading && !!data?.length && !getValues().jobDescription && (
          <Table>
            <TableBody>
              {data?.map((analysis) => (
                <TableRow
                  onClick={() => {
                    void navigate(`/analysis/${analysis.id}`);
                  }}
                  key={analysis.id}
                >
                  <TableCell>{analysis.title}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>
    </div>
  );
}
