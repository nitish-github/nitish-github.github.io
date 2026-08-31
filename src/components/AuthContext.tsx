import { useEffect, useState } from 'react'
import { login as loginRequest, logout as logoutRequest, restoreSession, saveThemePreference } from '../services/localAuth'
import type { LocalUser, ThemeMode } from '../services/localAuth'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null)
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void restoreSession().then((session) => {
      if (session) {
        setUser(session.user)
        setThemeModeState(session.preferences.theme)
      }
      setIsLoading(false)
    })
  }, [])

  const login = async (email: string, password: string) => {
    const session = await loginRequest(email, password)
    setUser(session.user)
    setThemeModeState(session.preferences.theme)
  }

  const logout = async () => {
    await logoutRequest()
    setUser(null)
    setThemeModeState('light')
  }

  const setThemeMode = (theme: ThemeMode) => {
    setThemeModeState(theme)
    if (user) void saveThemePreference(theme)
  }

  return <AuthContext.Provider value={{ user, themeMode, isLoading, login, logout, setThemeMode }}>{children}</AuthContext.Provider>
}
