import type { User } from '@/types/user'

export const mockUser: User = {
  id: 1,
  nickname: '김도윤',
  handle: 'doyoon_dev',
  profileImage: 'https://i.pravatar.cc/150?img=12',
  coverImage: 'https://picsum.photos/seed/sns-profile-cover/1200/400',
  bio: '프론트엔드 개발자입니다. 커피와 고양이를 좋아합니다.',
  joinedAt: '2022-03-15T00:00:00.000Z',
  followingCount: 128,
  followerCount: 342,
}
