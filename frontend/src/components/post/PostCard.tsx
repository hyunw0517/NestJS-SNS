import { Heart, MessageCircle, Repeat2, Share } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Post } from '@/types/post'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

interface PostCardProps {
  post: Post
}

function PostCard({ post }: PostCardProps) {
  const { author, content, createdAt, likeCount, commentCount, repostCount, images } = post

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

        {images && images.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-2xl border">
            <img src={images[0]} alt="" className="max-h-96 w-full object-cover" />
          </div>
        )}

        <div className="mt-2 flex max-w-md items-center justify-between text-muted-foreground">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted hover:text-foreground"
          >
            <MessageCircle className="size-4" />
            {commentCount > 0 && commentCount}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted hover:text-foreground"
          >
            <Repeat2 className="size-4" />
            {(repostCount ?? 0) > 0 && repostCount}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted hover:text-foreground"
          >
            <Heart className="size-4" />
            {likeCount > 0 && likeCount}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted hover:text-foreground"
          >
            <Share className="size-4" />
          </button>
        </div>
      </div>
    </article>
  )
}

export default PostCard
