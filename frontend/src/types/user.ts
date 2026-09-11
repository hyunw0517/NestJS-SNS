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

// PATCH /users/me 요청 body. Backend PatchUserDto와 동일한 계약:
// - nickname: 항상 값을 보낸다(필수 필드라 제거 개념이 없음)
// - handle/bio: undefined면 이 요청에서 다루지 않는다는 뜻이 아니라(Edit Profile은
//   텍스트 필드를 항상 함께 저장하므로) null이면 제거, 값이 있으면 그 값으로 저장
// - profileImage/coverImage: 생략(키 자체가 없음)이면 기존 이미지 유지, null이면 제거,
//   문자열이면 POST /common/image로 업로드된 temp 파일명으로 교체
export interface PatchUserRequest {
  nickname: string
  handle: string | null
  bio: string | null
  profileImage?: string | null
  coverImage?: string | null
}

// GET /users/:id/followers, GET /users/:id/following 목록 항목.
// ApiUserProfile과 달리 followerCount/followeeCount는 참고용이라 optional 취급하지 않고
// 그대로 포함하되(Backend가 항상 채워 보냄), email 등 민감 정보는 없다.
export interface ApiFollowUser {
  id: number
  nickname: string
  handle: string | null
  profileImage: string | null
  bio: string | null
  followerCount: number
  followeeCount: number
  // 요청자(로그인 사용자) 기준. 비로그인이면 항상 false.
  isFollowing: boolean
}

// GET /users/search 응답 항목. 그룹 채팅 생성/초대 대상 선택용 최소 필드만.
export interface ApiUserSearchResult {
  id: number
  nickname: string
  handle: string | null
  profileImage: string | null
}

export type UserRole = 'ADMIN' | 'USER'

// GET /users/me 응답 그대로의 형태. ProfileHeader 등 UI 컴포넌트가 쓰는 `User`와
// 필드명/nullability가 달라 하나로 합치지 않고 별도 타입으로 둔다.
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
