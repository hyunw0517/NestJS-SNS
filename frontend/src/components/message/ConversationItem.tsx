import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/message'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

interface ConversationItemProps {
  conversation: Conversation
  active: boolean
  onClick: () => void
}

function ConversationItem({ conversation, active, onClick }: ConversationItemProps) {
  const { participant, lastMessage, lastMessageAt, unreadCount } = conversation

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 border-b px-4 py-3 text-left hover:bg-muted',
        active && 'bg-muted',
      )}
    >
      <Avatar>
        <AvatarImage src={participant.profileImage} alt={participant.nickname} />
        <AvatarFallback>{participant.nickname.slice(0, 1)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-1">
            <span className="truncate text-sm font-semibold">{participant.nickname}</span>
            <span className="truncate text-xs text-muted-foreground">@{participant.handle}</span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(lastMessageAt)}
          </span>
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              'truncate text-sm',
              unreadCount ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {lastMessage}
          </p>
          {!!unreadCount && (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default ConversationItem
