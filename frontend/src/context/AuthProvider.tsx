import { useEffect, useState, type ReactNode } from 'react'
import { login as loginApi, register as registerApi } from '@/api/auth'
import { getMe } from '@/api/users'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { subscribeAuthExpired } from '@/lib/authEvents'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/lib/tokenStorage'
import type { LoginRequest, RegisterRequest } from '@/types/auth'
import type { CurrentUser } from '@/types/user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 앱 최초 mount 시 저장된 토큰으로 로그인 상태 복구.
  // accessToken이 만료돼 있어도 apiClient가 401 → refresh를 알아서 처리하므로
  // 여기서는 getMe() 결과만 보고 판단한다.
  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const hasToken = Boolean(getAccessToken() || getRefreshToken())

      if (!hasToken) {
        setIsLoading(false)
        return
      }

      try {
        const currentUser = await getMe()

        if (!cancelled) {
          setUser(currentUser)
        }
      } catch {
        // 초기 복구 실패는 "비로그인 상태"로 조용히 처리한다 (사용자에게 에러 노출 X).
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  // apiClient가 refresh 실패로 토큰을 지운 경우, AuthContext의 user도 함께 비워
  // "tokenStorage는 비로그인인데 user는 로그인 상태"인 불일치를 막는다.
  useEffect(() => {
    return subscribeAuthExpired(() => {
      setUser(null)
    })
  }, [])

  async function login(payload: LoginRequest) {
    const tokens = await loginApi(payload)
    setTokens(tokens)

    const currentUser = await getMe()
    setUser(currentUser)

    return currentUser
  }

  async function register(payload: RegisterRequest) {
    const tokens = await registerApi(payload)
    setTokens(tokens)

    const currentUser = await getMe()
    setUser(currentUser)

    return currentUser
  }

  function logout() {
    clearTokens()
    setUser(null)
  }

  // Profile 수정 등 이후 재조회 용도. 초기 세션 복구와 달리 실패를 삼키지 않고
  // 그대로 throw해 호출한 쪽이 처리하도록 한다.
  async function refreshUser() {
    const currentUser = await getMe()
    setUser(currentUser)

    return currentUser
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
