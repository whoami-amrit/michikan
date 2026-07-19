import { zodResolver } from '@hookform/resolvers/zod';
import { Resume } from 'db';
import { AlertCircle, PlusIcon, XIcon } from 'lucide-react';
import { useEffect } from 'react';
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
import { toast } from 'sonner';

import { ErrorToast } from '@/components/error-toast';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerSimple } from '@/components/ui/date-picker';
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
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { api, convertNullsToUndefined } from '@/lib/utils';

type ResumeFormProps =
  | {
      type: 'edit';
      id: string;
      data: ICreateResumeDto;
      mutate: () => void;
    }
  | {
      type: 'new';
      id?: never;
      data?: never;
      mutate?: never;
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
        <FieldGroup className="grid-cols-2 grid gap-4">
          <Field>
            <FieldLabel required>Name</FieldLabel>
            <Input
              {...register('json.personalInfo.name')}
              type="text"
              placeholder="John Doe"
              className="bg-background"
            />
            <FieldError errors={[errors.json?.personalInfo?.name]} />
          </Field>
          <Field>
            <FieldLabel required>Email</FieldLabel>
            <Input
              {...register('json.personalInfo.email')}
              placeholder="hello@world.me"
              className="bg-background"
            />
            <FieldError errors={[errors.json?.personalInfo?.email]} />
          </Field>
          <Field>
            <FieldLabel>Github or Gitlab</FieldLabel>
            <Input
              {...register('json.personalInfo.github')}
              placeholder="https://github.com/username"
              className="bg-background"
            />
            <FieldError errors={[errors.json?.personalInfo?.github]} />
          </Field>
          <Field>
            <FieldLabel>Phone</FieldLabel>
            <Input
              {...register('json.personalInfo.phone')}
              placeholder="123-456-7890"
              className="bg-background"
            />
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
            className="bg-background"
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
      <FieldSet>
        <FieldLegend>Skills</FieldLegend>
        <FieldDescription>
          Organize your technical skills by category
          <br /> Ex - Category: <code className="inline">Frontend</code> → Skills:{' '}
          <code className="inline">React, TypeScript, Tailwind CSS, Next.js</code>
          <br /> Or - Category: <code className="inline">Backend</code> → Skills:{' '}
          <code className="inline">Node.js, NestJS, PostgreSQL, Redis</code>
        </FieldDescription>
        <div className="flex justify-end">
          <Button onClick={() => append({ category: '', skills: '' })}>
            <PlusIcon />
            Add Category
          </Button>
        </div>
        {!!fields.length && (
          <FieldGroup className="flex-row gap-4">
            <Field className="w-50 shrink-0">
              <FieldLabel required>Category</FieldLabel>
            </Field>
            <Field className="grow">
              <FieldLabel required>Skills</FieldLabel>
            </Field>
          </FieldGroup>
        )}
        {fields.map((_, index) => (
          <FieldGroup key={index} className="flex-row gap-4">
            <Field className="w-50 shrink-0">
              <Input
                {...register(`json.skills.${index}.category`)}
                placeholder="Ex. Frontend"
                className="bg-background"
              />
              <FieldError errors={[errors.json?.skills?.[index]?.category]} />
            </Field>
            <Field className="grow">
              <Input
                {...register(`json.skills.${index}.skills`)}
                placeholder="React.js, Vite, Javascript, HTML, CSS"
              />
              <FieldError errors={[errors.json?.skills?.[index]?.skills]} />
            </Field>
            <Button className="w-8" variant="destructive" onClick={() => remove(index)}>
              <XIcon />
            </Button>
          </FieldGroup>
        ))}
      </FieldSet>
    </FieldGroup>
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
        <FieldLegend>Experience</FieldLegend>
        <FieldDescription>
          List your roles in reverse chronological order, and write each highlight using one of
          three tried-and-tested formats: STAR (Situation, Task, Action, Result), XYZ ("Accomplished
          [X] as measured by [Y], by doing [Z]"), or CAR (Challenge, Action, Result). Whichever you
          use, the goal is the same — show what you did, how you did it, and the measurable outcome,
          ideally with the metric placed early in the sentence for maximum impact. New to these
          formats? Here's where to start: <br />
          <br />
          <ul className="list-disc list-inside">
            <li>
              STAR method:&nbsp;
              <a
                href="https://www.levels.fyi/blog/applying-star-method-resumes.html"
                className="text-primary hover:underline-offset-4 hover:underline"
                referrerPolicy="no-referrer"
                target="_blank"
              >
                levels.fyi guide
              </a>
              ,&nbsp;
              <a
                href="https://resumegenius.com/blog/resume-help/star-method-resume"
                className="text-primary hover:underline-offset-4 hover:underline"
                referrerPolicy="no-referrer"
                target="_blank"
              >
                Resume Genius guide
              </a>
            </li>
            <li>
              XYZ method:&nbsp;
              <a
                href="https://www.inc.com/bill-murphy-jr/google-recruiters-say-these-5-resume-tips-including-x-y-z-formula-will-improve-your-odds-of-getting-hired-at-google.html"
                className="text-primary hover:underline-offset-4 hover:underline"
                referrerPolicy="no-referrer"
                target="_blank"
              >
                Google's recruiting team on the X-Y-Z formula
              </a>
              , &nbsp;
              <a
                href="https://elevenrecruiting.com/create-an-effective-resume-xyz-resume-format/"
                className="text-primary hover:underline-offset-4 hover:underline"
                referrerPolicy="no-referrer"
                target="_blank"
              >
                Eleven Recruiting guide
              </a>
            </li>
            <li>
              CAR method:&nbsp;
              <a
                href="https://ca.indeed.com/career-advice/resumes-cover-letters/challenge-action-result-resume"
                className="text-primary hover:underline-offset-4 hover:underline"
                referrerPolicy="no-referrer"
                target="_blank"
              >
                Indeed guide
              </a>
              , &nbsp;
              <a
                href="https://www.topresume.com/career-advice/how-to-get-more-results-with-a-car-resume"
                className="text-primary hover:underline-offset-4 hover:underline"
                referrerPolicy="no-referrer"
                target="_blank"
              >
                Top Resume guide
              </a>
            </li>
          </ul>
          <br />
          Once you've drafted your bullets, run them through Quillbot to paraphrase and tighten the
          wording — great for cutting a bullet down to one clean sentence without losing the
          substance
        </FieldDescription>
        <div className="flex justify-end">
          <Button
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
            <PlusIcon />
            Add Experience
          </Button>
        </div>
        {fields.map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>
                <Field className="w-64">
                  <FieldLabel required>Company</FieldLabel>
                  <Input
                    {...register(`json.experience.${index}.company`)}
                    placeholder="Ex. Google"
                    className="bg-background"
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
                  <XIcon />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel required>Job Title</FieldLabel>
                    <Input
                      {...register(`json.experience.${index}.title`)}
                      placeholder="Ex. Software Engineer"
                      className="bg-background"
                    />
                    <FieldError errors={[errors.json?.experience?.[index]?.title]} />
                  </Field>
                  <Field>
                    <FieldLabel>Location</FieldLabel>
                    <Input
                      {...register(`json.experience.${index}.location`)}
                      placeholder="Ex. San Francisco, CA"
                      className="bg-background"
                    />
                    <FieldError errors={[errors.json?.experience?.[index]?.location]} />
                  </Field>
                </div>
                <Field className="col-span-2">
                  <FieldLabel required>Highlights</FieldLabel>
                  <Textarea
                    className="max-h-44"
                    {...register(`json.experience.${index}.highlights`)}
                  />
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
                        <DatePickerSimple
                          {...field}
                          value={
                            field.value && typeof field.value === 'string'
                              ? new Date(field.value)
                              : undefined
                          }
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
                        <DatePickerSimple
                          {...field}
                          value={
                            field.value && typeof field.value === 'string'
                              ? new Date(field.value)
                              : undefined
                          }
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
        <FieldLegend>Education</FieldLegend>
        <FieldDescription>
          List degrees in reverse chronological order, most recent or highest first. Skip high
          school once you have a completed degree, and leave out coursework unless it's unusual or
          highly specialized for the role you're targeting.
        </FieldDescription>
        <div className="flex justify-end">
          <Button
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
            <PlusIcon />
            Add Qualification
          </Button>
        </div>
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
                      <DatePickerSimple
                        {...field}
                        value={
                          field.value && typeof field.value === 'string'
                            ? new Date(field.value)
                            : undefined
                        }
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
                  <XIcon />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel required>Degree</FieldLabel>
                    <Input
                      {...register(`json.education.${index}.degree`)}
                      placeholder="Ex. Bachelor of Science"
                      className="bg-background"
                      tabIndex={0}
                    />
                    <FieldError errors={[errors.json?.education?.[index]?.degree]} />
                  </Field>
                  <Field>
                    <FieldLabel required>Field of Study</FieldLabel>
                    <Input
                      {...register(`json.education.${index}.field`)}
                      placeholder="Ex. Computer Science"
                      className="bg-background"
                    />
                    <FieldError errors={[errors.json?.education?.[index]?.field]} />
                  </Field>
                </div>
                <div className="grid gird-cols-3 gap-4">
                  <Field className="col-span-2">
                    <FieldLabel required>Institution</FieldLabel>
                    <Input
                      {...register(`json.education.${index}.institution`)}
                      placeholder="Ex. Stanford University"
                      className="bg-background"
                    />
                    <FieldError errors={[errors.json?.education?.[index]?.institution]} />
                  </Field>
                  <Field>
                    <FieldLabel>GPA or CGPA or Special Remark</FieldLabel>
                    <Input
                      {...register(`json.education.${index}.specialRemark`)}
                      placeholder="3.75/4 or 9/10"
                      className="bg-background"
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
        <FieldLegend>Projects</FieldLegend>
        <FieldDescription>
          This section is for real, self-directed work — personal projects, student teams,
          open-source contributions — not assignments or projects from a job (those belong in
          Experience). Only include something here if it actually solves a problem and has real
          usage, even if that "user" is just you using it regularly; skip tutorial walkthroughs or
          one-off class exercises you haven't touched since submitting them.
          <br />
          <br />
          Write each highlight the same way you would for Experience — one accomplishment per line,
          action verb first, with a measurable result. This is your chance to show initiative the
          rest of your resume might not capture.
        </FieldDescription>
        <div className="flex justify-end">
          <Button
            onClick={() =>
              append({
                title: '',
                url: '',
                highlights: '',
                technologies: '',
              })
            }
          >
            <PlusIcon />
            Add Project
          </Button>
        </div>
        {fields.map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>
                <Field className="w-64">
                  <FieldLabel required>Project Title</FieldLabel>
                  <Input
                    {...register(`json.projects.${index}.title`)}
                    placeholder="Ex. Software Engineer"
                    className="bg-background"
                  />
                  <FieldError errors={[errors.json?.projects?.[index]?.title]} />
                </Field>
              </CardTitle>
              <CardAction>
                <Button variant="destructive" size="icon-sm" onClick={() => remove(index)}>
                  <XIcon />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid grid-cols-2">
                <Field className="col-span-2">
                  <FieldLabel required>Highlights</FieldLabel>
                  <Textarea
                    className="max-h-44"
                    {...register(`json.projects.${index}.highlights`)}
                  />
                  <FieldDescription>
                    Each new line becomes its own bullet point on your resume. Order them from most
                    impressive and relevant to least.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Technologies</FieldLabel>
                  <Input {...register(`json.projects.${index}.technologies`)} />
                </Field>
                <Field>
                  <FieldLabel>URL</FieldLabel>
                  <Input
                    {...register(`json.projects.${index}.url`)}
                    placeholder="Ex. https://github.com/user/project"
                    className="bg-background"
                  />
                  <FieldError errors={[errors.json?.projects?.[index]?.url]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        ))}
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
        <FieldLegend>Summary</FieldLegend>
        <FieldDescription>
          Only for senior/staff candidates, career changers, or explaining a gap — skip otherwise.
          Keep to 1–2 sentences focused on scope of impact, the pivot, or the gap — not generic
          traits like "hardworking" or "team player".
        </FieldDescription>

        <Field>
          <Textarea className="min-h-44 max-h-64" {...register('json.summary')} />
          <FieldError errors={[errors.json?.summary]} />
        </Field>
      </FieldSet>
    </FieldGroup>
  );
}

const LOCAL_STORAGE_KEY = 'new-resume-form';

const getDefaultNewFormValues = (): ICreateResumeDtoInput => {
  const unsavedFormState = localStorage.getItem(LOCAL_STORAGE_KEY);

  try {
    return JSON.parse(unsavedFormState!) as ICreateResumeDtoInput;
  } catch (error) {
    if (unsavedFormState) {
      console.log(error);
    }

    return {
      name: '',
      description: '',
      json: {
        personalInfo: {
          name: '',
          email: '',
          github: '',
          phone: '',
          portfolio: '',
        },
        skills: [],
        experience: [],
        projects: [],
        education: [],
        summary: '',
      },
    };
  }
};

export function ResumeForm({ type, data, id, mutate }: ResumeFormProps) {
  const navigate = useNavigate();
  const methods = useForm<ICreateResumeDtoInput, unknown, ICreateResumeDto>({
    defaultValues:
      type === 'new'
        ? getDefaultNewFormValues()
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
      toast.error(<ErrorToast error={error} />);
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6 grow"
      >
        <FieldGroup className="grid-cols-3 grid gap-4">
          <Field>
            <FieldLabel required>Name</FieldLabel>
            <Input
              disabled={type === 'edit'}
              {...methods.register('name')}
              placeholder="Enter resume name"
            />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field className="col-span-2">
            <FieldLabel>Description</FieldLabel>
            <Input {...methods.register('description')} placeholder="Enter resume description" />
            <FieldError errors={[errors.description]} />
          </Field>
        </FieldGroup>
        <Tabs className="gap-8 grow" defaultValue={TabKeys.PersonalInfo}>
          <TabsList variant={'line'}>
            {tabs.map(([tabKey, tabLabel]) => (
              <TabsTrigger key={tabKey} value={tabKey}>
                {errors.json?.[tabKey] && <AlertCircle className="text-red-400" />}
                {tabLabel}
              </TabsTrigger>
            ))}
          </TabsList>
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
        <div className="flex justify-between self-end sticky bottom-0 py-4 z-10 w-full after:content-[''] after:w-[calc(100%+24px)] after:bg-background after:absolute after:-left-3 after:h-full after:top-0 after:z-[-1]">
          {
            // TODO!: implement this feature
          }
          {type === 'new' && (
            <Progress value={50} className="w-76 gap-2">
              <ProgressLabel>Progress</ProgressLabel>
              <ProgressValue />
            </Progress>
          )}
          {type === 'edit' && <div />}
          <div className="flex gap-2 items-center">
            {isSubmitting && <Spinner className="size-4" />}
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
  );
}
