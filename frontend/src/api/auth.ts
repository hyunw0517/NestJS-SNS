import { authClient } from '@/lib/apiClient'
import type { AccessTokenResponse, AuthTokens, LoginRequest, RegisterRequest } from '@/types/auth'

export async function register(payload: RegisterRequest) {
  const { data } = await authClient.post<AuthTokens>('/auth/register/email', payload)

  return data
}

// email:password 문자열을 UTF-8 바이트 기준으로 base64 인코딩한다.
// btoa()는 Latin1 문자만 지원하므로, 비밀번호에 한글 등이 포함되면 TextEncoder를 거쳐야 한다.
function encodeBasicAuth({ email, password }: LoginRequest) {
  const bytes = new TextEncoder().encode(`${email}:${password}`)
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')

  return btoa(binary)
}

export async function login(payload: LoginRequest) {
  const { data } = await authClient.post<AuthTokens>('/auth/login/email', null, {
    headers: {
      Authorization: `Basic ${encodeBasicAuth(payload)}`,
    },
  })

  return data
}

export async function refreshAccessToken(refreshToken: string) {
  const { data } = await authClient.post<AccessTokenResponse>('/auth/token/access', null, {
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
  })

  return data.accessToken
}
