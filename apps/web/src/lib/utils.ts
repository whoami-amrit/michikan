import { type ClassValue, clsx } from 'clsx';
import ky, { isHTTPError } from 'ky';
import type { IProblemDetails } from 'shared';
import { twMerge } from 'tailwind-merge';

import { toast } from '@/components/ui/toast';

import { HttpStatus } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_PREFIX = '/api/v1';

export const getErrorToastContent = (
  error: unknown,
): {
  title: string;
  description: string;
} => {
  if (!isHTTPError(error)) {
    return {
      title: 'Something went wrong',
      description: 'Please try again.',
    };
  }

  const problem = error.data as IProblemDetails | undefined;

  const title = problem?.title ?? 'Request failed';

  const description = Array.isArray(problem?.detail)
    ? problem.detail.filter(Boolean).join('. ')
    : (problem?.detail ?? error.response.statusText) || 'Please try again.';

  return { title, description };
};

export const api = ky.create({
  prefix: API_PREFIX,
  hooks: {
    afterResponse: [
      async ({ response }) => {
        if (response.status === HttpStatus.UNAUTHORIZED) {
          try {
            await ky.get(`${API_PREFIX}/auth/refresh`);

            return response;
          } catch (refreshError) {
            if (!isHTTPError(refreshError)) {
              throw refreshError;
            }

            if (refreshError.response.status !== HttpStatus.UNAUTHORIZED) {
              throw refreshError;
            }

            document.cookie = '';
            window.location.href = '/login';
            return response;
          }
        }

        if (response.status === HttpStatus.FORBIDDEN) {
          toast.add({
            type: 'warning',
            title: 'Verify your email to continue',
            description: 'Some features stay locked until your email is verified.',
          });
        }

        return response;
      },
    ],
  },
  retry: {
    limit: 1, // Limit retries to 1 to avoid infinite loops
    statusCodes: [HttpStatus.UNAUTHORIZED],
  },
});

export const convertNullsToUndefined = (object: unknown): unknown => {
  if (object === null) {
    return undefined;
  }

  if (typeof object !== 'object' || Array.isArray(object)) {
    return object;
  }

  if (Array.isArray(object)) {
    return object.map(convertNullsToUndefined);
  }

  const copy: Record<string, unknown> = {};

  Object.keys(object).forEach((key) => {
    copy[key] = convertNullsToUndefined((object as Record<string, unknown>)[key]);
  });

  return copy;
};
