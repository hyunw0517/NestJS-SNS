const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

// setTokens/clearTokens("이 세션이 로그인/로그아웃했다"는 authoritative한 순간)마다
// 증가한다. apiClient의 자동 refresh는 setAccessToken만 단독으로 호출하는데, 그 refresh가
// 진행되는 도중에 로그아웃(혹은 다른 계정으로 재로그인)이 일어나면, 늦게 도착한 refresh
// 응답이 로그아웃 이후 storage에 accessToken을 다시 써버리는 race가 있었다. refresh
// 시작 시점의 epoch과 완료 시점의 epoch을 비교해, 그 사이 로그아웃/재로그인이 있었다면
// (epoch이 바뀌었다면) 그 응답은 버리도록 apiClient에서 이 값을 사용한다.
let sessionEpoch = 0

export function getSessionEpoch() {
  return sessionEpoch
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }) {
  sessionEpoch += 1
  setAccessToken(tokens.accessToken)
  setRefreshToken(tokens.refreshToken)
}

export function clearTokens() {
  sessionEpoch += 1
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}
