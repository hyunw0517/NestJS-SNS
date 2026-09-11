// GET /chats, POST /chats/direct/:userId의 상대방 정보. 민감정보(email) 없음.
export interface ChatParticipant {
  id: number
  nickname: string
  handle: string | null
  profileImage: string | null
}

export type ChatType = 'DIRECT' | 'GROUP'

// GET /chats, POST /chats/direct/:userId, POST /chats/group 응답 그대로의 형태.
// DIRECT/GROUP이 하나의 shape를 공유한다: DIRECT는 otherUser만, GROUP은 name/members/
// memberCount만 채워지고 나머지는 null이다.
export interface ApiChat {
  id: number
  type: ChatType
  name: string | null
  otherUser: ChatParticipant | null
  members: ChatParticipant[] | null
  memberCount: number | null
  lastMessage: string | null
  lastMessageAt: string
}

// GET /chats/:chatId/messages 응답 항목. author는 UsersModel을 그대로 직렬화한 것이라
// (비밀번호 제외) 필요한 필드만 꺼내 쓴다.
export interface ApiMessage {
  id: number
  chat: { id: number }
  author: {
    id: number
    nickname: string
    handle: string | null
    profileImage: string | null
  }
  message: string
  createdAt: string
}

// REST 조회분(ApiMessage)과 socket receive_message 페이로드를 하나의 형태로 합쳐서 쓴다.
// socket 페이로드는 Backend가 이미 이 형태 그대로 보내므로 별도 변환이 필요 없다.
export interface Message {
  id: number
  chatId: number
  content: string
  createdAt: string
  author: ChatParticipant
}

// GET /chats/:chatId/members 응답 항목(GROUP 전용). email 등 민감정보 없음.
export interface ApiChatMember {
  id: number
  nickname: string
  handle: string | null
  profileImage: string | null
  role: 'OWNER' | 'MEMBER'
  joinedAt: string
}

export function toMessage(apiMessage: ApiMessage): Message {
  return {
    id: apiMessage.id,
    chatId: apiMessage.chat.id,
    content: apiMessage.message,
    createdAt: apiMessage.createdAt,
    author: {
      id: apiMessage.author.id,
      nickname: apiMessage.author.nickname,
      handle: apiMessage.author.handle,
      profileImage: apiMessage.author.profileImage,
    },
  }
}
