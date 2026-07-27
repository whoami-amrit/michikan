import { zodResolver } from '@hookform/resolvers/zod';
import ky from 'ky';
import { LoaderCircleIcon } from 'lucide-react';
import { FieldErrors, FormProvider, SubmitHandler, useForm, useFormContext } from 'react-hook-form';
import { NavLink, useNavigate } from 'react-router';
import { ISignupDto, SignupSchema } from 'shared';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { API_PREFIX } from '@/lib/utils';

import { ErrorToast } from './error-toast';

function PersonalInfo({ errors }: { errors: FieldErrors<ISignupDto> }) {
  const { register } = useFormContext<ISignupDto>();

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="name">Full Name</FieldLabel>
        <Input {...register('userInfo.name')} placeholder="John Doe" className="bg-background" />
        <FieldError errors={[errors.userInfo?.name]} />
      </Field>
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          {...register('userInfo.email')}
          placeholder="me@example.com"
          className="bg-background"
        />
        {errors.userInfo?.email ? (
          <FieldError errors={[errors.userInfo.email]} />
        ) : (
          <FieldDescription>
            We&apos;ll use this to contact you. We will not share your email with anyone else.
          </FieldDescription>
        )}
      </Field>
      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input {...register('password')} type="password" className="bg-background" />
        {errors.password ? (
          <FieldError errors={[errors.password]} />
        ) : (
          <FieldDescription>
            Use 8-16 characters including uppercase, lowercase, a number, and a special symbol
          </FieldDescription>
        )}
      </Field>
    </FieldGroup>
  );
}

export function SignupForm() {
  const methods = useForm<ISignupDto>({
    mode: 'onBlur',
    resolver: zodResolver(SignupSchema),
  });
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
  } = methods;

  const navigate = useNavigate();

  const onSubmit: SubmitHandler<ISignupDto> = async (data) => {
    try {
      await ky.post(`${API_PREFIX}/auth/signup`, { json: data });
      await navigate('/resumes');
    } catch (error) {
      toast.error(<ErrorToast error={error} />);
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Fill in the form below to create your account
            </p>
          </div>

          <PersonalInfo errors={errors} />

          <Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircleIcon className="size-4 animate-spin" />}
              Create Account
            </Button>
            <FieldDescription className="px-6 text-center">
              Already have an account? <NavLink to="/login">Log in</NavLink>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </FormProvider>
  );
}
