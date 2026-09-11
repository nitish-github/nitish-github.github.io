export type ThemeMode = 'light' | 'dark'

export type LocalUser = {
  id: string
  email: string
}

type AuthResponse = {
  user: LocalUser
  token: string
  preferences: { theme: ThemeMode }
}

const apiBase = 'http://localhost:3001'
const tokenKey = 'article-app-session'

export function getAuthToken(): string | null {
  return localStorage.getItem(tokenKey)
}

export function setAuthToken(token: string | null): void {
  if (token) localStorage.setItem(tokenKey, token)
  else localStorage.removeItem(tokenKey)
}

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Authentication request failed')
  return response.json() as Promise<T>
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await authRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setAuthToken(response.token)
  return response
}

export async function restoreSession(): Promise<{ user: LocalUser; preferences: { theme: ThemeMode } } | null> {
  if (!getAuthToken()) return null
  try {
    return await authRequest('/api/auth/me')
  } catch {
    setAuthToken(null)
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await authRequest('/api/auth/logout', { method: 'POST' })
  } finally {
    setAuthToken(null)
  }
}

export async function saveThemePreference(theme: ThemeMode): Promise<void> {
  await authRequest('/api/auth/preferences', {
    method: 'PUT',
    body: JSON.stringify({ theme }),
  })
}
