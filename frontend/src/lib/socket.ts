import { io } from 'socket.io-client'
import { getAccessToken } from '@/lib/tokenStorage'

// Backend ChatsGateway와 동일한 namespace('/chats'). 호스트를 생략하고 namespace만
// 넘기면 현재 origin(dev에서는 vite dev 서버)을 기준으로 연결되고, 실제 handshake
// 요청은 engine.io 기본 경로(/socket.io)로 나가 vite.config.ts의 /socket.io 프록시를
// 그대로 탄다(apiClient가 /api 프록시를 쓰는 것과 동일한 방식).
export function createChatSocket() {
  return io('/chats', {
    // 함수로 넘기면 매 연결/재연결 시도마다 새로 호출되어, refresh로 토큰이 바뀐 뒤
    // 재연결되는 경우에도 항상 최신 accessToken을 사용하게 된다.
    auth: (callback) => callback({ token: getAccessToken() ?? undefined }),
    autoConnect: false,
  })
}
