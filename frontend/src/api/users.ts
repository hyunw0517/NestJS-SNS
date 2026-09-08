import { apiClient } from '@/lib/apiClient'
import type { ApiUserProfile, CurrentUser } from '@/types/user'

export async function getMe() {
  const { data } = await apiClient.get<CurrentUser>('/users/me')

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
