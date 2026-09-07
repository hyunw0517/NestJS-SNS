export interface ConversationParticipant {
  nickname: string
  handle: string
  profileImage?: string
}

export interface Conversation {
  id: number
  participant: ConversationParticipant
  lastMessage: string
  lastMessageAt: string
  unreadCount?: number
}

export interface Message {
  id: number
  conversationId: number
  senderId: number
  content: string
  createdAt: string
}
