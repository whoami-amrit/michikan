import { isHTTPError } from 'ky';
import { GalleryVerticalEnd } from 'lucide-react';
import type { SubmitEvent } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router';
import type { IProblemDetails, IUserResponse } from 'shared';
import { toast } from 'sonner';
import useSWRMutation from 'swr/mutation';

import authBg from '@/assets/auth-bg.webp';
import { ErrorToast } from '@/components/error-toast';
import { LoginForm } from '@/components/login-form';
import { SignupForm } from '@/components/signup-form';
import { useMainContext } from '@/lib/contexts/main/hook';
import { api } from '@/lib/utils';

export const VerifyEmailPage = () => {
  const [params] = useSearchParams();

  const { error, isMutating, trigger } = useSWRMutation<void, undefined>(
    '/verify-email',
    async () => {
      await api.post('/auth/verify-email', {
        searchParams: { token: params.get('token') ?? undefined },
      });
    },
  );

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    trigger().catch(() => {});
  }, [trigger]);

  if (isMutating) {
    return <div>Verifying email...</div>;
  }

  if (error) {
    return <div>Failed to verify email. Please try again. {JSON.stringify(error)}</div>;
  }

  return <div>Email verified successfully!</div>;
};

const getLoginPayload = (formData: FormData) => ({
  email: formData.get('email') as string,
  password: formData.get('password') as string,
});

const getSignupPayload = (formData: FormData) => ({
  name: formData.get('name') as string,
  email: formData.get('email') as string,
  password: formData.get('password') as string,
});

export function AuthFormPage({ type }: { type: 'login' | 'signup' }) {
  const navigate = useNavigate();
  const { setState } = useMainContext();

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);

    // prevent refresh
    e.preventDefault();

    const json = (type === 'login' ? getLoginPayload : getSignupPayload)(formData);

    api
      .post(`/auth/${type}`, {
        json,
      })
      .then(() => api.get<IUserResponse>('/users/me').json())
      .then((user) => {
        console.log('user', user);
        setState((prev) => ({ ...prev, user }));
      })
      .then(() => navigate('/analysis'))
      .catch((err) => {
        if (isHTTPError(err)) {
          const problemDetails = err.data as IProblemDetails;
          toast.error(<ErrorToast problem={problemDetails} />);
        }
      });
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Michikan
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {type === 'login' ? (
              <LoginForm onSubmit={onSubmit} />
            ) : (
              <SignupForm onSubmit={onSubmit} />
            )}
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src={authBg}
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-50"
        />
      </div>
    </div>
  );
}
