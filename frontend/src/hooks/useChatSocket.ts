import { useEffect, useRef } from 'react'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { createChatSocket } from '@/lib/socket'
import type { ApiChat, Message } from '@/types/message'
import type { CursorPaginationResult } from '@/types/pagination'

// Messages 화면 전체에서 socket 연결은 이 hook 하나(=한 인스턴스)만 사용한다.
// chatId는 사용자가 대화를 전환할 때마다 바뀌므로, 매번 새 소켓을 만들지 않고
// 같은 연결에서 enter_chat만 다시 보낸다(rejoin).
export function useChatSocket(chatId: number | undefined) {
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)
  const chatIdRef = useRef(chatId)

  // 소켓 연결은 마운트 시 한 번만 만들고 언마운트(=Messages 화면을 벗어나거나 로그아웃으로
  // ProtectedRoute가 리다이렉트해 이 컴포넌트가 사라질 때) 정리한다.
  useEffect(() => {
    const socket = createChatSocket()
    socketRef.current = socket

    const joinCurrentChat = () => {
      if (chatIdRef.current !== undefined) {
        socket.emit('enter_chat', { chatIds: [chatIdRef.current] })
      }
    }

    // 최초 connect뿐 아니라 재연결(reconnect) 때도 매번 발생하므로, token 재인증
    // 이후 room에 다시 join하는 처리가 여기 하나로 커버된다.
    socket.on('connect', joinCurrentChat)

    socket.on('receive_message', (payload: Message) => {
      // 열려 있는 채팅 화면의 message 목록 캐시에 그대로 이어붙인다(중복 방지 포함).
      // 서버가 보내주는 이 이벤트가 authoritative한 데이터이므로, 발신자도 로컬에서
      // 별도로 만든 임시 message 없이 이 경로로만 자신의 메시지를 보게 된다.
      queryClient.setQueryData<InfiniteData<CursorPaginationResult<Message>>>(
        ['messages', payload.chatId],
        (old) => {
          if (!old) {
            return old
          }

          const alreadyExists = old.pages.some((page) => page.data.some((message) => message.id === payload.id))

          if (alreadyExists) {
            return old
          }

          const [firstPage, ...restPages] = old.pages

          return {
            ...old,
            pages: [{ ...firstPage, data: [payload, ...firstPage.data] }, ...restPages],
          }
        },
      )

      // 대화 목록의 마지막 메시지/시각도 최신화하고, 최신순으로 다시 정렬한다.
      queryClient.setQueryData<ApiChat[]>(['chats'], (old) => {
        if (!old) {
          return old
        }

        return old
          .map((chat) =>
            chat.id === payload.chatId
              ? { ...chat, lastMessage: payload.content, lastMessageAt: payload.createdAt }
              : chat,
          )
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      })
    })

    socket.on('exception', (error: unknown) => {
      // 권한 없는 chat 접근 시도 등. 별도 UI 없이 로그만 남긴다(사용자가 도달할 일이
      // 거의 없는 방어적 경로 - 정상 흐름에서는 본인 chat만 다룬다).
      console.error('[chat socket]', error)
    })

    socket.connect()

    return () => {
      socket.off('connect', joinCurrentChat)
      socket.off('receive_message')
      socket.off('exception')
      socket.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryClient는 앱 전역에서 안정적인 참조라 재연결 시마다 새 소켓을 만들 필요가 없다.
  }, [])

  // chatId가 바뀌면(대화 전환) 같은 연결에서 그 방에도 join한다. ref 동기화도 여기서
  // 함께 하는 이유: 렌더 중에 직접 ref.current를 쓰면 안 되므로(react-hooks/refs) 항상
  // effect 안에서만 갱신한다.
  useEffect(() => {
    chatIdRef.current = chatId

    if (socketRef.current?.connected && chatId !== undefined) {
      socketRef.current.emit('enter_chat', { chatIds: [chatId] })
    }
  }, [chatId])

  const sendMessage = (content: string) => {
    if (chatIdRef.current === undefined) {
      return
    }

    socketRef.current?.emit('send_message', { chatId: chatIdRef.current, message: content })
  }

  // 그룹 자진 퇴장 REST 성공 직후 호출된다. active membership이 이미 사라진 뒤라
  // send_message/enter_chat과 달리 서버 쪽 권한 검증이 필요 없는, 순수 room 이탈이다
  // (퇴장 직전까지 이 room에 join되어 있던 소켓이 계속 broadcast를 받는 것을 막는다).
  const leaveChatRoom = (chatId: number) => {
    socketRef.current?.emit('leave_chat', { chatIds: [chatId] })
  }

  return { sendMessage, leaveChatRoom }
}
