import { apiClient } from '@/lib/apiClient'
import type { ApiChat, ApiChatMember, ApiMessage } from '@/types/message'
import type { CursorPaginationResult } from '@/types/pagination'

// 로그인 사용자가 참여한 1:1 chat 목록(전체 조회 아님, Backend가 로그인 사용자 기준으로 필터링).
export async function getChats() {
  const { data } = await apiClient.get<ApiChat[]>('/chats')

  return data
}

// userId와의 기존 DM이 있으면 그걸, 없으면 새로 만들어서 반환한다.
export async function getOrCreateDirectChat(userId: number) {
  const { data } = await apiClient.post<ApiChat>(`/chats/direct/${userId}`)

  return data
}

// 그룹 채팅 생성(생성자 OWNER, 나머지 MEMBER). Backend가 본인을 포함해 최소 3명을 요구한다.
export async function createGroupChat(payload: { name: string; userIds: number[] }) {
  const { data } = await apiClient.post<ApiChat>('/chats/group', payload)

  return data
}

// GROUP의 활성 멤버 목록(email 등 민감정보 없음). DIRECT에 호출하면 Backend가 400.
export async function getChatMembers(chatId: number) {
  const { data } = await apiClient.get<ApiChatMember[]>(`/chats/${chatId}/members`)

  return data
}

// OWNER만 호출 가능(그 외엔 Backend가 403). 재초대 여부는 Backend가 알아서 처리한다.
export async function inviteChatMembers(chatId: number, userIds: number[]) {
  const { data } = await apiClient.post<ApiChat>(`/chats/${chatId}/members`, { userIds })

  return data
}

// 자진 퇴장(GROUP만). OWNER가 나가면 Backend가 다음 OWNER를 자동 선정한다.
export async function leaveChat(chatId: number) {
  await apiClient.delete(`/chats/${chatId}/members/me`)
}

interface GetMessagesParams {
  take?: number
  order?: 'ASC' | 'DESC'
  cursor?: number
}

// 채팅 UX에 맞게 기본은 최신 메시지부터(DESC) 내려오고, cursor로 더 과거 메시지를 이어 받는다.
export async function getMessages(chatId: number, params: GetMessagesParams = {}) {
  const { take = 30, order = 'DESC', cursor } = params

  const query: Record<string, string | number> = {
    take,
    order__createdAt: order,
  }

  if (cursor !== undefined) {
    query[order === 'ASC' ? 'where__id__more_than' : 'where__id__less_than'] = cursor
  }

  const { data } = await apiClient.get<CursorPaginationResult<ApiMessage>>(`/chats/${chatId}/messages`, {
    params: query,
  })

  return data
}
