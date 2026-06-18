import { IUserResponse } from 'shared';
import useSWR from 'swr';

import { api } from '@/lib/utils';

import { userContext } from './hook';

export const UserContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: user, error } = useSWR<IUserResponse, Error>('/users/me', {
    fetcher: () => api.get('/users/me').json<IUserResponse>(),
  });

  if (error) {
    console.error(error);
    throw error;
  }

  return <userContext.Provider value={user ?? null}>{children}</userContext.Provider>;
};
