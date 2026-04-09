import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';

const lightPalette = {
  mode: 'light',
  primary: { main: '#ff2625' },
  secondary: { main: '#2563eb' },
  background: {
    default: '#fff8f8',
    paper: '#ffffff',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
  },
  success: { main: '#16a34a' },
  warning: { main: '#f59e0b' },
  error: { main: '#dc2626' },
  divider: 'rgba(15, 23, 42, 0.08)',
};

const darkPalette = {
  mode: 'dark',
  primary: { main: '#ff6b6a' },
  secondary: { main: '#60a5fa' },
  background: {
    default: '#07111f',
    paper: '#0f172a',
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
  },
  success: { main: '#22c55e' },
  warning: { main: '#fbbf24' },
  error: { main: '#f87171' },
  divider: 'rgba(148, 163, 184, 0.18)',
};

export const getMetaThemeColor = (mode) => (mode === 'dark' ? '#07111f' : '#fff8f8');

const getPalette = (mode) => (mode === 'dark' ? darkPalette : lightPalette);

export const createAppTheme = (mode = 'light') => {
  const palette = getPalette(mode);
  const baseTheme = createTheme({
    palette,
    shape: { borderRadius: 18 },
    typography: {
      fontFamily: "'Josefin Sans', sans-serif",
      h1: { fontWeight: 800 },
      h2: { fontWeight: 800 },
      h3: { fontWeight: 800 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { fontWeight: 700, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            colorScheme: mode,
          },
          html: {
            scrollBehavior: 'smooth',
          },
          body: {
            backgroundColor: palette.background.default,
            color: palette.text.primary,
            transition: 'background-color 180ms ease, color 180ms ease',
          },
          '#root': {
            minHeight: '100vh',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(palette.background.paper, mode === 'dark' ? 0.88 : 0.92),
            border: `1px solid ${palette.divider}`,
            boxShadow: mode === 'dark'
              ? '0 18px 42px rgba(2, 6, 23, 0.42)'
              : '0 18px 42px rgba(15, 23, 42, 0.08)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${palette.divider}`,
            boxShadow: mode === 'dark'
              ? '0 20px 48px rgba(2, 6, 23, 0.34)'
              : '0 20px 48px rgba(15, 23, 42, 0.08)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          containedPrimary: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: palette.background.paper,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
          },
        },
      },
    },
  });

  return responsiveFontSizes(baseTheme);
};
