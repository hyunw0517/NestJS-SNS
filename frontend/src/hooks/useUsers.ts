import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { uploadImage } from '@/api/common'
import {
  followUser,
  getFollowers,
  getFollowing,
  getUserProfile,
  searchUsers,
  unfollowUser,
  updateMe,
} from '@/api/users'
import { useAuth } from '@/context/useAuth'
import type { PatchUserRequest } from '@/types/user'

export function useUserProfileQuery(userId: number) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserProfile(userId),
    enabled: !Number.isNaN(userId),
    retry: false,
  })
}

// Followers/Following 다이얼로그용. 탭이 다르면(followers/following) 쿼리도 별개이므로
// 지금 열려있는 탭만 활성화한다(Profile Posts/Media/Replies 탭과 동일한 패턴).
// 그룹 채팅 생성/초대 대상 선택용. 입력한 검색어(디바운스는 호출부에서 처리)로
// nickname/handle을 검색한다. 빈 문자열이면 Backend가 최근 사용자 일부를 내려준다.
export function useUserSearchQuery(query: string) {
  return useQuery({
    queryKey: ['userSearch', query],
    queryFn: () => searchUsers(query),
  })
}

export function useFollowersInfiniteQuery(userId: number, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: ['followers', userId],
    queryFn: ({ pageParam }) => getFollowers(userId, { order: 'DESC', cursor: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor.after ?? undefined,
    enabled: (options.enabled ?? true) && !Number.isNaN(userId),
  })
}

export function useFollowingInfiniteQuery(userId: number, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: ['following', userId],
    queryFn: ({ pageParam }) => getFollowing(userId, { order: 'DESC', cursor: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor.after ?? undefined,
    enabled: (options.enabled ?? true) && !Number.isNaN(userId),
  })
}

// 좋아요와 동일하게 optimistic update 없이, 성공하면 관련 쿼리를 무효화하는 가장 단순한
// 방식. ProfileHeader의 Follow 버튼과 Followers/Following 목록 내 행 버튼 양쪽에서
// 재사용되므로, 대상 사용자(userId)뿐 아니라 이 작업을 한 나 자신의 followeeCount도
// 바뀌고(내 프로필의 Following 수), 지금 열려 있을 수 있는 어떤 사용자의
// followers/following 목록이든 이 토글로 영향을 받을 수 있어 prefix로 넓게 무효화한다.
export function useToggleFollowMutation() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ userId, following }: { userId: number; following: boolean }) =>
      following ? unfollowUser(userId) : followUser(userId),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })

      if (user) {
        queryClient.invalidateQueries({ queryKey: ['user', user.id] })
      }

      queryClient.invalidateQueries({ queryKey: ['followers'] })
      queryClient.invalidateQueries({ queryKey: ['following'] })
    },
  })
}

interface UpdateProfileInput {
  nickname: string
  handle: string | null
  bio: string | null
  // undefined: 기존 이미지 유지(필드 생략) / null: 이미지 제거 / File: 새 이미지로 교체(업로드 후 전송)
  profileImage?: File | null
  coverImage?: File | null
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ nickname, handle, bio, profileImage, coverImage }: UpdateProfileInput) => {
      const payload: PatchUserRequest = { nickname, handle, bio }

      if (profileImage !== undefined) {
        payload.profileImage = profileImage === null ? null : await uploadImage(profileImage)
      }

      if (coverImage !== undefined) {
        payload.coverImage = coverImage === null ? null : await uploadImage(coverImage)
      }

      return updateMe(payload)
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] })

      // Backend가 posts/comments 조회 시마다 author를 실시간 join으로 내려주므로(값을
      // 복제 저장해두는 게 아니라), 목록 캐시들을 무효화하는 것만으로 다음 조회부터
      // PostCard/CommentItem에 표시되는 nickname/handle/profileImage가 최신화된다.
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post'] })
      queryClient.invalidateQueries({ queryKey: ['comments'] })
      queryClient.invalidateQueries({ queryKey: ['commentReplies'] })
      queryClient.invalidateQueries({ queryKey: ['userComments'] })
    },
  })
}
