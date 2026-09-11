import { apiClient } from '@/lib/apiClient'
import type { CursorPaginationResult } from '@/types/pagination'
import type { ApiFollowUser, ApiUserProfile, ApiUserSearchResult, CurrentUser, PatchUserRequest } from '@/types/user'

interface GetFollowListParams {
  take?: number
  order?: 'ASC' | 'DESC'
  cursor?: number
}

// posts/comments의 cursor pagination 요청 규칙(order__createdAt + more_than/less_than)과 동일.
function buildFollowListQuery(params: GetFollowListParams) {
  const { take = 20, order = 'ASC', cursor } = params

  const query: Record<string, string | number> = {
    take,
    order__createdAt: order,
  }

  if (cursor !== undefined) {
    query[order === 'ASC' ? 'where__id__more_than' : 'where__id__less_than'] = cursor
  }

  return query
}

export async function getMe() {
  const { data } = await apiClient.get<CurrentUser>('/users/me')

  return data
}

// Edit Profile 저장.
export async function updateMe(payload: PatchUserRequest) {
  const { data } = await apiClient.patch<CurrentUser>('/users/me', payload)

  return data
}

// 인증 불필요(@IsPublic). 존재하지 않는 id면 404.
export async function getUserProfile(id: number) {
  const { data } = await apiClient.get<ApiUserProfile>(`/users/${id}`)

  return data
}

// 인증 필요. 자기 자신 대상이거나 이미 팔로우 중이면 Backend가 400을 던진다.
export async function followUser(id: number) {
  const { data } = await apiClient.post<boolean>(`/users/follow/${id}`)

  return data
}

// 인증 필요. 팔로우하지 않은 상태면 Backend가 400을 던진다.
export async function unfollowUser(id: number) {
  const { data } = await apiClient.delete<boolean>(`/users/follow/${id}`)

  return data
}

// 인증 불필요(@IsPublic). 확정된(isConfirmed) 관계만 내려온다. 존재하지 않는 id면 404.
export async function getFollowers(userId: number, params: GetFollowListParams = {}) {
  const { data } = await apiClient.get<CursorPaginationResult<ApiFollowUser>>(`/users/${userId}/followers`, {
    params: buildFollowListQuery(params),
  })

  return data
}

export async function getFollowing(userId: number, params: GetFollowListParams = {}) {
  const { data } = await apiClient.get<CursorPaginationResult<ApiFollowUser>>(`/users/${userId}/following`, {
    params: buildFollowListQuery(params),
  })

  return data
}

// 그룹 채팅 생성/초대 대상 선택용. q가 비어있으면 Backend가 최근 사용자 일부를 보여준다.
export async function searchUsers(q: string) {
  const { data } = await apiClient.get<ApiUserSearchResult[]>('/users/search', {
    params: q ? { q } : {},
  })

  return data
}
