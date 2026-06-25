import { zodResolver } from '@hookform/resolvers/zod';
import { Resume } from 'db';
import { isHTTPError } from 'ky';
import { AlertCircle, PencilSparklesIcon, PlusIcon, XIcon } from 'lucide-react';
import {
  Controller,
  FormProvider,
  SubmitHandler,
  useFieldArray,
  useForm,
  useFormContext as useRHFFormContext,
} from 'react-hook-form';
import { useNavigate } from 'react-router';
import {
  CreateResumeSchema,
  ICreateResumeDto,
  ICreateResumeDtoInput,
  IProblemDetails,
  IResumeJson,
  IResumeJsonInput,
} from 'shared';
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
import { MultiSelect } from '@/components/ui/multi-select';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/utils';

type ResumeFormProps =
  | {
      type: 'edit';
      id: string;
      data: ICreateResumeDto;
    }
  | {
      type: 'new';
      id?: never;
      data?: never;
    };

const useFormContext = () => useRHFFormContext<IResumeJsonInput, unknown, IResumeJson>();

const TabKeys: Record<string, keyof IResumeJsonInput> = {
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
            <FieldLabel>Name</FieldLabel>
            <Input
              {...register('personalInfo.name')}
              type="text"
              placeholder="John Doe"
              className="bg-background"
            />
            <FieldError errors={[errors.personalInfo?.name]} />
          </Field>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              {...register('personalInfo.email')}
              placeholder="hello@world.me"
              className="bg-background"
            />
            <FieldError errors={[errors.personalInfo?.email]} />
          </Field>
          <Field>
            <FieldLabel>Github or Gitlab</FieldLabel>
            <Input
              {...register('personalInfo.github')}
              placeholder="https://github.com/username"
              className="bg-background"
            />
            <FieldError errors={[errors.personalInfo?.github]} />
          </Field>
          <Field>
            <FieldLabel>LinkedIn</FieldLabel>
            <Input
              {...register('personalInfo.linkedin')}
              placeholder="https://linkedin.com/in/username"
              className="bg-background"
            />
            <FieldError errors={[errors.personalInfo?.linkedin]} />
          </Field>
          <Field>
            <FieldLabel>Phone</FieldLabel>
            <Input
              {...register('personalInfo.phone')}
              placeholder="123-456-7890"
              className="bg-background"
            />
            <FieldError errors={[errors.personalInfo?.phone]} />
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
        <FieldGroup className="grid-cols-2 grid gap-4">
          <Field>
            <FieldLabel>Url</FieldLabel>
            <Input
              {...register('personalInfo.portfolio.url')}
              placeholder="https://your-portfolio.com"
              className="bg-background"
            />
            <FieldError errors={[errors.personalInfo?.portfolio?.url]} />
          </Field>
          <Field>
            <FieldLabel>Label</FieldLabel>
            <Input
              {...register('personalInfo.portfolio.label')}
              placeholder="A label for your portfolio link"
              className="bg-background"
            />
            <FieldError errors={[errors.personalInfo?.portfolio?.label]} />
          </Field>
        </FieldGroup>
      </FieldSet>
    </FieldGroup>
  );
}

function SkillsTab() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();
  const { fields, append, remove } = useFieldArray<IResumeJsonInput, 'skills'>({
    name: 'skills',
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
          <Button onClick={() => append({ category: '', skills: [] })}>
            <PlusIcon />
            Add Category
          </Button>
        </div>
        {!!fields.length && (
          <FieldGroup className="flex-row gap-4">
            <Field className="w-50 shrink-0">
              <FieldLabel>Category</FieldLabel>
            </Field>
            <Field className="grow">
              <FieldLabel>Skills</FieldLabel>
            </Field>
          </FieldGroup>
        )}
        {fields.map((field, index) => (
          <FieldGroup key={field.category} className="flex-row gap-4">
            <Field className="w-50 shrink-0">
              <Input
                {...register(`skills.${index}.category`)}
                placeholder="Ex. Frontend"
                className="bg-background"
              />
              <FieldError errors={[errors.skills?.[index]?.category]} />
            </Field>
            <Field className="grow">
              <Controller
                name={`skills.${index}.skills`}
                control={control}
                render={({ field }) => <MultiSelect {...field} items={['React.js', 'Nuxt.js']} />}
              />
              <FieldError errors={[errors.skills?.[index]?.skills]} />
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
  const { fields, append, remove } = useFieldArray<IResumeJsonInput, 'experience'>({
    name: 'experience',
  });

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>Experience</FieldLegend>
        <FieldDescription>Add your non-internship work experience.</FieldDescription>
        <div className="flex justify-end">
          <Button
            onClick={() =>
              append({
                title: '',
                company: '',
                highlights: [],
                isCurrentRole: false,
                startDate: '',
                endDate: '',
                location: '',
                description: '',
              })
            }
          >
            <PlusIcon />
            Add Experience
          </Button>
        </div>
        {fields.map((field, index) => (
          <Card key={field.title}>
            <CardHeader>
              <CardTitle>
                <Field className="w-64">
                  <FieldLabel>Job Title</FieldLabel>
                  <Input
                    {...register(`experience.${index}.title`)}
                    placeholder="Ex. Software Engineer"
                    className="bg-background"
                  />
                  <FieldError errors={[errors.experience?.[index]?.title]} />
                </Field>
              </CardTitle>
              <CardAction>
                <Button variant="destructive" size="icon-sm" onClick={() => remove(index)}>
                  <XIcon />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Company</FieldLabel>
                    <Input
                      {...register(`experience.${index}.company`)}
                      placeholder="Ex. Google"
                      className="bg-background"
                    />
                    <FieldError errors={[errors.experience?.[index]?.company]} />
                  </Field>
                  <Field>
                    <FieldLabel>Location</FieldLabel>
                    <Input
                      {...register(`experience.${index}.location`)}
                      placeholder="Ex. San Francisco, CA"
                      className="bg-background"
                    />
                    <FieldError errors={[errors.experience?.[index]?.location]} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <Input
                    {...register(`experience.${index}.description`)}
                    placeholder="Ex. Worked as a software engineer on the frontend team, building user interfaces for web applications."
                    className="bg-background"
                  />
                  <FieldError errors={[errors.experience?.[index]?.description]} />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel>Highlights</FieldLabel>
                  <Controller
                    name={`experience.${index}.highlights`}
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        className="max-h-44"
                        {...field}
                        value={field.value?.join?.('\n')}
                        onChange={(e) => field.onChange(e.target.value.split('\n'))}
                      />
                    )}
                  />
                </Field>
                <div className="flex gap-4">
                  <Field className="w-44">
                    <FieldLabel>Start Date</FieldLabel>
                    <Controller
                      name={`experience.${index}.startDate`}
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
                    <FieldError errors={[errors.experience?.[index]?.startDate]} />
                  </Field>
                  <Field className="w-44">
                    <FieldLabel>End Date</FieldLabel>
                    <Controller
                      name={`experience.${index}.endDate`}
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
                    <FieldError errors={[errors.experience?.[index]?.endDate]} />
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
  const { fields, append, remove } = useFieldArray<IResumeJsonInput, 'education'>({
    name: 'education',
  });

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>Education</FieldLegend>
        <FieldDescription>
          Add details of your educational background. Your most recent and relevant qualifications.
        </FieldDescription>
        <div className="flex justify-end">
          <Button
            onClick={() =>
              append({
                degree: '',
                field: '',
                institution: '',
                graduationDate: '',
              })
            }
          >
            <PlusIcon />
            Add Qualification
          </Button>
        </div>
        {fields.map((field, index) => (
          <Card key={field.degree}>
            <CardHeader>
              <CardTitle>
                <Field className="w-44">
                  <FieldLabel>Graduation Date</FieldLabel>
                  <Controller
                    name={`education.${index}.graduationDate`}
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
                  <FieldError errors={[errors.education?.[index]?.graduationDate]} />
                </Field>
              </CardTitle>
              <CardAction>
                <Button variant="destructive" size="icon-sm" onClick={() => remove(index)}>
                  <XIcon />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Degree</FieldLabel>
                    <Input
                      {...register(`education.${index}.degree`)}
                      placeholder="Ex. Bachelor of Science"
                      className="bg-background"
                    />
                    <FieldError errors={[errors.education?.[index]?.degree]} />
                  </Field>
                  <Field>
                    <FieldLabel>Field of Study</FieldLabel>
                    <Input
                      {...register(`education.${index}.field`)}
                      placeholder="Ex. Computer Science"
                      className="bg-background"
                    />
                    <FieldError errors={[errors.education?.[index]?.field]} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Institution</FieldLabel>
                  <Input
                    {...register(`education.${index}.institution`)}
                    placeholder="Ex. Stanford University"
                    className="bg-background"
                  />
                  <FieldError errors={[errors.education?.[index]?.institution]} />
                </Field>
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
    control,
    formState: { errors },
  } = useFormContext();
  const { fields, append, remove } = useFieldArray<IResumeJsonInput, 'projects'>({
    name: 'projects',
  });

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>Projects</FieldLegend>
        <FieldDescription>Add your relevant projects.</FieldDescription>
        <div className="flex justify-end">
          <Button
            onClick={() =>
              append({
                title: '',
                description: '',
                url: '',
                highlights: [],
                technologies: [],
              })
            }
          >
            <PlusIcon />
            Add Project
          </Button>
        </div>
        {fields.map((field, index) => (
          <Card key={field.title}>
            <CardHeader>
              <CardTitle>
                <Field className="w-64">
                  <FieldLabel>Project Title</FieldLabel>
                  <Input
                    {...register(`projects.${index}.title`)}
                    placeholder="Ex. Software Engineer"
                    className="bg-background"
                  />
                  <FieldError errors={[errors.projects?.[index]?.title]} />
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
                  <FieldLabel>Description</FieldLabel>
                  <Input
                    {...register(`projects.${index}.description`)}
                    placeholder="Ex. Developed a web application for managing tasks"
                    className="bg-background"
                  />
                  <FieldError errors={[errors.projects?.[index]?.description]} />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel>Highlights</FieldLabel>
                  <Controller
                    name={`projects.${index}.highlights`}
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        className="max-h-44"
                        {...field}
                        value={field.value?.join?.('\n')}
                        onChange={(e) => field.onChange(e.target.value.split('\n'))}
                      />
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel>Technologies</FieldLabel>
                  <Controller
                    name={`projects.${index}.technologies`}
                    control={control}
                    render={({ field }) => (
                      <MultiSelect {...field} items={['React.js', 'Nuxt.js']} />
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel>URL</FieldLabel>
                  <Input
                    {...register(`projects.${index}.url`)}
                    placeholder="Ex. https://github.com/user/project"
                    className="bg-background"
                  />
                  <FieldError errors={[errors.projects?.[index]?.url]} />
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
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>Summary</FieldLegend>
        <FieldDescription>
          Provide a brief summary of your professional background, skills, and career goals. This
          section should be concise and highlight your key strengths and achievements. Or you could
          let our AI assist you in writing a summary as per the details you have provided so far.
        </FieldDescription>

        <Field>
          <div className="relative">
            <Textarea className="min-h-44 max-h-64" {...register('summary')} />
            <Button className="absolute bottom-2 right-2" variant="secondary" size="icon-lg">
              {/* TODO!: implement this AI summary feature in the backend */}
              <PencilSparklesIcon />
            </Button>
          </div>
          <FieldError errors={[errors.summary]} />
        </Field>
      </FieldSet>
    </FieldGroup>
  );
}

export function ResumeForm({ type, data, id }: ResumeFormProps) {
  const navigate = useNavigate();
  const methods = useForm<ICreateResumeDtoInput, unknown, ICreateResumeDto>({
    defaultValues:
      type === 'new'
        ? {
            name: '',
            description: '',
            json: {
              personalInfo: {
                name: '',
                email: '',
                github: '',
                linkedin: '',
                phone: '',
              },
              skills: [],
              experience: [],
              projects: [],
              education: [],
              summary: '',
            },
          }
        : data,
    mode: 'onBlur',
    resolver: zodResolver(CreateResumeSchema),
  });
  const {
    handleSubmit,
    formState: { errors },
  } = methods;

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
    } catch (error) {
      if (isHTTPError(error)) {
        const problemDetails = error.data as IProblemDetails;
        toast.error(<ErrorToast problem={problemDetails} />);
      }

      toast.error('An error occurred while saving the resume. Please try again. ' + String(error));
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
          <FieldGroup className="grid-cols-3 grid gap-4">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input {...methods.register('name')} placeholder="Enter resume name" />
            </Field>
            <Field className="col-span-2">
              <FieldLabel>Description</FieldLabel>
              <Input {...methods.register('description')} placeholder="Enter resume description" />
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
          <div className="flex justify-between self-end sticky bottom-0 bg-background py-4 shadow-lg shadow-black/10 w-full">
            {
              // TODO!: implement this feature
            }
            <Progress value={50} className="w-76 gap-2">
              <ProgressLabel>Progress</ProgressLabel>
              <ProgressValue />
            </Progress>
            <div className="flex gap-2">
              <Button type="reset" variant="secondary">
                Reset
              </Button>
              <Button type="submit">{type === 'new' ? 'Save' : 'Update'}</Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
