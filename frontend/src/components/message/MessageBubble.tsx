import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Message } from '@/types/message'
import { formatMessageTime } from '@/utils/formatRelativeTime'

interface MessageBubbleProps {
  message: Message
  isMine: boolean
}

// GROUP/DIRECT 공통: message.author가 실제 발신자 정보를 이미 담고 있으므로(DIRECT도
// 상대방 기준으로 채워져 내려옴) conversation 데이터를 따로 받지 않고 메시지 하나만으로
// 완결된다 - 발신자가 매 메시지마다 바뀌는 GROUP에서도 별도 처리 없이 항상 정확하다.
function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const navigate = useNavigate()
  const { author, content } = message
  const time = formatMessageTime(message.createdAt)

  if (isMine) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[75%] items-end gap-1.5">
          <div className="rounded-2xl bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
            {content}
          </div>
          <span className="shrink-0 pb-0.5 text-[11px] text-muted-foreground">{time}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-2">
      <button type="button" onClick={() => navigate(`/profile/${author.id}`)} className="mt-0.5 shrink-0 cursor-pointer">
        <Avatar size="sm">
          <AvatarImage src={author.profileImage ?? undefined} alt={author.nickname} />
          <AvatarFallback>{author.nickname.slice(0, 1)}</AvatarFallback>
        </Avatar>
      </button>

      <div className="flex min-w-0 max-w-[75%] flex-col">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="min-w-0 truncate text-xs font-semibold text-foreground">{author.nickname}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{time}</span>
        </div>
        <div className="mt-0.5 rounded-2xl bg-muted px-3.5 py-2 text-sm whitespace-pre-wrap text-foreground">
          {content}
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
