import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';

const lightPalette = {
  mode: 'light',
  primary: {
    main: '#ff3b37',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#2563eb',
    contrastText: '#ffffff',
  },
  background: {
    default: '#fff7f6',
    paper: '#ffffff',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
  },
  info: { main: '#0ea5e9' },
  success: { main: '#16a34a' },
  warning: { main: '#f59e0b' },
  error: { main: '#dc2626' },
  divider: 'rgba(15, 23, 42, 0.08)',
};

const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#ff7c79',
    contrastText: '#08111f',
  },
  secondary: {
    main: '#93c5fd',
    contrastText: '#082f49',
  },
  background: {
    default: '#08111f',
    paper: '#101a2f',
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
  },
  info: { main: '#38bdf8' },
  success: { main: '#4ade80' },
  warning: { main: '#fbbf24' },
  error: { main: '#f87171' },
  divider: 'rgba(148, 163, 184, 0.18)',
};

const getPalette = (mode) => (mode === 'dark' ? darkPalette : lightPalette);

const getBackdropGradient = (palette) => {
  if (palette.mode === 'dark') {
    return `
      radial-gradient(circle at top left, ${alpha(palette.primary.main, 0.18)}, transparent 32%),
      radial-gradient(circle at top right, ${alpha(palette.secondary.main, 0.16)}, transparent 28%),
      ${palette.background.default}
    `;
  }

  return `
    radial-gradient(circle at top left, ${alpha(palette.primary.main, 0.1)}, transparent 32%),
    radial-gradient(circle at top right, ${alpha(palette.secondary.main, 0.08)}, transparent 28%),
    ${palette.background.default}
  `;
};

export const getMetaThemeColor = (mode) => (mode === 'dark' ? '#08111f' : '#fff7f6');

export const createAppTheme = (mode = 'light') => {
  const palette = getPalette(mode);
  const elevatedShadow = palette.mode === 'dark'
    ? '0 20px 48px rgba(2, 6, 23, 0.38)'
    : '0 20px 48px rgba(15, 23, 42, 0.08)';
  const softShadow = palette.mode === 'dark'
    ? '0 12px 30px rgba(2, 6, 23, 0.3)'
    : '0 12px 30px rgba(15, 23, 42, 0.06)';

  const baseTheme = createTheme({
    palette,
    shape: {
      borderRadius: 20,
    },
    typography: {
      fontFamily: "'Josefin Sans', sans-serif",
      h1: {
        fontWeight: 800,
        letterSpacing: '-0.03em',
        lineHeight: 1.05,
      },
      h2: {
        fontWeight: 800,
        letterSpacing: '-0.03em',
        lineHeight: 1.08,
      },
      h3: {
        fontWeight: 800,
        letterSpacing: '-0.02em',
        lineHeight: 1.12,
      },
      h4: {
        fontWeight: 700,
        lineHeight: 1.16,
      },
      h5: {
        fontWeight: 700,
        lineHeight: 1.2,
      },
      h6: {
        fontWeight: 700,
        lineHeight: 1.25,
      },
      subtitle1: {
        fontWeight: 700,
        lineHeight: 1.35,
      },
      body1: {
        lineHeight: 1.7,
      },
      body2: {
        lineHeight: 1.65,
      },
      button: {
        fontWeight: 700,
        textTransform: 'none',
        letterSpacing: '0.01em',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            colorScheme: mode,
          },
          html: {
            scrollBehavior: 'smooth',
            backgroundColor: palette.background.default,
          },
          body: {
            background: getBackdropGradient(palette),
            backgroundColor: palette.background.default,
            color: palette.text.primary,
            transition: 'background-color 180ms ease, color 180ms ease',
          },
          '#root': {
            minHeight: '100vh',
          },
          '::selection': {
            backgroundColor: alpha(palette.primary.main, palette.mode === 'dark' ? 0.4 : 0.18),
          },
          '::-webkit-scrollbar': {
            width: 10,
            height: 10,
          },
          '::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(palette.text.primary, palette.mode === 'dark' ? 0.28 : 0.18),
            borderRadius: 999,
            border: '2px solid transparent',
            backgroundClip: 'padding-box',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(palette.background.paper, palette.mode === 'dark' ? 0.9 : 0.92),
            border: `1px solid ${palette.divider}`,
            backdropFilter: 'blur(18px)',
            boxShadow: palette.mode === 'dark'
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
            backgroundColor: alpha(palette.background.paper, palette.mode === 'dark' ? 0.98 : 0.98),
            boxShadow: elevatedShadow,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            paddingInline: 16,
            minHeight: 42,
          },
          containedPrimary: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          outlined: {
            borderColor: alpha(palette.text.primary, palette.mode === 'dark' ? 0.18 : 0.12),
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: alpha(palette.background.paper, palette.mode === 'dark' ? 0.98 : 0.98),
            backgroundImage: 'none',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 700,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: palette.divider,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            boxShadow: softShadow,
          },
        },
      },
    },
    customShadows: {
      elevated: elevatedShadow,
      soft: softShadow,
    },
  });

  return responsiveFontSizes(baseTheme);
};
