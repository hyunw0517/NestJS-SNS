import type { CurrentUser } from '@/types/user'

export interface PostAuthor {
  id: number
  nickname: string
  handle: string
  profileImage?: string
}

export interface Post {
  id: number
  author: PostAuthor
  content: string
  createdAt: string
  likeCount: number
  commentCount: number
  repostCount?: number
  images?: string[]
  isLiked?: boolean
}

// 아래는 GET /posts(cursor pagination) 응답 그대로의 형태.
// PostCard 등 UI 컴포넌트가 쓰는 위 Post/PostAuthor와 필드 구성이 달라(author가 전체 UsersModel,
// images가 문자열 배열이 아니라 객체 배열, repostCount 없음 등) 하나로 합치지 않고 분리한다.

// GET /posts의 author는 GET /users/me와 동일하게 UsersModel을 그대로 직렬화한
// 것이라(비밀번호 제외) CurrentUser와 형태가 같다.
export type ApiPostAuthor = CurrentUser

export interface ApiPostImage {
  id: number
  order: number
  // POST_IMAGE 타입만 존재하는 현재 기준, 이미 '/public/...' 형태로 변환되어 내려온다.
  path: string
}

export interface ApiPost {
  id: number
  author: ApiPostAuthor
  title: string | null
  content: string
  likeCount: number
  commentCount: number
  images: ApiPostImage[]
  createdAt: string
  updatedAt: string
  // 비로그인이면 Backend가 항상 false로 채워서 내려준다(BearerTokenGuard가 공개 라우트에서
  // 토큰이 있을 때만 best-effort로 req.user를 채우는 방식).
  isLiked: boolean
}

// GET /posts 요청 파라미터.
// cursor는 이전 응답의 cursor.after 값을 그대로 넣으면 된다(첫 페이지는 생략).
export interface GetPostsParams {
  take?: number
  order?: 'ASC' | 'DESC'
  cursor?: number
  where__likeCount__more_than?: number
  where__title__i_like?: string
  // Profile 화면에서 특정 작성자의 게시글만 조회할 때 사용.
  where__author_id?: number
  // Profile Media 탭용: 이미지가 1장 이상 있는 게시글만 조회.
  where__has_images?: boolean
}

// POST /posts 요청 body. Backend CreatePostDto = PickType(PostsModel, ['title', 'content']) + images.
// title은 PostsModel에서 optional(nullable)이라 그대로 optional로 둔다.
export interface CreatePostRequest {
  title?: string
  content: string
  images: string[]
}

// PATCH /posts/:postId 요청 body.
// Backend UpdatePostDto의 images는 "값을 보내면(빈 배열 포함) 기존 이미지를 전부
// 지우고 그 배열로 다시 만든다" 계약이다(이번에 images를 아예 안 보내면 기존
// 이미지가 유지되도록 Backend DTO 기본값 버그를 고쳤다). 그래서 이 필드는
// - 생략: 이미지 변경 없음(기존 유지)
// - []: 이미지 전부 제거
// - [fileName]: 그 이미지 하나로 교체(단일 이미지만 지원하는 현재 앱 범위와 동일)
// 로만 사용한다.
export interface UpdatePostRequest {
  title?: string
  content?: string
  images?: string[]
}

// ApiPost -> 기존 PostCard가 기대하는 Post 형태로 변환.
// PostCard/Post 타입을 API 구조에 맞게 바꾸지 않고, 이 변환만으로 재사용한다.
export function toPostCardPost(apiPost: ApiPost): Post {
  return {
    id: apiPost.id,
    author: {
      id: apiPost.author.id,
      nickname: apiPost.author.nickname,
      // handle이 없는 사용자는 nickname으로 대체 표시 (email 노출 안 함)
      handle: apiPost.author.handle ?? apiPost.author.nickname,
      profileImage: apiPost.author.profileImage ?? undefined,
    },
    content: apiPost.content,
    createdAt: apiPost.createdAt,
    likeCount: apiPost.likeCount,
    commentCount: apiPost.commentCount,
    images: apiPost.images.map((image) => image.path),
    isLiked: apiPost.isLiked,
  }
}
