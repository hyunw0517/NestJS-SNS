export interface PostAuthor {
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
}
