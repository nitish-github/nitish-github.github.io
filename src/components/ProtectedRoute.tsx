import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const outletContext = useOutletContext<unknown>()

  if (isLoading) return null
  return user ? <Outlet context={outletContext} /> : <Navigate to="/" replace state={{ from: location.pathname }} />
}
