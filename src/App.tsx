import { CssBaseline, ThemeProvider } from '@mui/material'
import { useMemo } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage'
import { ArticleAppShell } from './pages/ArticleAppShell'
import { ArticleHomePage } from './pages/ArticleHomePage'
import { appTheme } from './theme'
import { AuthProvider } from './components/AuthContext'
import { useAuth } from './components/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'

function AppContent() {
  const { themeMode } = useAuth()
  const theme = useMemo(() => appTheme(themeMode), [themeMode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route path="/" element={<ArticleAppShell />}>
            <Route index element={<ArticleHomePage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="admin" element={<AdminPage />} />
              <Route path="my-articles/:category" element={<ArticleHomePage />} />
              <Route path="my-articles/:category/:slug" element={<ArticleHomePage />} />
            </Route>
            <Route path=":category" element={<ArticleHomePage />} />
            <Route path=":category/:slug" element={<ArticleHomePage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>
}

export default App
