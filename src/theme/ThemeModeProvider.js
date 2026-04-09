import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';

import { createAppTheme, getMetaThemeColor } from './themeFactory';

const STORAGE_KEY = 'checkers-gym-color-mode';
const ThemeModeContext = createContext({
  mode: 'light',
  isDarkMode: false,
  setMode: () => {},
  toggleMode: () => {},
});

const getInitialMode = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedMode = window.localStorage.getItem(STORAGE_KEY);
  if (storedMode === 'light' || storedMode === 'dark') {
    return storedMode;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    window.localStorage.setItem(STORAGE_KEY, mode);
    document.body.dataset.colorMode = mode;
    document.documentElement.dataset.colorMode = mode;

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', getMetaThemeColor(mode));
    }

    return undefined;
  }, [mode]);

  const value = useMemo(() => ({
    mode,
    isDarkMode: mode === 'dark',
    setMode,
    toggleMode: () => setMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark')),
  }), [mode]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => useContext(ThemeModeContext);
