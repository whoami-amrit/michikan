import { type ClassValue, clsx } from 'clsx';
import ky, { isHTTPError } from 'ky';
import type { IProblemDetails } from 'shared';
import { mutate } from 'swr';
import { twMerge } from 'tailwind-merge';

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

export const CURRENT_USER_KEY = '/users/me';

export const resetCurrentUser = () => mutate(CURRENT_USER_KEY, undefined, { revalidate: false });

// Concurrent 401s share one refresh request instead of each firing their own
// (which would rotate the refresh token several times in parallel).
let refreshInFlight: Promise<unknown> | null = null;

const refreshSession = (): Promise<unknown> => {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = ky.get(`${API_PREFIX}/auth/refresh`).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
};

export const api = ky.create({
  prefix: API_PREFIX,
  hooks: {
    afterResponse: [
      async ({ response }) => {
        if (response.status === HttpStatus.UNAUTHORIZED) {
          try {
            await refreshSession();

            return ky.retry();
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

        return response;
      },
    ],
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
