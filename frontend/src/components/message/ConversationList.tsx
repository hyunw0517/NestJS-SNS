import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import ConversationItem from '@/components/message/ConversationItem'
import GroupCreateDialog from '@/components/message/GroupCreateDialog'
import type { ApiChat } from '@/types/message'

interface ConversationListProps {
  conversations: ApiChat[]
  isPending: boolean
  selectedId: number | undefined
  onSelect: (id: number) => void
}

// DIRECT는 상대방 nickname/handle, GROUP은 그룹명 기준으로 검색어와 대조한다.
// lastMessage도 함께 대조해 "그 얘기 했던 대화방"을 찾기 쉽게 한다. Backend API
// 없이 이미 받아온 ['chats'] 데이터 안에서만 거르는 순수 클라이언트 필터라
// 대화 수가 많아져도(수십~수백 건) 별도 서버 왕복 없이 즉시 반응한다.
function matchesQuery(conversation: ApiChat, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true
  }

  const haystacks =
    conversation.type === 'GROUP'
      ? [conversation.name]
      : [conversation.otherUser?.nickname, conversation.otherUser?.handle]

  haystacks.push(conversation.lastMessage)

  return haystacks.some((value) => value?.toLowerCase().includes(normalizedQuery))
}

function ConversationList({ conversations, isPending, selectedId, onSelect }: ConversationListProps) {
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filteredConversations = conversations.filter((conversation) => matchesQuery(conversation, normalizedQuery))

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-lg font-bold">Messages</h1>
        <button
          type="button"
          onClick={() => setCreateGroupOpen(true)}
          aria-label="새 그룹 만들기"
          className="rounded-full p-1.5 hover:bg-muted"
        >
          <Plus className="size-5" />
        </button>
      </div>

      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2 rounded-full border px-3 py-1.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="쪽지 검색"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isPending && <p className="px-4 py-6 text-center text-sm text-muted-foreground">불러오는 중...</p>}

        {!isPending && conversations.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            아직 대화가 없습니다. 다른 사용자의 프로필에서 Message를 눌러 시작해보세요.
          </p>
        )}

        {!isPending && conversations.length > 0 && filteredConversations.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>
        )}

        {filteredConversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            active={conversation.id === selectedId}
            onClick={() => onSelect(conversation.id)}
          />
        ))}
      </div>

      <GroupCreateDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
    </div>
  )
}

export default ConversationList
