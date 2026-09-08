import type { PostAuthor } from '@/types/post'

export interface Comment {
  id: number
  postId: number
  author: PostAuthor
  content: string
  createdAt: string
  likeCount: number
  isLiked?: boolean
  // 대댓글(무제한 중첩)용: 바로 아래 자식 답글 개수(트리 전체 개수 아님).
  replyCount: number
}

// 아래는 GET /posts/:postId/comments(cursor pagination) 응답 그대로의 형태.
// Backend가 목록 조회 시 author를 { id, nickname }만 select하므로(handle/profileImage 없음),
// 위 mock용 Comment/PostAuthor와 형태가 달라 하나로 합치지 않고 분리한다.
export interface ApiCommentAuthor {
  id: number
  nickname: string
}

export interface ApiComment {
  id: number
  author: ApiCommentAuthor
  // Backend 필드명이 content가 아니라 comment이다(CommentsModel.comment).
  comment: string
  likeCount: number
  createdAt: string
  updatedAt: string
  // post와 동일하게 비로그인이면 Backend가 항상 false로 채워서 내려준다.
  isLiked: boolean
  // 대댓글(무제한 중첩)용: 바로 아래 자식 답글 개수.
  replyCount: number
}

// GET /users/:userId/comments(cursor pagination) 응답 아이템. ApiComment에 원글 정보(post)가
// 추가된 형태 - Profile Replies 탭에서 "어느 게시글에 단 댓글인지" 보여주고 이동하기 위해 필요하다.
export interface ApiUserComment extends ApiComment {
  post: {
    id: number
    content: string
  }
}

// POST /posts/:postId/comments 요청 body. Backend CreateCommentsDto = PickType(CommentsModel, ['comment']) + parentId.
// parentId를 생략하면 게시글에 직접 다는 최상위 댓글, 지정하면 그 댓글에 대한 답글(대댓글)이다.
export interface CreateCommentRequest {
  comment: string
  parentId?: number
}

// PATCH /posts/:postId/comments/:commentId 요청 body. Backend UpdateCommentsDto = PartialType(CreateCommentsDto).
export interface UpdateCommentRequest {
  comment: string
}

// ApiComment -> 기존 CommentItem이 기대하는 Comment 형태로 변환.
export function toCommentItemComment(apiComment: ApiComment, postId: number): Comment {
  return {
    id: apiComment.id,
    postId,
    author: {
      id: apiComment.author.id,
      nickname: apiComment.author.nickname,
      // Backend가 handle을 안 내려줘서 nickname으로 대체 표시 (post 쪽과 동일한 규칙)
      handle: apiComment.author.nickname,
      profileImage: undefined,
    },
    content: apiComment.comment,
    createdAt: apiComment.createdAt,
    likeCount: apiComment.likeCount,
    isLiked: apiComment.isLiked,
    replyCount: apiComment.replyCount,
  }
}
