import { apiClient } from '@/lib/apiClient'
import type { CursorPaginationResult } from '@/types/pagination'
import type { ApiComment, ApiUserComment, CreateCommentRequest, UpdateCommentRequest } from '@/types/comment'

interface GetCommentsParams {
  take?: number
  order?: 'ASC' | 'DESC'
  cursor?: number
}

// Backend PaginateCommentsDto도 posts와 동일한 BasePaginationDto 기반 cursor pagination이다.
// 이번 범위에서는 무한스크롤 없이 한 페이지만 가져와서 쓴다.
export async function getComments(postId: number, params: GetCommentsParams = {}) {
  const { take = 20, order = 'ASC', cursor } = params

  const query: Record<string, string | number> = {
    take,
    order__createdAt: order,
  }

  if (cursor !== undefined) {
    query[order === 'ASC' ? 'where__id__more_than' : 'where__id__less_than'] = cursor
  }

  const { data } = await apiClient.get<CursorPaginationResult<ApiComment>>(`/posts/${postId}/comments`, {
    params: query,
  })

  return data
}

// 인증 필요(로그인 사용자만). 성공 시 Backend가 postId의 commentCount를 함께 증가시킨다.
export async function createComment(postId: number, payload: CreateCommentRequest) {
  const { data } = await apiClient.post<ApiComment>(`/posts/${postId}/comments`, payload)

  return data
}

// 작성자 본인 또는 ADMIN만 가능(Backend IsCommentMineOrAdminGuard). 권한 없으면 403.
export async function updateComment(postId: number, commentId: number, payload: UpdateCommentRequest) {
  const { data } = await apiClient.patch<ApiComment>(`/posts/${postId}/comments/${commentId}`, payload)

  return data
}

// 성공 시 Backend가 삭제된 commentId(number)를 그대로 반환하고, postId의 commentCount를 함께 감소시킨다.
export async function deleteComment(postId: number, commentId: number) {
  const { data } = await apiClient.delete<number>(`/posts/${postId}/comments/${commentId}`)

  return data
}

// Profile Replies 탭용. 인증 불필요(@IsPublic) - 게시글/댓글 목록 조회와 동일하게
// 로그인 상태면 isLiked까지 함께 내려온다. postId 없이 특정 작성자 기준으로 조회한다.
export async function getUserComments(userId: number, params: GetCommentsParams = {}) {
  const { take = 20, order = 'ASC', cursor } = params

  const query: Record<string, string | number> = {
    take,
    order__createdAt: order,
  }

  if (cursor !== undefined) {
    query[order === 'ASC' ? 'where__id__more_than' : 'where__id__less_than'] = cursor
  }

  const { data } = await apiClient.get<CursorPaginationResult<ApiUserComment>>(`/users/${userId}/comments`, {
    params: query,
  })

  return data
}

// 대댓글(무제한 중첩)용: 특정 댓글의 바로 아래 자식 답글만 조회한다(트리 전체가 아님).
// 더 깊은 답글은 그 답글의 id로 다시 이 함수를 호출해 지연 로딩한다. 인증 불필요(@IsPublic).
// Backend CommentsController가 posts/:postId/comments 아래에 있어 postId도 URL에 필요하다.
export async function getCommentReplies(postId: number, commentId: number, params: GetCommentsParams = {}) {
  const { take = 20, order = 'ASC', cursor } = params

  const query: Record<string, string | number> = {
    take,
    order__createdAt: order,
  }

  if (cursor !== undefined) {
    query[order === 'ASC' ? 'where__id__more_than' : 'where__id__less_than'] = cursor
  }

  const { data } = await apiClient.get<CursorPaginationResult<ApiComment>>(`/posts/${postId}/comments/${commentId}/replies`, {
    params: query,
  })

  return data
}

// 인증 필요. 이미 좋아요한 상태면 Backend가 400을 던진다.
export async function likeComment(postId: number, commentId: number) {
  const { data } = await apiClient.post<boolean>(`/posts/${postId}/comments/${commentId}/like`)

  return data
}

// 인증 필요. 좋아요하지 않은 상태면 Backend가 400을 던진다.
export async function unlikeComment(postId: number, commentId: number) {
  const { data } = await apiClient.delete<boolean>(`/posts/${postId}/comments/${commentId}/like`)

  return data
}
