import { useEffect, useState, type ReactNode } from 'react'
import { login as loginApi, register as registerApi } from '@/api/auth'
import { getMe } from '@/api/users'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { subscribeAuthExpired } from '@/lib/authEvents'
import { queryClient } from '@/lib/queryClient'
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

  // apiClient가 refresh 실패로 토큰을 지운 경우, AuthContext의 user도 함께 비우고
  // (tokenStorage는 비로그인인데 user는 로그인 상태인 불일치 방지) 캐시도 정리한다 -
  // logout()과 동일하게, 이전 사용자 기준으로 계산된 isLiked/isFollowing 등이 남지 않게 한다.
  useEffect(() => {
    return subscribeAuthExpired(() => {
      setUser(null)
      queryClient.clear()
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
    // clearTokens()가 sessionEpoch을 올려서, 지금 이 순간 진행 중이던 자동 refresh가
    // 나중에 응답을 받아도 storage에 accessToken을 다시 쓰지 않는다(apiClient.ts 참고).
    clearTokens()
    setUser(null)

    // 서버에 세션/refreshToken을 무효화하는 별도 개념이 없는 순수 JWT 구조라(Backend에
    // logout/revoke endpoint 자체가 없음), 로그아웃은 클라이언트 상태 정리만으로 완결된다.
    // isLiked/isFollowing처럼 로그인한 사용자 기준으로 계산돼 캐시에 남아있는 값들을
    // 하나하나 무효화하는 대신, 전체를 비워 다음 로그인/비로그인 조회가 항상 서버에서
    // 새로 계산되게 한다.
    queryClient.clear()
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
