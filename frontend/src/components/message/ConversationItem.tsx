import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { ApiChat } from '@/types/message'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

interface ConversationItemProps {
  conversation: ApiChat
  active: boolean
  onClick: () => void
}

function ConversationItem({ conversation, active, onClick }: ConversationItemProps) {
  const { type, name, otherUser, memberCount, lastMessage, lastMessageAt } = conversation
  const isGroup = type === 'GROUP'

  // GROUP: 그룹 이름 기반 표시(실제 생성 UI는 다음 단계). DIRECT: 기존과 동일하게 상대방 기준.
  const displayName = isGroup ? (name ?? '그룹') : (otherUser?.nickname ?? '알 수 없음')

  return (
    <button
      type="button"
      onClick={onClick}
      data-chat-id={conversation.id}
      className={cn(
        'flex w-full items-start gap-3 border-b px-4 py-3 text-left hover:bg-muted',
        active && 'bg-muted',
      )}
    >
      <Avatar>
        {!isGroup && <AvatarImage src={otherUser?.profileImage ?? undefined} alt={displayName} />}
        <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-1">
            <span className="truncate text-sm font-semibold">{displayName}</span>
            {isGroup ? (
              <span className="truncate text-xs text-muted-foreground">멤버 {memberCount ?? 0}명</span>
            ) : (
              otherUser && (
                <span className="truncate text-xs text-muted-foreground">@{otherUser.handle ?? otherUser.nickname}</span>
              )
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(lastMessageAt)}
          </span>
        </div>

        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {lastMessage ?? '대화를 시작해보세요'}
        </p>
      </div>
    </button>
  )
}

export default ConversationItem
