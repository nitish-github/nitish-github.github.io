import { createContext, useContext } from 'react'
import type { LocalUser, ThemeMode } from './localAuth'

export type AuthContextValue = {
  user: LocalUser | null
  themeMode: ThemeMode
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setThemeMode: (theme: ThemeMode) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
