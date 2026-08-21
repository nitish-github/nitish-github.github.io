import { CssBaseline, ThemeProvider } from '@mui/material'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage'
import { ArticleAppShell } from './pages/ArticleAppShell'
import { ArticleHomePage } from './pages/ArticleHomePage'
import { appTheme } from './theme'

function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route path="/" element={<ArticleAppShell />}>
            <Route index element={<Navigate to="/admin" replace />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path=":category" element={<ArticleHomePage />} />
            <Route path=":category/:slug" element={<ArticleHomePage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App
