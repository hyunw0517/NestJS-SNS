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

// GET /users/:id 응답 그대로의 형태(Profile 화면용 공개 조회).
// email처럼 민감한 필드는 Backend가 애초에 내려주지 않는다.
export interface ApiUserProfile {
  id: number
  nickname: string
  handle: string | null
  profileImage: string | null
  coverImage: string | null
  bio: string | null
  followerCount: number
  followeeCount: number
  createdAt: string
  // 요청자가 로그인 상태일 때만 실제 값이 채워지고, 비로그인이면 항상 false(Backend 기준).
  isFollowing: boolean
}

// ApiUserProfile -> 기존 ProfileHeader가 기대하는 User 형태로 변환.
// ProfileHeader/User 타입을 API 구조에 맞게 바꾸지 않고, 이 변환만으로 재사용한다.
export function toProfileHeaderUser(apiUser: ApiUserProfile): User {
  return {
    id: apiUser.id,
    nickname: apiUser.nickname,
    // handle이 없는 사용자는 nickname으로 대체 표시 (post author와 동일한 규칙)
    handle: apiUser.handle ?? apiUser.nickname,
    profileImage: apiUser.profileImage ?? undefined,
    coverImage: apiUser.coverImage ?? undefined,
    bio: apiUser.bio ?? undefined,
    joinedAt: apiUser.createdAt,
    followingCount: apiUser.followeeCount,
    followerCount: apiUser.followerCount,
  }
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
