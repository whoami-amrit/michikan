import { createContext, useContext } from 'react';
import { IUserResponse } from 'shared';

export const userContext = createContext<IUserResponse | null>(null);

export const useUserContext = () => {
  const context = useContext(userContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  return context;
};
