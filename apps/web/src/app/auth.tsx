import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import useSWRMutation from 'swr/mutation';

import authBg from '@/assets/auth-bg.webp';
import MichikanIcon from '@/assets/michikan-icon.svg?react';
import { ErrorToast } from '@/components/error-toast';
import { LoginForm } from '@/components/login-form';
import { SignupForm } from '@/components/signup-form';
import { api } from '@/lib/utils';

// todo: we can have a center spaced layout with redirecting to dashboard in 5 seconds
// todo: a beautiful bouquet for successful verification or something
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
    trigger()
      .then(() => api.get('/auth/refresh'))
      .catch((err: unknown) => {
        toast.error(<ErrorToast error={err} />);
      });
  }, [trigger]);

  if (isMutating) {
    return <div>Verifying email...</div>;
  }

  if (error) {
    return <div>Failed to verify email. Please try again. {JSON.stringify(error)}</div>;
  }

  return <div>Email verified successfully!</div>;
};

export function AuthFormPage({ type }: { type: 'login' | 'signup' }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center">
              <MichikanIcon />
            </div>
            Michikan
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{type === 'login' ? <LoginForm /> : <SignupForm />}</div>
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
