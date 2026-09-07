import { Heart } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Comment } from '@/types/comment'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

interface CommentItemProps {
  comment: Comment
}

function CommentItem({ comment }: CommentItemProps) {
  const { author, content, createdAt, likeCount } = comment

  return (
    <article className="flex gap-3 border-b px-4 py-3">
      <Avatar>
        <AvatarImage src={author.profileImage} alt={author.nickname} />
        <AvatarFallback>{author.nickname.slice(0, 1)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-sm">
          <span className="font-semibold">{author.nickname}</span>
          <span className="text-muted-foreground">@{author.handle}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{formatRelativeTime(createdAt)}</span>
        </div>

        <p className="mt-0.5 whitespace-pre-wrap text-sm">{content}</p>

        <div className="mt-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full p-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Heart className="size-4" />
            {likeCount > 0 && likeCount}
          </button>
        </div>
      </div>
    </article>
  )
}

export default CommentItem
