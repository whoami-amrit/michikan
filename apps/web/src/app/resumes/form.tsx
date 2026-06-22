import { zodResolver } from '@hookform/resolvers/zod';
import { Resume } from 'db';
import { isHTTPError } from 'ky';
import { Plus, X } from 'lucide-react';
import {
  FormProvider,
  SubmitHandler,
  useFieldArray,
  useForm,
  useFormContext,
} from 'react-hook-form';
import { useNavigate } from 'react-router';
import {
  ICreateResumeDto,
  IProblemDetails,
  IResumeJson,
  IUpdateResumeDto,
  ResumeJsonSchema,
} from 'shared';
import { toast } from 'sonner';

import { ErrorToast } from '@/components/error-toast';
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
import { Input } from '@/components/ui/input';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/utils';

type ResumeFormProps =
  | {
      type: 'edit';
      id: string;
      data: IResumeJson;
    }
  | {
      type: 'new';
      id?: never;
      data?: never;
    };

enum TabsEnum {
  PersonalInfo = 'personal-info',
  Skills = 'skills',
  Experience = 'experience',
  Education = 'education',
  Projects = 'projects',
  Summary = 'summary',
}

function PersonalInfoTab() {
  const {
    register,
    formState: { errors },
  } = useFormContext<IResumeJson>();

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
        </FieldGroup>
        <FieldGroup className="grid-cols-2 grid gap-4">
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
    formState: { errors },
  } = useFormContext<IResumeJson>();
  const { fields, append, remove } = useFieldArray<IResumeJson, 'skills'>({
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
            <Plus />
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
                {...register(`skills.${index}.category` as const)}
                placeholder="Ex. Frontend"
                className="bg-background"
              />
              <FieldError errors={[errors.skills?.[index]?.category]} />
            </Field>
            <Field className="grow">
              <Input
                {...register(`skills.${index}.skills` as const)}
                placeholder="Ex. React, TypeScript, Tailwind CSS, Next.js"
                className="bg-background"
              />
              <FieldError errors={[errors.skills?.[index]?.skills]} />
            </Field>
            <Button className="w-8" variant="destructive" onClick={() => remove(index)}>
              <X />
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
    formState: { errors },
  } = useFormContext<IResumeJson>();
  const { fields, append, remove } = useFieldArray<IResumeJson, 'experience'>({
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
              })
            }
          >
            <Plus />
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
                    {...register(`experience.${index}.title` as const)}
                    placeholder="Ex. Software Engineer"
                    className="bg-background"
                  />
                  <FieldError errors={[errors.experience?.[index]?.title]} />
                </Field>
              </CardTitle>
              <CardAction>
                <Button variant="destructive" size="icon-sm" onClick={() => remove(index)}>
                  <X />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid-cols-2 grid gap-4 auto-rows-min">
                <Field>
                  <FieldLabel>Company</FieldLabel>
                  <Input
                    {...register(`experience.${index}.company` as const)}
                    placeholder="Ex. Google"
                    className="bg-background"
                  />
                  <FieldError errors={[errors.experience?.[index]?.company]} />
                </Field>
                <Field>
                  <FieldLabel>Location</FieldLabel>
                  <Input
                    {...register(`experience.${index}.location` as const)}
                    placeholder="Ex. San Francisco, CA"
                    className="bg-background"
                  />
                  <FieldError errors={[errors.experience?.[index]?.company]} />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel>Highlights</FieldLabel>
                  <Textarea {...register(`experience.${index}.description` as const)}></Textarea>
                </Field>
                <Field>
                  <FieldLabel>Start Date</FieldLabel>
                  <Input
                    {...register(`experience.${index}.startDate` as const)}
                    className="bg-background"
                  />
                  <FieldError errors={[errors.experience?.[index]?.startDate]} />
                </Field>
                <Field>
                  <FieldLabel>End Date</FieldLabel>
                  <Input
                    {...register(`experience.${index}.endDate` as const)}
                    className="bg-background"
                  />
                  <FieldError errors={[errors.experience?.[index]?.endDate]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        ))}
      </FieldSet>
    </FieldGroup>
  );
}

export function ResumeForm({ type, data, id }: ResumeFormProps) {
  const navigate = useNavigate();
  const methods = useForm({
    defaultValues: data,
    mode: 'onSubmit',
    resolver: zodResolver(ResumeJsonSchema),
  });
  const { handleSubmit } = methods;

  const onSubmit: SubmitHandler<IResumeJson> = async (formData) => {
    try {
      if (type === 'new') {
        const { id } = await api
          .post('/resumes', {
            json: {
              json: formData,
              name: 'test',
              description: 'Test resume',
            } satisfies ICreateResumeDto,
          })
          .json<Resume>();

        await navigate(`/resumes/${id}`);
        return;
      }

      await api.patch(`/resumes/${id}`, {
        json: {
          json: formData,
        } satisfies IUpdateResumeDto,
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
          onSubmit={void handleSubmit(onSubmit)}
          className="flex flex-col gap-6 max-w-2xl grow px-6 lg:px-0"
        >
          <Tabs className="gap-8 grow" defaultValue={TabsEnum.PersonalInfo}>
            <TabsList variant={'line'}>
              <TabsTrigger value={TabsEnum.PersonalInfo}>Personal Info</TabsTrigger>
              <TabsTrigger value={TabsEnum.Skills}>Skills</TabsTrigger>
              <TabsTrigger value={TabsEnum.Experience}>Experience</TabsTrigger>
              <TabsTrigger value={TabsEnum.Education}>Education</TabsTrigger>
              <TabsTrigger value={TabsEnum.Projects}>Projects</TabsTrigger>
              <TabsTrigger value={TabsEnum.Summary}>Summary</TabsTrigger>
            </TabsList>
            <TabsContent value={TabsEnum.PersonalInfo}>
              <PersonalInfoTab />
            </TabsContent>
            <TabsContent value={TabsEnum.Skills}>
              <SkillsTab />
            </TabsContent>
            <TabsContent value={TabsEnum.Experience}>
              <ExperienceTab />
            </TabsContent>
            <TabsContent value={TabsEnum.Education}>
              <div>Education</div>
            </TabsContent>
            <TabsContent value={TabsEnum.Projects}>
              <div>Projects</div>
            </TabsContent>
            <TabsContent value={TabsEnum.Summary}>
              <div>Summary</div>
            </TabsContent>
          </Tabs>
          <div className="flex justify-between self-end sticky bottom-0 bg-background py-4 shadow-lg shadow-black/10 w-full">
            <Progress value={50} className="w-76 gap-2">
              <ProgressLabel>Progress</ProgressLabel>
              <ProgressValue />
            </Progress>
            <Button>{type === 'new' ? 'Save' : 'Update'}</Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
