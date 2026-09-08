import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createComment, deleteComment, getComments, getCommentReplies, getUserComments, likeComment, unlikeComment, updateComment } from '@/api/comments'

// 무한스크롤 없이 한 페이지만 가져오는 단순한 조회. take를 넉넉히 잡아 대부분의 경우
// 한 번에 다 보이게 한다(고도화는 다음 단계 과제). 최신 댓글이 위로 오도록 DESC로 조회.
export function useCommentsQuery(postId: number) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => getComments(postId, { take: 50, order: 'DESC' }),
    enabled: !Number.isNaN(postId),
  })
}

// Profile Replies 탭용. postId 없이 특정 작성자 기준으로 무한스크롤한다. Posts/Media
// 탭과 동일하게 지금 활성화된 탭일 때만 쿼리를 실행하도록 enabled를 받는다.
export function useUserCommentsInfiniteQuery(userId: number, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: ['userComments', userId],
    queryFn: ({ pageParam }) => getUserComments(userId, { order: 'DESC', cursor: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor.after ?? undefined,
    enabled: (options.enabled ?? true) && !Number.isNaN(userId),
  })
}

// 대댓글(무제한 중첩)용: 특정 댓글의 바로 아래 자식 답글만 무한스크롤로 조회한다.
// CommentItem이 "답글 N개 보기"를 눌렀을 때만 enabled로 활성화해 지연 로딩한다.
export function useCommentRepliesInfiniteQuery(postId: number, commentId: number, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: ['commentReplies', postId, commentId],
    queryFn: ({ pageParam }) => getCommentReplies(postId, commentId, { order: 'DESC', cursor: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor.after ?? undefined,
    enabled: options.enabled ?? false,
  })
}

interface CreateCommentInput {
  comment: string
  // 있으면 그 댓글에 대한 답글(대댓글), 없으면 게시글에 직접 다는 최상위 댓글.
  parentId?: number
}

export function useCreateCommentMutation(postId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ comment, parentId }: CreateCommentInput) => createComment(postId, { comment, parentId }),
    onSuccess: (_data, { parentId }) => {
      // 최상위 댓글은 comments 목록에 바로 나타나야 한다.
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })

      // 답글이면 부모의 replyCount가 최신화돼야 하는데, 그 부모가 top-level 댓글이면
      // ['comments', postId]에, 그 부모 자신도 답글이면 ['commentReplies', ...]에,
      // Profile Replies 탭에 떠 있으면 ['userComments', ...]에 캐시되어 있을 수 있다.
      // 어느 쪽인지 정확히 몰라도 되도록 관련 prefix를 전부 넓게 무효화한다.
      if (parentId !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['commentReplies'] })
        queryClient.invalidateQueries({ queryKey: ['userComments'] })
      }

      // Backend가 댓글 생성 시 post.commentCount를 함께 증가시키므로, post 상세와
      // Home 목록 캐시도 함께 무효화해 최신 commentCount가 반영되게 한다.
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export function useUpdateCommentMutation(postId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commentId, comment }: { commentId: number; comment: string }) =>
      updateComment(postId, commentId, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      // 수정 대상이 답글일 수도 있으니(대댓글) commentReplies도 함께 무효화한다.
      // 어떤 댓글이 어느 부모의 자식인지 몰라도 되도록 prefix로 넓게 무효화 - 부담 없는
      // 수준의 쿼리 수라 단순하게 처리(userComments와 동일한 기존 관례).
      queryClient.invalidateQueries({ queryKey: ['commentReplies'] })
      queryClient.invalidateQueries({ queryKey: ['userComments'] })
    },
  })
}

export function useDeleteCommentMutation(postId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: number) => deleteComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      // 삭제도 Backend가 post.commentCount를 감소시키므로 동일하게 무효화한다. 삭제 대상이
      // 답글이었을 수도 있고(부모의 replyCount 갱신 필요), 대댓글이 달린 채로 cascade
      // 삭제됐을 수도 있으므로 commentReplies도 함께 무효화한다.
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['commentReplies'] })
      queryClient.invalidateQueries({ queryKey: ['userComments'] })
    },
  })
}

// 게시글 좋아요와 동일한 패턴. 댓글 좋아요는 postId/commentCount와 무관해
// comments 쿼리만 무효화하면 된다.
export function useToggleCommentLikeMutation(postId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commentId, liked }: { commentId: number; liked: boolean }) =>
      liked ? unlikeComment(postId, commentId) : likeComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      // 좋아요 대상이 답글일 수도 있으니 commentReplies도 함께 무효화한다.
      queryClient.invalidateQueries({ queryKey: ['commentReplies'] })
      // Profile Replies 탭에서 좋아요를 누른 경우에도 반영되도록 함께 무효화한다.
      queryClient.invalidateQueries({ queryKey: ['userComments'] })
    },
  })
}
