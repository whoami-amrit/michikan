import { zodResolver } from '@hookform/resolvers/zod';
import ky from 'ky';
import { ArrowRightIcon, BriefcaseIcon, LoaderCircleIcon, UserIcon } from 'lucide-react';
import { useState } from 'react';
import {
  Controller,
  FieldErrors,
  FormProvider,
  SubmitHandler,
  useForm,
  useFormContext,
} from 'react-hook-form';
import { NavLink, useNavigate } from 'react-router';
import { ISignupDto, SignupSchema } from 'shared';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { API_PREFIX } from '@/lib/utils';

import { ErrorToast } from './error-toast';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Step, Stepper } from './ui/stepper';

const workSettingPreferenceOptions: {
  value: ISignupDto['userInfo']['preferredWorkSetting'];
  label: string;
}[] = [
  { value: 'REMOTE', label: 'Remote' },
  { value: 'ONSITE', label: 'Onsite' },
  { value: 'HYBRID', label: 'Hybrid' },
];

function WorkInfo({ errors }: { errors: FieldErrors<ISignupDto> }) {
  const { register, control } = useFormContext<ISignupDto>();

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>Years of Experience</FieldLabel>
        <Input
          {...register('userInfo.yearsOfExperience')}
          placeholder="5 Year(s) & 10 Month(s)"
          className="bg-background"
        />
        {errors.userInfo?.yearsOfExperience ? (
          <FieldError errors={[errors.userInfo.yearsOfExperience]} />
        ) : (
          <FieldDescription>
            Input your years of experience in X Year(s) & Y Month(s) format
          </FieldDescription>
        )}
      </Field>
      <Field>
        <FieldLabel>Preferred Work Setting</FieldLabel>
        <Controller
          name="userInfo.preferredWorkSetting"
          control={control}
          render={({ field }) => (
            <Select {...field} onValueChange={field.onChange} items={workSettingPreferenceOptions}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Preferred Work Setting</SelectLabel>
                  {workSettingPreferenceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.userInfo?.preferredWorkSetting]} />
      </Field>
      <Field>
        <FieldLabel>Salary Expectation</FieldLabel>
        <Input
          {...register('userInfo.salaryExpectation')}
          placeholder="Enter your salary expectation"
          className="bg-background"
        />
        {errors.userInfo?.salaryExpectation ? (
          <FieldError errors={[errors.userInfo.salaryExpectation]} />
        ) : (
          <FieldDescription>
            Use a range format like{' '}
            <span className="font-medium text-foreground">50k-100k USD / year</span> or{' '}
            <span className="font-medium text-foreground">30-50 EUR / hour</span>.
          </FieldDescription>
        )}
      </Field>
    </FieldGroup>
  );
}

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

type SectionType = 'userInfo' | 'workInfo';

const getUserInfoStepState = (section: SectionType, errors: FieldErrors<ISignupDto>) => {
  if (errors.userInfo?.email || errors.userInfo?.name || errors.password) {
    return 'error';
  }

  if (section === 'workInfo') {
    return 'completed';
  }

  return 'active';
};

const getWorkInfoStepState = (section: SectionType, errors: FieldErrors<ISignupDto>) => {
  if (
    errors.userInfo?.yearsOfExperience ||
    errors.userInfo?.preferredWorkSetting ||
    errors.userInfo?.salaryExpectation
  ) {
    return 'error';
  }

  if (section === 'userInfo') {
    return 'inactive';
  }

  return 'active';
};

export function SignupForm() {
  const methods = useForm<ISignupDto>({
    mode: 'onBlur',
    resolver: zodResolver(SignupSchema),
  });
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
  } = methods;

  const [section, setSection] = useState<SectionType>('userInfo');

  const navigate = useNavigate();

  const onSubmit: SubmitHandler<ISignupDto> = async (data) => {
    try {
      await ky.post(`${API_PREFIX}/auth/signup`, { json: data });
      await navigate('/analysis');
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

            <Stepper>
              <Step
                index={0}
                onClick={() => {
                  setSection('userInfo');
                }}
                IconComponent={UserIcon}
                state={getUserInfoStepState(section, errors)}
              />
              <Step
                index={1}
                onClick={() => {
                  setSection('workInfo');
                }}
                IconComponent={BriefcaseIcon}
                state={getWorkInfoStepState(section, errors)}
              />
            </Stepper>
          </div>

          {section === 'userInfo' ? <PersonalInfo errors={errors} /> : <WorkInfo errors={errors} />}

          <Field>
            {section === 'userInfo' ? (
              <Button
                type="button"
                onClick={() => {
                  setSection('workInfo');
                }}
                disabled={!!(errors.userInfo?.email ?? errors.userInfo?.name ?? errors.password)}
              >
                Next <ArrowRightIcon />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircleIcon className="size-4 animate-spin" />}
                Create Account
              </Button>
            )}
            <FieldDescription className="px-6 text-center">
              Already have an account? <NavLink to="/login">Log in</NavLink>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </FormProvider>
  );
}
