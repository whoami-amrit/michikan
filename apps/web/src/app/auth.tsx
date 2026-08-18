import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { RefreshCwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { IUserResponse } from 'shared';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import authBg from '@/assets/auth-bg.webp';
import MichikanIcon from '@/assets/michikan-icon.svg?react';
import { LoginForm } from '@/components/login-form';
import { SignupForm } from '@/components/signup-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { api, getErrorToastContent } from '@/lib/utils';

const RESEND_OTP_COOLDOWN = 60;

export const VerifyEmailPage = () => {
  const [otpValue, setOtpValue] = useState<string>('');
  const [resendTime, setResendTime] = useState(RESEND_OTP_COOLDOWN);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // note: can't use useUserContext here, out of scope
  const { isLoading: isUserDetailLoading, data: user } = useSWR<IUserResponse, Error>('/users/me', {
    fetcher: async () => await api.get('/users/me').json<IUserResponse>(),
  });

  const navigate = useNavigate();

  const startResendInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      setResendTime(RESEND_OTP_COOLDOWN);
    }
    intervalRef.current = setInterval(
      () =>
        setResendTime((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
          }
          return prev - 1;
        }),
      1000,
    );
  };

  useEffect(() => {
    startResendInterval();
    return () => {
      clearInterval(intervalRef.current!);
    };
  }, []);

  const { isMutating, trigger } = useSWRMutation('/auth/verify-otp', async (url: string) => {
    await api.post(url, { json: { otp: otpValue } });
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    trigger()
      .then(() => navigate('/resumes'))
      .catch((error) => {
        toast.add({
          type: 'error',
          ...getErrorToastContent(error),
        });
      });
  };

  if (user?.verified) {
    return <Navigate to="/resumes" replace />;
  }

  return (
    <div className="flex flex-col min-h-svh p-6 md:items-center">
      <div className="flex flex-col grow gap-4 w-full">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="https://www.michikan.dev" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center">
              <MichikanIcon />
            </div>
            Michikan
          </a>
        </div>
        <form onSubmit={onSubmit} className="flex flex-1 items-center grow justify-center">
          <Card className="mx-auto max-w-md">
            {isUserDetailLoading ? (
              <>
                <CardHeader>
                  <CardTitle>
                    <Skeleton className="h-6 w-18" />
                  </CardTitle>
                  <CardDescription>
                    <Skeleton className="h-4 w-32" />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-60" />
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>Verify your email</CardTitle>
                  <CardDescription>
                    Enter the verification code we sent to your email address:{' '}
                    <span className="font-medium">{user?.email}</span>.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="otp-verification">Verification code</FieldLabel>
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={resendTime > 0}
                        onClick={() => {
                          startResendInterval();
                          api.post('/auth/resend-otp').catch((error) => {
                            toast.add({
                              type: 'error',
                              ...getErrorToastContent(error),
                            });
                          });
                        }}
                      >
                        <RefreshCwIcon />
                        Resend {resendTime > 0 ? `in ${resendTime}` : 'code'}
                      </Button>
                    </div>
                    <InputOTP
                      maxLength={6}
                      id="otp-verification"
                      required
                      pattern={REGEXP_ONLY_DIGITS}
                      onChange={(value) => {
                        setOtpValue(value);
                      }}
                    >
                      <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator className="mx-2" />
                      <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </Field>
                </CardContent>
              </>
            )}
            <CardFooter>
              <Field>
                <Button
                  disabled={isUserDetailLoading || isMutating || otpValue.length !== 6}
                  type="submit"
                  className="w-full"
                  size="lg"
                >
                  {isMutating && <Spinner />}
                  Verify
                </Button>
                <div className="text-sm text-muted-foreground">
                  Having trouble signing in?{' '}
                  <a
                    href="#"
                    className="underline underline-offset-4 transition-colors hover:text-primary"
                  >
                    Contact support
                  </a>
                </div>
              </Field>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
};

export function AuthFormPage({ type }: { type: 'login' | 'signup' }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="https://www.michikan.dev" className="flex items-center gap-2 font-medium">
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
