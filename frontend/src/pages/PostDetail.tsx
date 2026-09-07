import { ArrowLeft, Heart, MessageCircle, Repeat2, Share } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import CommentComposer from '@/components/comment/CommentComposer'
import CommentItem from '@/components/comment/CommentItem'
import { mockComments } from '@/mock/comments'
import { mockPosts } from '@/mock/posts'
import { formatFullDateTime } from '@/utils/formatRelativeTime'

function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const post = mockPosts.find((item) => item.id === Number(id))
  const comments = mockComments.filter((comment) => comment.postId === Number(id))

  return (
    <div className="w-full max-w-2xl border-x">
      <header className="sticky top-0 flex items-center gap-4 border-b bg-background px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full p-1.5 hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-bold">Post</h1>
      </header>

      {!post ? (
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          게시글을 찾을 수 없습니다.
        </div>
      ) : (
        <>
          <article className="border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src={post.author.profileImage} alt={post.author.nickname} />
                <AvatarFallback>{post.author.nickname.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{post.author.nickname}</div>
                <div className="truncate text-sm text-muted-foreground">@{post.author.handle}</div>
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-xl">{post.content}</p>

            {post.images && post.images.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-2xl border">
                <img src={post.images[0]} alt="" className="max-h-[480px] w-full object-cover" />
              </div>
            )}

            <div className="mt-3 text-sm text-muted-foreground">
              {formatFullDateTime(post.createdAt)}
            </div>

            <div className="mt-3 flex items-center justify-between border-t py-2 text-muted-foreground">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted hover:text-foreground"
              >
                <MessageCircle className="size-4" />
                {post.commentCount > 0 && post.commentCount}
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted hover:text-foreground"
              >
                <Repeat2 className="size-4" />
                {(post.repostCount ?? 0) > 0 && post.repostCount}
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted hover:text-foreground"
              >
                <Heart className="size-4" />
                {post.likeCount > 0 && post.likeCount}
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted hover:text-foreground"
              >
                <Share className="size-4" />
              </button>
            </div>
          </article>

          <CommentComposer />

          <div>
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default PostDetail
