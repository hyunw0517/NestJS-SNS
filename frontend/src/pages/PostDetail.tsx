import { isAxiosError } from 'axios'
import { ArrowLeft, Heart, MessageCircle, Repeat2, Share } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import CommentComposer from '@/components/comment/CommentComposer'
import CommentItem from '@/components/comment/CommentItem'
import { useCommentsQuery } from '@/hooks/useComments'
import { usePostQuery, useTogglePostLikeMutation } from '@/hooks/usePosts'
import { toCommentItemComment } from '@/types/comment'
import { toPostCardPost } from '@/types/post'
import { formatFullDateTime } from '@/utils/formatRelativeTime'

function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const postId = Number(id)

  const { data: apiPost, isPending, error } = usePostQuery(postId)
  const { data: commentsPage, isPending: isCommentsPending } = useCommentsQuery(postId)
  const toggleLike = useTogglePostLikeMutation()

  const post = apiPost ? toPostCardPost(apiPost) : null
  const comments = commentsPage?.data.map((comment) => toCommentItemComment(comment, postId)) ?? []
  const notFound = isAxiosError(error) && error.response?.status === 404

  // 한 번에 하나의 댓글만 편집 상태가 되도록 Home의 editingPostId와 동일한 방식으로 관리한다.
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)

  // PostCard.tsx와 동일한 이유(리렌더 지연으로 인한 isPending stale 읽기 방지)로 ref를 사용한다.
  const isTogglingLikeRef = useRef(false)

  const handleToggleLike = () => {
    if (!post || isTogglingLikeRef.current) {
      return
    }

    isTogglingLikeRef.current = true
    toggleLike.mutate(
      { postId, liked: post.isLiked === true },
      { onSettled: () => { isTogglingLikeRef.current = false } },
    )
  }

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

      {isPending ? (
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">불러오는 중...</div>
      ) : !post ? (
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          {notFound ? '게시글을 찾을 수 없습니다.' : '게시글을 불러오지 못했습니다.'}
        </div>
      ) : (
        <>
          <article className="border-b px-4 py-3">
            <button
              type="button"
              onClick={() => navigate(`/profile/${post.author.id}`)}
              className="flex min-w-0 items-center gap-2 text-left"
            >
              <Avatar>
                <AvatarImage src={post.author.profileImage} alt={post.author.nickname} />
                <AvatarFallback>{post.author.nickname.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold hover:underline">{post.author.nickname}</div>
                <div className="truncate text-sm text-muted-foreground">@{post.author.handle}</div>
              </div>
            </button>

            <p className="mt-3 whitespace-pre-wrap text-xl">{post.content}</p>

            {post.images && post.images.length > 0 && (
              <div
                className={`mt-3 overflow-hidden rounded-2xl border ${post.images.length > 1 ? 'grid grid-cols-2 gap-0.5' : ''}`}
              >
                {post.images.length === 1 ? (
                  <img src={post.images[0]} alt="" className="max-h-[480px] w-full object-cover" />
                ) : (
                  post.images.map((imageUrl) => (
                    <img key={imageUrl} src={imageUrl} alt="" className="h-56 w-full object-cover" />
                  ))
                )}
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
                onClick={handleToggleLike}
                disabled={toggleLike.isPending}
                className={`flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted ${
                  post.isLiked ? 'text-red-500 hover:text-red-500' : 'hover:text-foreground'
                }`}
              >
                <Heart className={`size-4 ${post.isLiked ? 'fill-red-500' : ''}`} />
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

          <CommentComposer postId={postId} />

          <div>
            {isCommentsPending && (
              <p className="px-4 py-6 text-sm text-muted-foreground">댓글을 불러오는 중...</p>
            )}

            {!isCommentsPending && comments.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground">첫 댓글을 남겨보세요.</p>
            )}

            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                enableActions
                isEditing={editingCommentId === comment.id}
                onStartEdit={() => setEditingCommentId(comment.id)}
                onStopEdit={() => setEditingCommentId(null)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default PostDetail
