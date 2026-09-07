import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'

function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default PublicOnlyRoute
