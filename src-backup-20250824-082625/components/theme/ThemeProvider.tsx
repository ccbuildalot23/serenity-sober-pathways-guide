
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  _storageKey?: string;
};

type ThemeProviderState = {
  _theme: Theme;
  setTheme: (_theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  _theme: 'system',
  setTheme: () => null,
};

const _ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  _storageKey = 'ui-_theme',
  ...props
}: ThemeProviderProps) {
  const [_theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(_storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (_theme === 'system') {
      const _systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(_systemTheme);
      return;
    }

    root.classList.add(_theme);
  }, [_theme]);

  const value = {
    _theme,
    setTheme: (_theme: Theme) => {
      localStorage.setItem(_storageKey, _theme);
      setTheme(_theme);
    },
  };

  return (
    <_ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </_ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(_ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
