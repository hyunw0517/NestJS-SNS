import { Search } from 'lucide-react'
import ConversationItem from '@/components/message/ConversationItem'
import type { Conversation } from '@/types/message'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: number
  onSelect: (id: number) => void
}

function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h1 className="text-lg font-bold">Messages</h1>
      </div>

      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2 rounded-full border px-3 py-1.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="쪽지 검색"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            active={conversation.id === selectedId}
            onClick={() => onSelect(conversation.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default ConversationList
