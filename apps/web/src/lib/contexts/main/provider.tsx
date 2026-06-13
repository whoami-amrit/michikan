import { useEffect, useMemo, useState } from 'react';

import type { IMainState } from '@/lib/types';

import { mainContext } from './hook';

const appThemeStorageKey = 'app-theme';

export const MainContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<IMainState>({
    user: null,
    theme: (localStorage.getItem(appThemeStorageKey) ?? 'system') as IMainState['theme'],
  });

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (state.theme !== localStorage.getItem(appThemeStorageKey)) {
      localStorage.setItem(appThemeStorageKey, state.theme);
    }

    if (state.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(state.theme);
  }, [state.theme]);

  const value = useMemo(() => ({ state, setState }), [state]);

  return <mainContext.Provider value={value}>{children}</mainContext.Provider>;
};
