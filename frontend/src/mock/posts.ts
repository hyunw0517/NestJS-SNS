import type { Post } from '@/types/post'

export const mockPosts: Post[] = [
  {
    id: 1,
    author: {
      nickname: '김도윤',
      handle: 'doyoon_dev',
      profileImage: 'https://i.pravatar.cc/150?img=12',
    },
    content: '오늘 날씨 진짜 좋다.',
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    likeCount: 3,
    commentCount: 0,
    repostCount: 0,
  },
  {
    id: 2,
    author: {
      nickname: '박서연',
      handle: 'seoyeon.codes',
      profileImage: 'https://i.pravatar.cc/150?img=32',
    },
    content:
      '요즘 사이드 프로젝트로 SNS 서비스를 만들고 있는데, 생각보다 신경 써야 할 부분이 많다. 레이아웃 하나 잡는 데도 반응형까지 고려하면 시간이 꽤 걸리고, 백엔드 API 스펙도 같이 맞춰가야 해서 할 일이 끝이 없는 느낌이다. 그래도 하나씩 완성되는 걸 보면 재밌다.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    likeCount: 24,
    commentCount: 5,
    repostCount: 2,
  },
  {
    id: 3,
    author: {
      nickname: '이하늘',
      handle: 'skylee',
      profileImage: 'https://i.pravatar.cc/150?img=47',
    },
    content: '주말에 다녀온 카페 뷰가 너무 예뻐서 공유합니다.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    likeCount: 118,
    commentCount: 14,
    repostCount: 9,
    images: ['https://picsum.photos/seed/sns-cafe/800/500'],
  },
  {
    id: 4,
    author: {
      nickname: '정민준',
      handle: 'minjun_j',
      profileImage: 'https://i.pravatar.cc/150?img=68',
    },
    content: '이거 완전 인정 🔥 다들 어떻게 생각해요?',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    likeCount: 892,
    commentCount: 231,
    repostCount: 156,
  },
  {
    id: 5,
    author: {
      nickname: '최지우',
      handle: 'jiwoo_c',
    },
    content: '첫 게시글입니다. 잘 부탁드려요!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
  },
  {
    id: 6,
    author: {
      nickname: '김도윤',
      handle: 'doyoon_dev',
      profileImage: 'https://i.pravatar.cc/150?img=12',
    },
    content: '드디어 프로필 화면까지 완성했다. 하나씩 만들어가는 재미가 있다.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    likeCount: 15,
    commentCount: 2,
    repostCount: 1,
  },
]
