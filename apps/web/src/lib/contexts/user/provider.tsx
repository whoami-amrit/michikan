import { isHTTPError } from 'ky';
import { Navigate } from 'react-router';
import { IUserResponse } from 'shared';
import useSWR from 'swr';

import { Spinner } from '@/components/ui/spinner';
import { HttpStatus } from '@/lib/constants';
import { api } from '@/lib/utils';

import { userContext } from './hook';

export const UserContextProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    isLoading,
    data: user,
    error,
  } = useSWR<IUserResponse, Error>('/users/me', {
    fetcher: async () => await api.get('/users/me').json<IUserResponse>(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen w-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (isHTTPError(error) && error.response.status === HttpStatus.NOT_FOUND) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    console.error(error);
    throw error;
  }

  return <userContext.Provider value={user ?? null}>{children}</userContext.Provider>;
};
