import ky from 'ky';
import { LoaderCircleIcon } from 'lucide-react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { NavLink, useNavigate } from 'react-router';
import { ILoginDto } from 'shared';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { API_PREFIX } from '@/lib/utils';

import { ErrorToast } from './error-toast';

export function LoginForm() {
  const navigate = useNavigate();

  const methods = useForm<ILoginDto>({
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const {
    formState: { errors, isSubmitting },
    register,
    handleSubmit,
  } = methods;

  const onSubmit: SubmitHandler<ILoginDto> = async (data) => {
    try {
      // NOTE: api has a retry hook that will refresh the token if it is expired
      // and redirect to /login; so we should use ky directly here otherwise it
      // will cause a page reload
      await ky.post(`${API_PREFIX}/auth/login`, { json: data });
      await navigate('/analysis');
    } catch (error) {
      toast.error(<ErrorToast error={error} />);
    }
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input {...register('email')} placeholder="m@example.com" />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            {
              // todo: handle forgot password case
            }
            <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
              Forgot your password?
            </a>
          </div>
          <Input {...register('password')} placeholder="••••••••" />
          <FieldError errors={[errors.password]} />
        </Field>
        <Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircleIcon className="size-4 animate-spin" />}
            Login
          </Button>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{' '}
            <NavLink to="/signup" className="underline underline-offset-4">
              Sign up
            </NavLink>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
