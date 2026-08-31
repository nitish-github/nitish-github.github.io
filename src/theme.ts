import { createTheme } from '@mui/material/styles'

export const appTheme = (mode: 'light' | 'dark' = 'light') => createTheme({
  palette: {
    mode,
    primary: {
      main: '#6d28d9',
    },
    secondary: {
      main: '#1d4ed8',
    },
    background: {
      default: mode === 'dark' ? '#111827' : '#f8fafc',
      paper: mode === 'dark' ? '#1f2937' : '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    body1: { lineHeight: 1.7 },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 12px 24px rgba(15, 23, 42, 0.06)',
        },
      },
    },
  },
})
