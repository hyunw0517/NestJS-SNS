import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { refreshAccessToken } from '@/api/auth'
import { emitAuthExpired } from '@/lib/authEvents'
import { clearTokens, getAccessToken, getRefreshToken, getSessionEpoch, setAccessToken } from '@/lib/tokenStorage'

const BASE_URL = '/api'

// 로그인 / 회원가입 / 토큰 재발급처럼 accessToken을 자동 첨부하거나
// 401 발생 시 자동 refresh 대상이 되면 안 되는 요청 전용 instance.
// apiClient의 interceptor와 완전히 분리해 헤더 충돌·재귀 호출 가능성을 원천 차단한다.
export const authClient = axios.create({
  baseURL: BASE_URL,
})

export const apiClient = axios.create({
  baseURL: BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// 이 API들은 apiClient를 거치지 않는 것이 원칙이지만(authClient 사용),
// 방어적으로 여기서도 자동 refresh 대상에서 명시적으로 제외한다.
const REFRESH_EXCLUDED_PATHS = [
  '/auth/login/email',
  '/auth/register/email',
  '/auth/token/access',
  '/auth/token/refresh',
]

function isRefreshExcludedUrl(url?: string) {
  if (!url) {
    return false
  }

  return REFRESH_EXCLUDED_PATHS.some((path) => url.includes(path))
}

// 동시에 여러 요청이 401을 받아도 accessToken 재발급은 한 번만 수행되도록
// 진행 중인 refresh Promise를 모듈 레벨에서 공유한다(single-flight).
let refreshPromise: Promise<string> | null = null

function refreshAccessTokenOnce(refreshToken: string) {
  if (!refreshPromise) {
    // 이 refresh가 시작된 시점의 epoch. 응답이 도착했을 때 epoch이 그대로면(그 사이
    // 로그아웃/재로그인이 없었으면) storage에 반영하고, 바뀌었다면 이미 무효한 세션에
    // 대한 응답이므로 버린다(tokenStorage.ts의 sessionEpoch 주석 참고).
    const epochAtStart = getSessionEpoch()

    refreshPromise = refreshAccessToken(refreshToken)
      .then((accessToken) => {
        if (getSessionEpoch() === epochAtStart) {
          setAccessToken(accessToken)
        }

        return accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

function extractBearerToken(authHeader: unknown) {
  if (typeof authHeader !== 'string') {
    return undefined
  }

  const [scheme, token] = authHeader.split(' ')

  return scheme === 'Bearer' ? token : undefined
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { config, response } = error

    if (!config || response?.status !== 401) {
      return Promise.reject(error)
    }

    const retryableConfig = config as RetryableAxiosRequestConfig

    if (retryableConfig._retry || isRefreshExcludedUrl(retryableConfig.url)) {
      return Promise.reject(error)
    }

    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      return Promise.reject(error)
    }

    retryableConfig._retry = true

    // 이 요청이 실제로 보냈던(=401을 유발한) accessToken.
    // single-flight로 refresh를 기다리는 동안 "다른 요청이 이미 refresh를 끝내고
    // storage의 accessToken을 갱신"해 둔 경우, 이 값과 현재 storage 값이 달라진다.
    const failedAccessToken = extractBearerToken(retryableConfig.headers.Authorization)

    try {
      const currentAccessToken = getAccessToken()

      // 대기하는 사이 이미 새 accessToken이 저장돼 있다면, 굳이 또 refresh를
      // 요청하지 않고 그 값을 바로 재사용한다(늦게 도착한 401에 대한 불필요한 refresh 방지).
      const newAccessToken =
        currentAccessToken && currentAccessToken !== failedAccessToken
          ? currentAccessToken
          : await refreshAccessTokenOnce(refreshToken)

      retryableConfig.headers.Authorization = `Bearer ${newAccessToken}`

      return apiClient(retryableConfig)
    } catch (refreshError) {
      clearTokens()
      // refreshToken까지 무효해 재로그인이 필요한 상태. apiClient는 React를 모르므로
      // AuthContext가 구독 중인 이벤트로만 알리고, 리다이렉트는 하지 않는다.
      emitAuthExpired()

      return Promise.reject(refreshError)
    }
  },
)
