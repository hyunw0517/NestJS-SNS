export interface RegisterRequest {
  nickname: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AccessTokenResponse {
  accessToken: string
}
