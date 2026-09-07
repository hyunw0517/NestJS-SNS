import { cn } from '@/lib/utils'
import type { Message } from '@/types/message'

interface MessageBubbleProps {
  message: Message
  isMine: boolean
}

function MessageBubble({ message, isMine }: MessageBubbleProps) {
  return (
    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap',
          isMine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

export default MessageBubble
