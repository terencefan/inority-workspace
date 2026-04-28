import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import './index.css'
import App from './App.jsx'

const THEME_MODE_STORAGE_KEY = 'handbook.themeMode'

function readInitialThemeMode() {
  if (typeof window === 'undefined') {
    return 'dark'
  }
  const storedMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)
  return storedMode === 'light' ? 'light' : 'dark'
}

function createBaseTheme(mode) {
  const isDark = mode === 'dark'
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#4ea1ff',
      },
      secondary: {
        main: '#56b6c2',
      },
      background: {
        default: isDark ? '#1e1e1e' : '#f3f6fb',
        paper: isDark ? '#252526' : '#ffffff',
      },
      text: {
        primary: isDark ? '#d4d4d4' : '#142033',
        secondary: isDark ? '#9da5b4' : '#58657a',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.1)',
      success: {
        main: '#73c991',
      },
    },
    shape: {
      borderRadius: 0,
    },
    typography: {
      fontFamily: [
        'IBM Plex Sans',
        'Inter',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'sans-serif',
      ].join(','),
      h1: {
        fontSize: '2.45rem',
        lineHeight: 1.08,
        fontWeight: 800,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontSize: '1.85rem',
        lineHeight: 1.14,
        fontWeight: 760,
        letterSpacing: '-0.015em',
      },
      h3: {
        fontSize: '1.45rem',
        lineHeight: 1.22,
        fontWeight: 720,
      },
      h4: {
        fontSize: '1.15rem',
        lineHeight: 1.28,
        fontWeight: 700,
      },
      h5: {
        fontSize: '1.45rem',
        lineHeight: 1.2,
        fontWeight: 700,
      },
      h6: {
        fontSize: '1rem',
        lineHeight: 1.2,
        fontWeight: 700,
      },
      body1: {
        fontSize: '0.95rem',
        lineHeight: 1.55,
      },
      body2: {
        fontSize: '0.84rem',
        lineHeight: 1.5,
      },
      overline: {
        fontSize: '0.68rem',
        lineHeight: 1.2,
        letterSpacing: '0.12em',
        fontWeight: 700,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            colorScheme: mode,
          },
          body: {
            letterSpacing: '0.01em',
            backgroundColor: isDark ? '#1e1e1e' : '#f3f6fb',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            borderRadius: 0,
          },
        },
      },
      MuiCard: {
        defaultProps: {
          raised: false,
        },
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundImage: 'none',
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: {
            padding: '12px 14px 8px',
          },
          avatar: {
            marginRight: 10,
          },
          title: {
            fontSize: '0.96rem',
          },
          subheader: {
            fontSize: '0.74rem',
            lineHeight: 1.4,
            color: isDark ? '#7f8794' : '#64748b',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 14,
            '&:last-child': {
              paddingBottom: 14,
            },
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          regular: {
            minHeight: '64px !important',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 0,
            minHeight: 34,
            padding: '6px 12px',
            textTransform: 'none',
            fontWeight: 600,
          },
          sizeSmall: {
            minHeight: 28,
            padding: '4px 10px',
          },
          contained: {
            background: '#0e639c',
            '&:hover': {
              background: '#1177bb',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            height: 24,
          },
          label: {
            paddingLeft: 8,
            paddingRight: 8,
            fontSize: '0.72rem',
            fontWeight: 600,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundColor: isDark ? '#1f1f1f' : '#f8fafc',
          },
          input: {
            paddingTop: 9,
            paddingBottom: 9,
          },
          notchedOutline: {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.14)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 0,
          },
        },
      },
    },
  })
}

function buildTheme(mode) {
  const baseTheme = createBaseTheme(mode)
  return createTheme(baseTheme, {
  handbookMarkdown: {
    body: {
      lineHeight: 1.8,
      blockSpacing: 2,
    },
    headings: {
      scrollMarginTop: '96px',
      levels: {
        1: { mt: 0, mb: 2.5, border: true },
        2: { mt: 5, mb: 2.25, border: true },
        3: { mt: 4, mb: 1.75, border: false },
        4: { mt: 3, mb: 1.5, border: false },
        5: { mt: 2.5, mb: 1.25, border: false },
        6: { mt: 2, mb: 1, border: false },
      },
      active: {
        color: baseTheme.palette.primary.light,
        accent: alpha(baseTheme.palette.primary.main, 0.14),
        outline: alpha(baseTheme.palette.primary.main, 0.3),
      },
    },
    inlineCode: {
      background: alpha(baseTheme.palette.primary.main, 0.08),
      border: alpha(baseTheme.palette.primary.main, 0.18),
    },
    codeBlock: {
      background: baseTheme.palette.mode === 'dark' ? '#111827' : '#eef4fb',
      border: alpha(
        baseTheme.palette.mode === 'dark' ? baseTheme.palette.common.white : '#0f172a',
        baseTheme.palette.mode === 'dark' ? 0.08 : 0.08,
      ),
      shadow: `inset 0 0 0 1px ${alpha(
        baseTheme.palette.mode === 'dark' ? baseTheme.palette.common.white : '#0f172a',
        baseTheme.palette.mode === 'dark' ? 0.02 : 0.03,
      )}`,
    },
    blockquote: {
      border: alpha(baseTheme.palette.primary.main, 0.9),
      background: alpha(baseTheme.palette.primary.main, 0.08),
      text: baseTheme.palette.mode === 'dark' ? '#cfe4ff' : '#163b73',
      title: baseTheme.palette.mode === 'dark' ? '#eff6ff' : '#0f172a',
      variants: {
        note: {
          border: alpha(baseTheme.palette.info.main, 0.92),
          background: alpha(baseTheme.palette.info.main, 0.12),
          text: baseTheme.palette.mode === 'dark' ? '#dbeafe' : '#15426b',
          title: baseTheme.palette.mode === 'dark' ? '#eff6ff' : '#0f172a',
        },
        tip: {
          border: alpha(baseTheme.palette.success.main, 0.92),
          background: alpha(baseTheme.palette.success.main, 0.12),
          text: baseTheme.palette.mode === 'dark' ? '#dcfce7' : '#14532d',
          title: baseTheme.palette.mode === 'dark' ? '#f0fdf4' : '#052e16',
        },
        important: {
          border: alpha('#f59e0b', 0.94),
          background: alpha('#f59e0b', 0.12),
          text: baseTheme.palette.mode === 'dark' ? '#fef3c7' : '#78350f',
          title: baseTheme.palette.mode === 'dark' ? '#fffbeb' : '#451a03',
        },
        warning: {
          border: alpha(baseTheme.palette.warning.main, 0.94),
          background: alpha(baseTheme.palette.warning.main, 0.12),
          text: baseTheme.palette.mode === 'dark' ? '#fde68a' : '#78350f',
          title: baseTheme.palette.mode === 'dark' ? '#fffbeb' : '#451a03',
        },
        caution: {
          border: alpha(baseTheme.palette.error.main, 0.94),
          background: alpha(baseTheme.palette.error.main, 0.12),
          text: baseTheme.palette.mode === 'dark' ? '#fecaca' : '#7f1d1d',
          title: baseTheme.palette.mode === 'dark' ? '#fef2f2' : '#450a0a',
        },
      },
    },
    table: {
      border: alpha(
        baseTheme.palette.mode === 'dark' ? baseTheme.palette.common.white : '#0f172a',
        baseTheme.palette.mode === 'dark' ? 0.08 : 0.12,
      ),
      headerBackground: alpha(
        baseTheme.palette.mode === 'dark' ? baseTheme.palette.common.white : '#0f172a',
        baseTheme.palette.mode === 'dark' ? 0.04 : 0.03,
      ),
      rowStripe: alpha(
        baseTheme.palette.mode === 'dark' ? baseTheme.palette.common.white : '#0f172a',
        baseTheme.palette.mode === 'dark' ? 0.015 : 0.018,
      ),
    },
    toc: {
      activeText: baseTheme.palette.mode === 'dark' ? baseTheme.palette.common.white : '#0f172a',
      activeBackground: alpha(baseTheme.palette.primary.main, 0.12),
      activeBorder: alpha(baseTheme.palette.primary.main, 0.34),
      branchText: baseTheme.palette.mode === 'dark' ? '#dbeafe' : '#1d4ed8',
      text: baseTheme.palette.mode === 'dark' ? '#b9c1cd' : '#475569',
      progressTrack: alpha(
        baseTheme.palette.mode === 'dark' ? baseTheme.palette.common.white : '#0f172a',
        baseTheme.palette.mode === 'dark' ? 0.08 : 0.1,
      ),
      progressFill: baseTheme.palette.primary.main,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '.markdown-body [data-heading-active="true"]': {
          color: baseTheme.palette.primary.light,
        },
      },
    },
  },
})
}

function AppRoot() {
  const [themeMode, setThemeMode] = useState(readInitialThemeMode)
  const theme = useMemo(() => buildTheme(themeMode), [themeMode])

  useEffect(() => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode)
  }, [themeMode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'))}
      />
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
)
