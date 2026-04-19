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

const isBrowser = () => typeof window !== 'undefined';

const getStoredMode = () => {
  if (!isBrowser()) {
    return null;
  }

  const storedMode = window.localStorage.getItem(STORAGE_KEY);

  if (storedMode === 'light' || storedMode === 'dark') {
    return storedMode;
  }

  return null;
};

const getInitialMode = () => {
  const storedMode = getStoredMode();

  if (storedMode) {
    return storedMode;
  }

  if (!isBrowser()) {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyThemeMetadata = (mode) => {
  if (!isBrowser()) {
    return;
  }

  document.body.dataset.colorMode = mode;
  document.documentElement.dataset.colorMode = mode;
  document.documentElement.style.colorScheme = mode;

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', getMetaThemeColor(mode));
  }

  window.dispatchEvent(new CustomEvent('gym:theme-mode-changed', { detail: { mode } }));
};

const temporarilyDisableTransitions = () => {
  if (!isBrowser()) {
    return () => {};
  }

  const style = document.createElement('style');
  style.setAttribute('data-theme-mode-guard', 'true');
  style.innerHTML = '*{transition:none !important;}';
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    requestAnimationFrame(() => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    });
  };
};

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    if (!isBrowser()) {
      return undefined;
    }

    window.localStorage.setItem(STORAGE_KEY, mode);
    const cleanup = temporarilyDisableTransitions();
    applyThemeMetadata(mode);

    return cleanup;
  }, [mode]);

  useEffect(() => {
    if (!isBrowser()) {
      return undefined;
    }

    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      if (event.newValue === 'light' || event.newValue === 'dark') {
        setMode(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const value = useMemo(() => ({
    mode,
    isDarkMode: mode === 'dark',
    setMode,
    toggleMode: () => {
      setMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark'));
    },
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
