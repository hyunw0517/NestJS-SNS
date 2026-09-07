import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    // 인증 판정 전이므로 아직 리다이렉트하지 않는다 (새로고침 시 /login 깜빡임 방지).
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
