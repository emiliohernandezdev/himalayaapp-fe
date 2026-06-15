import { alpha, createTheme } from '@mui/material/styles'
import type { PaletteMode } from '@mui/material/styles'

export const himalayaPalette = {
  light: {
    background: '#f5f9fd',
    surface: '#ffffff',
    surfaceSoft: '#eef7ff',
    surfaceMuted: '#e3f0fa',
    primary: '#075985',
    primaryDark: '#0c4a6e',
    primaryLight: '#38bdf8',
    secondary: '#0369a1',
    accent: '#0f766e',
    success: '#047857',
    warning: '#b45309',
    error: '#b42318',
    text: '#0f172a',
    textMuted: '#475569',
    border: '#cfe1ef',
    actionHover: '#e0f2fe',
  },
  dark: {
    background: '#07111f',
    surface: '#0c1b2a',
    surfaceSoft: '#10283d',
    surfaceMuted: '#14344d',
    primary: '#7dd3fc',
    primaryDark: '#38bdf8',
    primaryLight: '#bae6fd',
    secondary: '#60a5fa',
    accent: '#5eead4',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#fb7185',
    text: '#f8fafc',
    textMuted: '#b6c7d6',
    border: '#24435b',
    actionHover: '#12314a',
  },
} as const

export function createHimalayaTheme(mode: PaletteMode) {
  const palette = himalayaPalette[mode]
  const isLight = mode === 'light'

  return createTheme({
    palette: {
      mode,
      primary: {
        main: palette.primary,
        light: palette.primaryLight,
        dark: palette.primaryDark,
        contrastText: isLight ? '#ffffff' : '#052033',
      },
      secondary: {
        main: palette.secondary,
        light: isLight ? '#7dd3fc' : '#93c5fd',
        dark: isLight ? '#075985' : '#2563eb',
        contrastText: isLight ? '#ffffff' : '#06111f',
      },
      success: {
        main: palette.success,
        contrastText: isLight ? '#ffffff' : '#06281d',
      },
      warning: {
        main: palette.warning,
        contrastText: isLight ? '#ffffff' : '#251a02',
      },
      error: {
        main: palette.error,
        contrastText: '#ffffff',
      },
      background: {
        default: palette.background,
        paper: palette.surface,
      },
      text: {
        primary: palette.text,
        secondary: palette.textMuted,
      },
      divider: palette.border,
      action: {
        hover: palette.actionHover,
        selected: alpha(palette.primary, isLight ? 0.12 : 0.2),
        disabled: alpha(palette.textMuted, 0.45),
        disabledBackground: alpha(palette.textMuted, 0.16),
      },
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      h1: {
        fontWeight: 800,
        letterSpacing: 0,
      },
      h2: {
        fontWeight: 800,
        letterSpacing: 0,
      },
      h3: {
        fontWeight: 800,
        letterSpacing: 0,
      },
      h4: {
        fontWeight: 750,
        letterSpacing: 0,
      },
      h5: {
        fontWeight: 750,
        letterSpacing: 0,
      },
      h6: {
        fontWeight: 750,
        letterSpacing: 0,
      },
      subtitle1: {
        fontWeight: 700,
      },
      button: {
        fontWeight: 750,
        textTransform: 'none',
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            minHeight: 40,
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${palette.border}`,
            boxShadow: isLight
              ? '0 10px 30px rgba(15, 23, 42, 0.06)'
              : '0 10px 30px rgba(0, 0, 0, 0.28)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 700,
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
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
    },
  })
}
