import { createContext, useContext } from 'react';

import type { IMainContext } from '@/lib/types';

export const mainContext = createContext<IMainContext | undefined>(undefined);

export const useMainContext = () => {
  const context = useContext(mainContext);
  if (!context) {
    throw new Error('useMainContext must be used within a MainContextProvider');
  }
  return context;
};
