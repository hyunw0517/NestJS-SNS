import { apiClient } from '@/lib/apiClient'
import type { CurrentUser } from '@/types/user'

export async function getMe() {
  const { data } = await apiClient.get<CurrentUser>('/users/me')

  return data
}
