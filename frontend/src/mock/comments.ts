import type { Comment } from '@/types/comment'

export const mockComments: Comment[] = [
  {
    id: 1,
    postId: 2,
    author: {
      nickname: '한지민',
      handle: 'jimin_h',
      profileImage: 'https://i.pravatar.cc/150?img=5',
    },
    content: '저도 요즘 사이드 프로젝트 하면서 반응형 때문에 고생 중이에요 ㅠㅠ',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    likeCount: 4,
  },
  {
    id: 2,
    postId: 2,
    author: {
      nickname: '오태양',
      handle: 'taeyang.o',
      profileImage: 'https://i.pravatar.cc/150?img=15',
    },
    content: '화이팅입니다! 완성되면 꼭 링크 공유해주세요.',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    likeCount: 1,
  },
  {
    id: 3,
    postId: 2,
    author: {
      nickname: '윤서아',
      handle: 'seoa_yoon',
    },
    content: 'API 스펙 맞추는 게 항상 제일 오래 걸리는 듯',
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    likeCount: 0,
  },
  {
    id: 4,
    postId: 3,
    author: {
      nickname: '강현우',
      handle: 'hyunwoo_k',
      profileImage: 'https://i.pravatar.cc/150?img=22',
    },
    content: '여기 어디예요? 저도 가보고 싶네요',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    likeCount: 7,
  },
  {
    id: 5,
    postId: 4,
    author: {
      nickname: '배수지',
      handle: 'suji_bae',
      profileImage: 'https://i.pravatar.cc/150?img=9',
    },
    content: '완전 공감합니다',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    likeCount: 12,
  },
  {
    id: 6,
    postId: 4,
    author: {
      nickname: '임도경',
      handle: 'dokyung_lim',
    },
    content: '저는 좀 다르게 생각하는데, 그래도 좋은 의견이네요.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    likeCount: 3,
  },
]
