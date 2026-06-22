import { zodResolver } from '@hookform/resolvers/zod';
import { Resume } from 'db';
import { isHTTPError } from 'ky';
import { SubmitHandler, useForm } from 'react-hook-form';
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
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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

export function ResumeForm({ type, data, id }: ResumeFormProps) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: data,
    mode: 'onSubmit',
    resolver: zodResolver(ResumeJsonSchema),
  });

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
    <div className="flex justify-center">
      <form onSubmit={void handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-2xl grow">
        <FieldGroup>
          <FieldLabel>Personal Information</FieldLabel>
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
            <FieldLabel>Summary</FieldLabel>
            <Input
              {...register('personalInfo.summary')}
              type="text"
              placeholder="Brief summary of your professional background"
              className="bg-background"
            />
            <FieldError errors={[errors.personalInfo?.summary]} />
          </Field>
          <FieldGroup>
            <FieldLabel>Contact Information</FieldLabel>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                {...register('personalInfo.contact.email')}
                placeholder="hello@world.me"
                className="bg-background"
              />
              <FieldError errors={[errors.personalInfo?.contact?.email]} />
            </Field>
            <Field>
              <FieldLabel>Github</FieldLabel>
              <Input
                {...register('personalInfo.contact.github')}
                placeholder="https://github.com/username"
                className="bg-background"
              />
              <FieldError errors={[errors.personalInfo?.contact?.github]} />
            </Field>
            <Field>
              <FieldLabel>LinkedIn</FieldLabel>
              <Input
                {...register('personalInfo.contact.linkedin')}
                placeholder="https://linkedin.com/in/username"
                className="bg-background"
              />
              <FieldError errors={[errors.personalInfo?.contact?.linkedin]} />
            </Field>
            <FieldGroup>
              <FieldLabel>Portfolio</FieldLabel>
              <Field>
                <FieldLabel>Url</FieldLabel>
                <Input
                  {...register('personalInfo.contact.portfolio.url')}
                  placeholder="https://your-portfolio.com"
                  className="bg-background"
                />
                <FieldError errors={[errors.personalInfo?.contact?.portfolio?.url]} />
              </Field>
              <Field>
                <FieldLabel>Label</FieldLabel>
                <Input
                  {...register('personalInfo.contact.portfolio.label')}
                  placeholder="A label for your portfolio link"
                  className="bg-background"
                />
                <FieldError errors={[errors.personalInfo?.contact?.portfolio?.label]} />
              </Field>
            </FieldGroup>
          </FieldGroup>
        </FieldGroup>
        <FieldSeparator />
        <FieldGroup>
          <FieldLabel>Skills</FieldLabel>
        </FieldGroup>
        <div className="flex justify-end">
          <Button type="submit">Submit</Button>
        </div>
      </form>
    </div>
  );
}
