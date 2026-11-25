import { zodResolver } from '@hookform/resolvers/zod';
import {
  Add01Icon,
  AlertCircleIcon,
  Cancel01Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { Resume } from 'db';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Controller,
  FormProvider,
  SubmitHandler,
  useFieldArray,
  useForm,
  useFormContext as useRHFFormContext,
} from 'react-hook-form';
import { useNavigate } from 'react-router';
import { CreateResumeSchema, ICreateResumeDto, ICreateResumeDtoInput, IResumeJson } from 'shared';

import { ResumeLintFindings } from '@/components/resume-lint-findings';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { MonthPicker } from '@/components/ui/month-picker';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import {
  DEFAULT_RESUME_NAME,
  getDefaultNewResumeFormValues,
  NEW_RESUME_STORAGE_KEY,
} from '@/lib/resume-form';
import {
  type IResumeJumpTarget,
  resumeFieldId,
  resumeLintContext,
  selectTextareaLine,
  useResumeLint,
} from '@/lib/resume-lint';
import { api, cn, convertNullsToUndefined, getErrorToastContent } from '@/lib/utils';

type ResumeFormProps =
  | {
      type: 'edit';
      id: string;
      data: ICreateResumeDto;
      mutate: () => void;
      jumpTo?: IResumeJumpTarget;
      name?: never;
      onNameChange?: never;
    }
  | {
      type: 'new';
      id?: never;
      data?: never;
      mutate?: never;
      jumpTo?: never;
      name?: string;
      onNameChange?: (name: string) => void;
    };

const useFormContext = () => useRHFFormContext<ICreateResumeDtoInput, unknown, ICreateResumeDto>();

const TabKeys: Record<string, keyof IResumeJson> = {
  PersonalInfo: 'personalInfo',
  Skills: 'skills',
  Experience: 'experience',
  Education: 'education',
  Projects: 'projects',
  Summary: 'summary',
};

const tabs = [
  [TabKeys.PersonalInfo, 'Personal Info'],
  [TabKeys.Skills, 'Skills'],
  [TabKeys.Experience, 'Experience'],
  [TabKeys.Education, 'Education'],
  [TabKeys.Projects, 'Projects'],
  [TabKeys.Summary, 'Summary'],
] as const;

function PersonalInfoTab() {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <FieldGroup>
      <FieldSet>
        <FieldGroup className="sm:grid-cols-2 grid gap-4">
          <Field>
            <FieldLabel required>Name</FieldLabel>
            <Input {...register('json.personalInfo.name')} type="text" placeholder="John Doe" />
            <FieldError errors={[errors.json?.personalInfo?.name]} />
          </Field>
          <Field>
            <FieldLabel required>Email</FieldLabel>
            <Input
              {...register('json.personalInfo.email')}
              id={resumeFieldId('json.personalInfo.email')}
              placeholder="hello@world.me"
            />
            <FieldError errors={[errors.json?.personalInfo?.email]} />
            <ResumeLintFindings fieldName="json.personalInfo.email" />
          </Field>
          <Field>
            <FieldLabel>Github or Gitlab</FieldLabel>
            <Input
              {...register('json.personalInfo.github')}
              placeholder="https://github.com/username"
            />
            <FieldError errors={[errors.json?.personalInfo?.github]} />
          </Field>
          <Field>
            <FieldLabel>Phone</FieldLabel>
            <Input {...register('json.personalInfo.phone')} placeholder="123-456-7890" />
            <FieldError errors={[errors.json?.personalInfo?.phone]} />
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSeparator />
      <FieldSet>
        <FieldLegend>Portfolio</FieldLegend>
        <FieldDescription>
          Provide your portfolio URL and a short, elegant label for it. The label is what appears in
          your resume, so keep it concise and memorable—like just your domain name, even if the
          actual URL is long or complex.
          <br /> Ex - URL:{' '}
          <code className="inline">https://your-portfolio.com/projects/section/deep-link</code> →
          Label: <code className="inline">your-portfolio.com</code>
          <br /> Or - URL: <code className="inline">https://my-site-12345.netlify.app</code> →
          Label: <code className="inline">my-site.dev</code>
        </FieldDescription>
        <Field>
          <FieldLabel>Portfolio</FieldLabel>
          <Input
            {...register('json.personalInfo.portfolio')}
            placeholder="https://your-portfolio.com"
          />
          <FieldError errors={[errors.json?.personalInfo?.portfolio]} />
        </Field>
      </FieldSet>
    </FieldGroup>
  );
}

function SkillsTab() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { fields, append, remove } = useFieldArray<ICreateResumeDtoInput, 'json.skills'>({
    name: 'json.skills',
  });

  return (
    <FieldGroup>
      <FieldSet id={resumeFieldId('json.skills')}>
        <ResumeLintFindings fieldName="json.skills" />
        {!!fields.length && (
          <FieldGroup className="hidden sm:flex flex-row gap-4">
            <Field className="w-50 shrink-0">
              <FieldLabel required>Category</FieldLabel>
            </Field>
            <Field className="grow">
              <FieldLabel required>Skills</FieldLabel>
            </Field>
          </FieldGroup>
        )}
        {fields.map((field, index) => (
          <Card
            key={field.id}
            size="sm"
            className="px-(--card-spacing) sm:overflow-visible sm:rounded-none sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0"
          >
            <FieldGroup className="flex-col gap-3 sm:flex-row sm:gap-4">
              <div className="flex items-start justify-between gap-2 sm:contents">
                <Field className="max-w-60 min-w-0 flex-1 sm:w-50 sm:flex-none">
                  <Input
                    {...register(`json.skills.${index}.category`)}
                    placeholder="Category (Ex. Frontend)"
                  />
                  <FieldError errors={[errors.json?.skills?.[index]?.category]} />
                </Field>
                <Button
                  className="w-8 shrink-0 sm:order-last"
                  variant="destructive"
                  onClick={() => remove(index)}
                >
                  <Icon icon={Cancel01Icon} />
                </Button>
              </div>
              <Field className="grow">
                <Input
                  {...register(`json.skills.${index}.skills`)}
                  placeholder="Skills (e.g. React.js, Vite, ...)"
                />
                <FieldError errors={[errors.json?.skills?.[index]?.skills]} />
              </Field>
            </FieldGroup>
          </Card>
        ))}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => append({ category: '', skills: '' })}>
            <Icon icon={Add01Icon} />
            Add Category
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
}

const HIGHLIGHT_FRAMEWORKS = [
  {
    name: 'STAR',
    summary: 'Situation, Task, Action, Result',
    links: [
      {
        label: 'levels.fyi guide',
        href: 'https://www.levels.fyi/blog/applying-star-method-resumes.html',
      },
      {
        label: 'Resume Genius guide',
        href: 'https://resumegenius.com/blog/resume-help/star-method-resume',
      },
    ],
  },
  {
    name: 'XYZ',
    summary: '"Accomplished [X] as measured by [Y], by doing [Z]"',
    links: [
      {
        label: "Google's recruiting team on the X-Y-Z formula",
        href: 'https://www.inc.com/bill-murphy-jr/google-recruiters-say-these-5-resume-tips-including-x-y-z-formula-will-improve-your-odds-of-getting-hired-at-google.html',
      },
      {
        label: 'Eleven Recruiting guide',
        href: 'https://elevenrecruiting.com/create-an-effective-resume-xyz-resume-format/',
      },
    ],
  },
  {
    name: 'CAR',
    summary: 'Challenge, Action, Result',
    links: [
      {
        label: 'Indeed guide',
        href: 'https://ca.indeed.com/career-advice/resumes-cover-letters/challenge-action-result-resume',
      },
      {
        label: 'Top Resume guide',
        href: 'https://www.topresume.com/career-advice/how-to-get-more-results-with-a-car-resume',
      },
    ],
  },
] as const;

function HighlightsTipsPopover() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="How to write effective highlights"
            className="inline-flex items-center justify-center rounded-sm p-1 -m-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Icon icon={InformationCircleIcon} className="size-4 shrink-0" />
          </button>
        }
      />
      <PopoverContent align="start" className="w-96 max-w-[calc(100vw-2rem)] gap-3">
        <PopoverHeader>
          <PopoverTitle className="text-sm font-semibold">
            How to write effective highlights
          </PopoverTitle>
          <PopoverDescription className="text-xs leading-relaxed">
            Show what you did, how you did it, and the measurable outcome — ideally placing the
            metric early in the sentence for maximum impact.
          </PopoverDescription>
        </PopoverHeader>
        <ul className="flex flex-col gap-2.5 text-xs leading-relaxed text-muted-foreground">
          {HIGHLIGHT_FRAMEWORKS.map((framework) => (
            <li key={framework.name}>
              <span className="font-semibold text-foreground">{framework.name}</span> (
              {framework.summary}):{' '}
              {framework.links.map((link, index) => (
                <span key={link.href}>
                  {index > 0 && ', '}
                  <a
                    href={link.href}
                    className="text-blue-500 dark:text-blue-400 hover:underline-offset-4 hover:underline"
                    referrerPolicy="no-referrer"
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                </span>
              ))}
            </li>
          ))}
        </ul>
        <p className="border-t pt-2.5 text-xs leading-relaxed text-muted-foreground">
          Once you&apos;ve drafted your bullets, run them through Quillbot to paraphrase and tighten
          the wording — great for cutting a bullet down to one clean sentence without losing the
          substance.
        </p>
      </PopoverContent>
    </Popover>
  );
}

function ExperienceTab() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();
  const { fields, append, remove } = useFieldArray<ICreateResumeDtoInput, 'json.experience'>({
    name: 'json.experience',
  });

  return (
    <FieldGroup>
      <FieldSet>
        {fields.map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>
                <Field className="w-64">
                  <FieldLabel required>Company</FieldLabel>
                  <Input
                    {...register(`json.experience.${index}.company`)}
                    id={resumeFieldId(`json.experience.${index}.company`)}
                    placeholder="Ex. Google"
                    tabIndex={0}
                  />
                  <FieldError errors={[errors.json?.experience?.[index]?.company]} />
                </Field>
              </CardTitle>
              <CardAction>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => remove(index)}
                  tabIndex={1}
                >
                  <Icon icon={Cancel01Icon} />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel required>Job Title</FieldLabel>
                    <Input
                      {...register(`json.experience.${index}.title`)}
                      placeholder="Ex. Software Engineer"
                    />
                    <FieldError errors={[errors.json?.experience?.[index]?.title]} />
                  </Field>
                  <Field>
                    <FieldLabel>Location</FieldLabel>
                    <Input
                      {...register(`json.experience.${index}.location`)}
                      placeholder="Ex. San Francisco, CA"
                    />
                    <FieldError errors={[errors.json?.experience?.[index]?.location]} />
                  </Field>
                </div>
                <Field className="col-span-2">
                  <div className="flex items-center gap-1.5">
                    <FieldLabel required>Highlights</FieldLabel>
                    <HighlightsTipsPopover />
                  </div>
                  <Textarea
                    className="max-h-80"
                    {...register(`json.experience.${index}.highlights`)}
                    id={resumeFieldId(`json.experience.${index}.highlights`)}
                  />
                  <ResumeLintFindings fieldName={`json.experience.${index}.highlights`} />
                  <FieldDescription>
                    Each new line becomes its own bullet point on your resume — so give every
                    accomplishment its own line. Skip filler; one sharp, quantified line beats three
                    vague ones.
                  </FieldDescription>
                </Field>
                <div className="flex gap-4">
                  <Field className="w-44">
                    <FieldLabel required>Start Date</FieldLabel>
                    <Controller
                      name={`json.experience.${index}.startDate`}
                      control={control}
                      render={({ field }) => (
                        <MonthPicker
                          {...field}
                          value={typeof field.value === 'string' ? field.value : undefined}
                        />
                      )}
                    />
                    <FieldError errors={[errors.json?.experience?.[index]?.startDate]} />
                  </Field>
                  <Field className="w-44">
                    <FieldLabel>End Date</FieldLabel>
                    <Controller
                      name={`json.experience.${index}.endDate`}
                      control={control}
                      render={({ field }) => (
                        <MonthPicker
                          {...field}
                          value={typeof field.value === 'string' ? field.value : undefined}
                        />
                      )}
                    />
                    <FieldError errors={[errors.json?.experience?.[index]?.endDate]} />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        ))}
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={() =>
              append({
                title: '',
                company: '',
                highlights: '',
                isCurrentRole: false,
                startDate: '',
                endDate: '',
                location: '',
              })
            }
          >
            <Icon icon={Add01Icon} />
            Add Experience
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
}

function EducationTab() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();
  const { fields, append, remove } = useFieldArray<ICreateResumeDtoInput, 'json.education'>({
    name: 'json.education',
  });

  return (
    <FieldGroup>
      <FieldSet>
        {fields.map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>
                <Field className="w-44">
                  <FieldLabel required>Graduation Date</FieldLabel>
                  <Controller
                    name={`json.education.${index}.graduationDate`}
                    control={control}
                    render={({ field }) => (
                      <MonthPicker
                        {...field}
                        value={typeof field.value === 'string' ? field.value : undefined}
                        endMonth={GRADUATION_END_MONTH}
                      />
                    )}
                  />
                  <FieldError errors={[errors.json?.education?.[index]?.graduationDate]} />
                </Field>
              </CardTitle>
              <CardAction>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => remove(index)}
                  tabIndex={1}
                >
                  <Icon icon={Cancel01Icon} />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel required>Degree</FieldLabel>
                    <Input
                      {...register(`json.education.${index}.degree`)}
                      placeholder="Ex. Bachelor of Science"
                      tabIndex={0}
                    />
                    <FieldError errors={[errors.json?.education?.[index]?.degree]} />
                  </Field>
                  <Field>
                    <FieldLabel required>Field of Study</FieldLabel>
                    <Input
                      {...register(`json.education.${index}.field`)}
                      placeholder="Ex. Computer Science"
                    />
                    <FieldError errors={[errors.json?.education?.[index]?.field]} />
                  </Field>
                </div>
                <div className="grid gird-cols-3 gap-4">
                  <Field className="col-span-2">
                    <FieldLabel required>Institution</FieldLabel>
                    <Input
                      {...register(`json.education.${index}.institution`)}
                      id={resumeFieldId(`json.education.${index}.institution`)}
                      placeholder="Ex. Stanford University"
                    />
                    <FieldError errors={[errors.json?.education?.[index]?.institution]} />
                  </Field>
                  <Field>
                    <FieldLabel>GPA or CGPA or Special Remark</FieldLabel>
                    <Input
                      {...register(`json.education.${index}.specialRemark`)}
                      placeholder="3.75/4 or 9/10"
                    />
                    <FieldDescription>
                      Mention only if 3.75/4+ or 9/10+; drop it once you have real full-time
                      experience unless it's outstanding.
                    </FieldDescription>
                    <FieldError errors={[errors.json?.education?.[index]?.specialRemark]} />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        ))}
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={() =>
              append({
                degree: '',
                field: '',
                institution: '',
                graduationDate: '',
                specialRemark: undefined,
              })
            }
          >
            <Icon icon={Add01Icon} />
            Add Qualification
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
}

function ProjectsTab() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { fields, append, remove } = useFieldArray<ICreateResumeDtoInput, 'json.projects'>({
    name: 'json.projects',
  });

  return (
    <FieldGroup>
      <FieldSet>
        {fields.map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>
                <Field className="w-64">
                  <FieldLabel required>Project Title</FieldLabel>
                  <Input
                    {...register(`json.projects.${index}.title`)}
                    id={resumeFieldId(`json.projects.${index}.title`)}
                    placeholder="Ex. Software Engineer"
                  />
                  <FieldError errors={[errors.json?.projects?.[index]?.title]} />
                  <ResumeLintFindings fieldName={`json.projects.${index}.title`} />
                </Field>
              </CardTitle>
              <CardAction>
                <Button variant="destructive" size="icon-sm" onClick={() => remove(index)}>
                  <Icon icon={Cancel01Icon} />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid sm:grid-cols-2 gap-4">
                <Field className="sm:col-span-2">
                  <div className="flex items-center gap-1.5">
                    <FieldLabel required>Highlights</FieldLabel>
                    <HighlightsTipsPopover />
                  </div>
                  <Textarea
                    className="max-h-44"
                    {...register(`json.projects.${index}.highlights`)}
                    id={resumeFieldId(`json.projects.${index}.highlights`)}
                  />
                  <ResumeLintFindings fieldName={`json.projects.${index}.highlights`} />
                  <FieldDescription>
                    Each new line becomes its own bullet point on your resume. Order them from most
                    impressive and relevant to least.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Technologies</FieldLabel>
                  <Input
                    {...register(`json.projects.${index}.technologies`)}
                    placeholder="Next.js, NestJS, Prisma"
                  />
                </Field>
                <Field>
                  <FieldLabel>URL</FieldLabel>
                  <Input
                    {...register(`json.projects.${index}.url`)}
                    placeholder="Ex. https://github.com/user/project"
                  />
                  <FieldError errors={[errors.json?.projects?.[index]?.url]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        ))}
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={() =>
              append({
                title: '',
                url: '',
                highlights: '',
                technologies: '',
              })
            }
          >
            <Icon icon={Add01Icon} />
            Add Project
          </Button>
        </div>
      </FieldSet>
    </FieldGroup>
  );
}

function SummaryTab() {
  // todo: this is supposed to be for staff engineers (very senior people) or who have made a career switch or explain a gap in your career
  // todo: refer r/EngineeringResume wiki for all the good to haves & etc
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <FieldGroup>
      <FieldSet>
        <Field>
          <Textarea
            className="min-h-44 max-h-64"
            placeholder="Only for senior/staff candidates, career changers, or explaining a gap — skip otherwise. Keep to 1–2 sentences focused on scope of impact, the pivot, or the gap."
            {...register('json.summary')}
            id={resumeFieldId('json.summary')}
          />
          <FieldError errors={[errors.json?.summary]} />
          <ResumeLintFindings fieldName="json.summary" />
        </Field>
      </FieldSet>
    </FieldGroup>
  );
}

const GRADUATION_END_MONTH = new Date(new Date().getFullYear() + 8, 11);

export function ResumeForm({
  type,
  data,
  id,
  mutate,
  jumpTo,
  name,
  onNameChange,
}: ResumeFormProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>(jumpTo?.tab ?? TabKeys.PersonalInfo);
  const [handledJump, setHandledJump] = useState(jumpTo);
  const [isScrolled, setIsScrolled] = useState(false);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [tabsScrollEdges, setTabsScrollEdges] = useState({ left: false, right: false });

  const updateTabsScrollEdges = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) {
      return;
    }

    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setTabsScrollEdges((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right },
    );
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) {
      return;
    }

    updateTabsScrollEdges();

    const observer = new ResizeObserver(updateTabsScrollEdges);
    observer.observe(el);
    if (el.firstElementChild) {
      observer.observe(el.firstElementChild);
    }

    return () => observer.disconnect();
  }, [updateTabsScrollEdges]);

  if (jumpTo && jumpTo !== handledJump) {
    setHandledJump(jumpTo);
    setActiveTab(jumpTo.tab);
  }

  useEffect(() => {
    if (!jumpTo) {
      return;
    }

    let frame = 0;
    let attempts = 0;

    const moveToField = () => {
      const element = document.getElementById(jumpTo.anchorId);

      if (!element) {
        if (attempts++ < 10) {
          frame = requestAnimationFrame(moveToField);
        }
        return;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus({ preventScroll: true });

      if (jumpTo.line !== undefined && element instanceof HTMLTextAreaElement) {
        selectTextareaLine(element, jumpTo.line);
      }
    };

    frame = requestAnimationFrame(moveToField);
    return () => cancelAnimationFrame(frame);
  }, [jumpTo]);

  const methods = useForm<ICreateResumeDtoInput, unknown, ICreateResumeDto>({
    defaultValues:
      type === 'new'
        ? getDefaultNewResumeFormValues()
        : (convertNullsToUndefined(data) as ICreateResumeDtoInput),
    mode: 'onBlur',
    resolver: zodResolver(CreateResumeSchema),
  });
  const {
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    subscribe,
  } = methods;
  const lintFindings = useResumeLint(methods.control);

  useEffect(() => {
    if (type === 'edit') {
      return;
    }

    const callback = subscribe({
      formState: {
        values: true,
      },
      callback: ({ values }) => {
        localStorage.setItem(NEW_RESUME_STORAGE_KEY, JSON.stringify(values));
      },
    });

    return () => {
      callback();
    };
  }, [subscribe, type]);

  useEffect(() => {
    if (type === 'new' && name !== undefined) {
      methods.setValue('name', name, { shouldValidate: true });
    }
  }, [methods, name, type]);

  const onSubmit: SubmitHandler<ICreateResumeDto> = async (formData, event) => {
    event?.preventDefault();

    try {
      if (type === 'new') {
        const { id } = await api
          .post('/resumes', {
            json: formData,
          })
          .json<Resume>();

        await navigate(`/resumes/${id}`);
        return;
      }

      await api.patch(`/resumes/${id}`, {
        json: formData,
      });

      mutate();
    } catch (error) {
      toast.add({
        type: 'error',
        ...getErrorToastContent(error),
      });
    }
  };

  return (
    <FormProvider {...methods}>
      <resumeLintContext.Provider value={lintFindings}>
        <form
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 grow"
        >
          <Tabs
            className="gap-8 grow"
            value={activeTab}
            onValueChange={(value) => setActiveTab(String(value))}
          >
            <div
              className={cn(
                "sticky z-[9] w-full before:content-[''] before:w-[calc(100%+24px)] before:bg-background before:border-b before:absolute before:-left-3 before:bottom-0 before:z-[-1] before:transition-[border-color,box-shadow]",
                type === 'edit'
                  ? 'top-36 md:top-32 before:-top-36 md:before:-top-32'
                  : 'top-24 md:top-20 before:-top-24 md:before:-top-20',
                isScrolled
                  ? 'before:border-border before:shadow-xl before:shadow-black/15 dark:before:shadow-black/50'
                  : 'before:border-transparent before:shadow-none',
              )}
            >
              <div className="relative w-full">
                <div
                  ref={tabsScrollRef}
                  onScroll={updateTabsScrollEdges}
                  className="overflow-x-auto w-full"
                >
                  <TabsList variant={'line'}>
                    {tabs.map(([tabKey, tabLabel]) => (
                      <TabsTrigger key={tabKey} value={tabKey}>
                        {errors.json?.[tabKey] && (
                          <Icon icon={AlertCircleIcon} className="text-red-400" />
                        )}
                        {tabLabel}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                <div
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background via-background/75 to-transparent shadow-[inset_18px_0_14px_-14px_rgb(0_0_0/0.25)] dark:shadow-[inset_18px_0_14px_-14px_rgb(0_0_0/0.75)] transition-opacity',
                    tabsScrollEdges.left ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <div
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background via-background/75 to-transparent shadow-[inset_-18px_0_14px_-14px_rgb(0_0_0/0.25)] dark:shadow-[inset_-18px_0_14px_-14px_rgb(0_0_0/0.75)] transition-opacity',
                    tabsScrollEdges.right ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </div>
            </div>
            <TabsContent value={TabKeys.PersonalInfo}>
              <PersonalInfoTab />
            </TabsContent>
            <TabsContent value={TabKeys.Skills}>
              <SkillsTab />
            </TabsContent>
            <TabsContent value={TabKeys.Experience}>
              <ExperienceTab />
            </TabsContent>
            <TabsContent value={TabKeys.Education}>
              <EducationTab />
            </TabsContent>
            <TabsContent value={TabKeys.Projects}>
              <ProjectsTab />
            </TabsContent>
            <TabsContent value={TabKeys.Summary}>
              <SummaryTab />
            </TabsContent>
          </Tabs>
          <div className="flex justify-between self-end sticky bottom-0 py-4 z-10 w-full before:content-[''] before:w-[calc(100%+24px)] before:bg-background before:border before:border-t-border before:border-transparent before:absolute before:-left-3 before:h-full before:top-0 before:z-[-1]">
            <div />
            <div className="flex gap-2 items-center">
              {isSubmitting && <Spinner className="size-4" />}
              {type === 'new' && (
                <Button
                  type="reset"
                  onClick={() => {
                    reset();
                    onNameChange?.(DEFAULT_RESUME_NAME);
                    localStorage.removeItem(NEW_RESUME_STORAGE_KEY);
                  }}
                  variant="secondary"
                >
                  Reset
                </Button>
              )}
              <Button variant="default" type="submit" disabled={isSubmitting}>
                {type === 'new' ? 'Save' : 'Update'}
              </Button>
            </div>
          </div>
        </form>
      </resumeLintContext.Provider>
    </FormProvider>
  );
}
