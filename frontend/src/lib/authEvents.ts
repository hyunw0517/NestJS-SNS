// apiClient(axios)는 React/Context를 알지 못하므로, refreshToken까지 만료돼
// 강제로 로그아웃 처리해야 할 때 AuthContext에 알려주기 위한 최소한의 pub/sub.
type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeAuthExpired(listener: Listener) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function emitAuthExpired() {
  listeners.forEach((listener) => listener())
}
