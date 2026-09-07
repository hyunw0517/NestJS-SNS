import { ArrowLeft } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import MessageBubble from '@/components/message/MessageBubble'
import MessageComposer from '@/components/message/MessageComposer'
import { CURRENT_USER_ID } from '@/mock/messages'
import type { Conversation, Message } from '@/types/message'

interface ChatPanelProps {
  conversation: Conversation
  messages: Message[]
  onBack: () => void
}

function ChatPanel({ conversation, messages, onBack }: ChatPanelProps) {
  const { participant } = conversation

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-1.5 hover:bg-muted md:hidden"
        >
          <ArrowLeft className="size-5" />
        </button>

        <Avatar>
          <AvatarImage src={participant.profileImage} alt={participant.nickname} />
          <AvatarFallback>{participant.nickname.slice(0, 1)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{participant.nickname}</div>
          <div className="truncate text-xs text-muted-foreground">@{participant.handle}</div>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isMine={message.senderId === CURRENT_USER_ID}
          />
        ))}
      </div>

      <MessageComposer />
    </div>
  )
}

export default ChatPanel
