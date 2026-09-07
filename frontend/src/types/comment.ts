import type { PostAuthor } from '@/types/post'

export interface Comment {
  id: number
  postId: number
  author: PostAuthor
  content: string
  createdAt: string
  likeCount: number
}
