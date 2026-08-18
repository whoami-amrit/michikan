import { useEffect, useMemo, useState } from 'react';

import type { IMainState } from '@/lib/types';

import { mainContext } from './hook';

const appThemeStorageKey = 'app-theme';

const getInitTheme = () => {
  const localTheme = localStorage.getItem(appThemeStorageKey) as IMainState['theme'];
  if (!localTheme) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return localTheme;
};

export const MainContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<IMainState>(() => ({
    theme: getInitTheme(),
  }));

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');
    root.classList.add(state.theme);

    if (state.theme !== localStorage.getItem(appThemeStorageKey)) {
      localStorage.setItem(appThemeStorageKey, state.theme);
    }
  }, [state.theme]);

  const value = useMemo(() => ({ state, setState }), [state]);

  return <mainContext.Provider value={value}>{children}</mainContext.Provider>;
};
