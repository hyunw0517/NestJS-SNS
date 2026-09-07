export interface User {
  id: number
  nickname: string
  handle: string
  profileImage?: string
  coverImage?: string
  bio?: string
  joinedAt: string
  followingCount: number
  followerCount: number
}

export type UserRole = 'ADMIN' | 'USER'

// GET /users/me 응답 그대로의 형태. Mock UI가 쓰는 `User`와 필드명/nullability가
// 달라 하나로 합치지 않고 별도 타입으로 둔다.
export interface CurrentUser {
  id: number
  nickname: string
  email: string
  role: UserRole
  followerCount: number
  followeeCount: number
  handle: string | null
  profileImage: string | null
  coverImage: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}
