import { mockUser } from '@/mock/user'
import type { Conversation, Message } from '@/types/message'

export const CURRENT_USER_ID = mockUser.id

export const mockConversations: Conversation[] = [
  {
    id: 1,
    participant: {
      nickname: '박서연',
      handle: 'seoyeon.codes',
      profileImage: 'https://i.pravatar.cc/150?img=32',
    },
    lastMessage: '넵 그럼 그때 뵈어요!',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    unreadCount: 2,
  },
  {
    id: 2,
    participant: {
      nickname: '이하늘',
      handle: 'skylee',
      profileImage: 'https://i.pravatar.cc/150?img=47',
    },
    lastMessage:
      '아 맞다 그 카페 위치 공유해드리려고 했는데 깜빡했네요. 이따가 링크 정리해서 보내드릴게요!',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 3,
    participant: {
      nickname: '정민준',
      handle: 'minjun_j',
    },
    lastMessage: 'ㅇㅋㅇㅋ',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: 4,
    participant: {
      nickname: '최지우',
      handle: 'jiwoo_c',
      profileImage: 'https://i.pravatar.cc/150?img=25',
    },
    lastMessage: '반갑습니다!',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    unreadCount: 1,
  },
  {
    id: 5,
    participant: {
      nickname: '오채원',
      handle: 'chaewon.o',
      profileImage: 'https://i.pravatar.cc/150?img=44',
    },
    lastMessage: '다음에 또 얘기해요~',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
  },
]

export const mockMessages: Message[] = [
  // Conversation 1: 박서연
  {
    id: 1,
    conversationId: 1,
    senderId: 2,
    content: '안녕하세요! 저번에 얘기했던 프로젝트 협업 건 관련해서 시간 괜찮으실 때 잠깐 얘기 나눌 수 있을까요?',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 2,
    conversationId: 1,
    senderId: CURRENT_USER_ID,
    content: '네 좋아요! 오늘 저녁 8시쯤 어떠세요?',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 3,
    conversationId: 1,
    senderId: 2,
    content: '좋습니다 😊 그때 화상으로 잠깐 뵐까요?',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 4,
    conversationId: 1,
    senderId: CURRENT_USER_ID,
    content: '넵 그럼 그때 뵈어요!',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },

  // Conversation 2: 이하늘
  {
    id: 5,
    conversationId: 2,
    senderId: 3,
    content: '저번에 올리신 사진 진짜 예쁘더라구요',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 6,
    conversationId: 2,
    senderId: CURRENT_USER_ID,
    content: '감사해요! 거기 뷰가 진짜 좋았어요',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(),
  },
  {
    id: 7,
    conversationId: 2,
    senderId: 3,
    content:
      '아 맞다 그 카페 위치 공유해드리려고 했는데 깜빡했네요. 이따가 링크 정리해서 보내드릴게요!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },

  // Conversation 3: 정민준
  {
    id: 8,
    conversationId: 3,
    senderId: CURRENT_USER_ID,
    content: '내일 약속 시간 그대로 맞죠?',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(),
  },
  {
    id: 9,
    conversationId: 3,
    senderId: 4,
    content: 'ㅇㅋㅇㅋ',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },

  // Conversation 4: 최지우
  {
    id: 10,
    conversationId: 4,
    senderId: 5,
    content: '안녕하세요, 팔로우했어요!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 - 1000 * 60).toISOString(),
  },
  {
    id: 11,
    conversationId: 4,
    senderId: CURRENT_USER_ID,
    content: '반갑습니다!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },

  // Conversation 5: 오채원
  {
    id: 12,
    conversationId: 5,
    senderId: 6,
    content: '오랜만이에요! 잘 지내시죠?',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9 - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 13,
    conversationId: 5,
    senderId: CURRENT_USER_ID,
    content: '네 잘 지내고 있어요 :) 다음에 또 얘기해요~',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
  },
]
