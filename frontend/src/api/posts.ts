import { apiClient } from '@/lib/apiClient'
import type { CursorPaginationResult } from '@/types/pagination'
import type { ApiPost, CreatePostRequest, GetPostsParams, UpdatePostRequest } from '@/types/post'

// Backend PaginatePostDto가 실제로 받는 쿼리 파라미터 이름 그대로 매핑한다.
// order__createdAt 기준으로 ASC면 where__id__more_than, DESC면 where__id__less_than에
// cursor 값을 넣는 것까지 Backend CommonService.cursorPaginate와 동일한 규칙이다.
export async function getPosts(params: GetPostsParams = {}) {
  const { take = 20, order = 'ASC', cursor, where__likeCount__more_than, where__title__i_like, where__author_id, where__has_images } = params

  const query: Record<string, string | number | boolean> = {
    take,
    order__createdAt: order,
  }

  if (where__likeCount__more_than !== undefined) {
    query.where__likeCount__more_than = where__likeCount__more_than
  }

  if (where__title__i_like !== undefined) {
    query.where__title__i_like = where__title__i_like
  }

  if (where__author_id !== undefined) {
    query.where__author_id = where__author_id
  }

  if (where__has_images !== undefined) {
    query.where__has_images = where__has_images
  }

  if (cursor !== undefined) {
    query[order === 'ASC' ? 'where__id__more_than' : 'where__id__less_than'] = cursor
  }

  const { data } = await apiClient.get<CursorPaginationResult<ApiPost>>('/posts', {
    params: query,
  })

  return data
}

// 인증 불필요(@IsPublic). 존재하지 않는 postId면 404.
export async function getPost(postId: number) {
  const { data } = await apiClient.get<ApiPost>(`/posts/${postId}`)

  return data
}

// 응답은 GET /posts/:id와 동일하게 author/images가 채워진 ApiPost 그대로 온다.
export async function createPost(payload: CreatePostRequest) {
  const { data } = await apiClient.post<ApiPost>('/posts', payload)

  return data
}

// 작성자 본인 또는 ADMIN만 가능(Backend IsPostMineOrAdminGuard). 권한 없으면 403.
export async function updatePost(postId: number, payload: UpdatePostRequest) {
  const { data } = await apiClient.patch<ApiPost>(`/posts/${postId}`, payload)

  return data
}

// 성공 시 Backend가 삭제된 postId(number)를 그대로 반환한다.
export async function deletePost(postId: number) {
  const { data } = await apiClient.delete<number>(`/posts/${postId}`)

  return data
}

// 인증 필요. 이미 좋아요한 상태면 Backend가 400을 던진다.
export async function likePost(postId: number) {
  const { data } = await apiClient.post<boolean>(`/posts/${postId}/like`)

  return data
}

// 인증 필요. 좋아요하지 않은 상태면 Backend가 400을 던진다.
export async function unlikePost(postId: number) {
  const { data } = await apiClient.delete<boolean>(`/posts/${postId}/like`)

  return data
}
