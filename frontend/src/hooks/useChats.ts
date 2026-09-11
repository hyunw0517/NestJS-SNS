import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createGroupChat,
  getChatMembers,
  getChats,
  getMessages,
  getOrCreateDirectChat,
  inviteChatMembers,
  leaveChat,
} from '@/api/chats'
import { toMessage, type ApiChat } from '@/types/message'

export function useChatsQuery() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: getChats,
  })
}

// REST 응답(ApiMessage, message/chat.id 필드)을 socket receive_message와 동일한
// Message 형태(content/chatId)로 여기서 미리 맞춰서 캐시에 저장한다. 두 소스가 같은
// 모양이어야 실시간 수신 메시지를 같은 캐시에 이어붙이기 쉽다.
export function useMessagesInfiniteQuery(chatId: number, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: ['messages', chatId],
    queryFn: async ({ pageParam }) => {
      const page = await getMessages(chatId, { order: 'DESC', cursor: pageParam })

      return { ...page, data: page.data.map(toMessage) }
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor.after ?? undefined,
    enabled: (options.enabled ?? true) && !Number.isNaN(chatId),
  })
}

// Profile의 Message 버튼 등에서 사용. 성공하면 chat 목록도 무효화해 새로 만들어진
// chat이 바로 목록에 보이게 한다(상대방과의 DM이 처음인 경우).
export function useGetOrCreateDirectChatMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: number) => getOrCreateDirectChat(userId),
    onSuccess: (chat) => {
      // 서버가 돌려준(신뢰 가능한) chat을 바로 캐시에 반영해, invalidate가 끝나기 전에
      // /messages/:chatId로 이동해도 목록에서 "찾을 수 없음"으로 잠깐 보이지 않게 한다.
      queryClient.setQueryData<ApiChat[]>(['chats'], (old) => {
        if (!old) {
          return old
        }

        return old.some((c) => c.id === chat.id) ? old : [chat, ...old]
      })

      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
  })
}

// 그룹 생성 Dialog에서 사용. 성공하면 새 그룹을 바로 목록에 반영해 invalidate가
// 끝나기 전에 이동해도 대화 목록에서 잠깐 사라지지 않게 한다(useGetOrCreateDirectChatMutation과 동일한 이유).
export function useCreateGroupChatMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string; userIds: number[] }) => createGroupChat(payload),
    onSuccess: (chat) => {
      queryClient.setQueryData<ApiChat[]>(['chats'], (old) => {
        if (!old) {
          return old
        }

        return old.some((c) => c.id === chat.id) ? old : [chat, ...old]
      })

      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
  })
}

// GROUP 멤버 목록. Dialog가 열려있을 때만 조회한다(FollowListDialog와 동일한 패턴).
export function useChatMembersQuery(chatId: number, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['chatMembers', chatId],
    queryFn: () => getChatMembers(chatId),
    enabled: (options.enabled ?? true) && !Number.isNaN(chatId),
  })
}

// OWNER 전용 멤버 초대. 성공하면 서버가 돌려준 최신 chat 요약(memberCount 포함)을
// 그대로 캐시에 반영하고, 멤버 목록도 다시 불러온다.
export function useInviteChatMembersMutation(chatId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userIds: number[]) => inviteChatMembers(chatId, userIds),
    onSuccess: (chat) => {
      queryClient.setQueryData<ApiChat[]>(['chats'], (old) => old?.map((c) => (c.id === chat.id ? chat : c)))
      queryClient.invalidateQueries({ queryKey: ['chatMembers', chatId] })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
  })
}

// 자진 퇴장. 성공하면 이 chat과 관련된 캐시(messages/chatMembers)를 정리하고 목록에서 뺀다.
export function useLeaveChatMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: number) => leaveChat(chatId),
    onSuccess: (_data, chatId) => {
      queryClient.removeQueries({ queryKey: ['messages', chatId] })
      queryClient.removeQueries({ queryKey: ['chatMembers', chatId] })
      queryClient.setQueryData<ApiChat[]>(['chats'], (old) => old?.filter((c) => c.id !== chatId))
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
  })
}
