import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { followUser, getUserProfile, unfollowUser } from '@/api/users'

export function useUserProfileQuery(userId: number) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserProfile(userId),
    enabled: !Number.isNaN(userId),
    retry: false,
  })
}

// 좋아요와 동일하게 optimistic update 없이, 성공하면 해당 사용자 profile 쿼리만
// 무효화하는 가장 단순한 방식. followerCount/followeeCount 모두 이 응답 하나에
// 들어있어 다른 쿼리를 함께 무효화할 필요가 없다.
export function useToggleFollowMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, following }: { userId: number; following: boolean }) =>
      following ? unfollowUser(userId) : followUser(userId),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
  })
}
