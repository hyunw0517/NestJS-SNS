import { useEffect, useRef, useState } from 'react'
import { Heart, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import CommentComposer from '@/components/comment/CommentComposer'
import { useAuth } from '@/context/useAuth'
import { useCommentRepliesInfiniteQuery, useDeleteCommentMutation, useToggleCommentLikeMutation, useUpdateCommentMutation } from '@/hooks/useComments'
import { getErrorMessage } from '@/lib/apiError'
import { toCommentItemComment } from '@/types/comment'
import type { Comment } from '@/types/comment'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

const UPDATE_FALLBACK_ERROR = '댓글을 수정하지 못했습니다. 잠시 후 다시 시도해주세요.'
const DELETE_FALLBACK_ERROR = '댓글을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.'

interface CommentItemProps {
  comment: Comment
  postId: number
  // Home의 PostCard와 동일한 원칙: 실제 API에 연결된 댓글에서만 true로 넘긴다.
  enableActions?: boolean
  isEditing?: boolean
  onStartEdit?: () => void
  onStopEdit?: () => void
}

function CommentItem({
  comment,
  postId,
  enableActions = false,
  isEditing = false,
  onStartEdit = () => {},
  onStopEdit = () => {},
}: CommentItemProps) {
  const { id, author, content, createdAt, likeCount, isLiked, replyCount } = comment
  const { user } = useAuth()
  const navigate = useNavigate()
  const updateComment = useUpdateCommentMutation(postId)
  const deleteComment = useDeleteCommentMutation(postId)
  const toggleLike = useToggleCommentLikeMutation(postId)

  const [editedContent, setEditedContent] = useState(content)
  const [error, setError] = useState('')

  // 대댓글(무제한 중첩)용 상태. 이 댓글 "본인"의 답글 목록에 대한 펼침/작성 상태이므로
  // 각 CommentItem 인스턴스가 스스로 관리한다(부모가 미리 계산해서 넘겨줄 필요 없음 -
  // 트리 깊이가 가변적이라 이 편이 훨씬 단순하다).
  const [repliesExpanded, setRepliesExpanded] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  // 내 자식 답글들 중 "지금 편집 중인 것"은 나만 알면 되므로 로컬로 관리한다.
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null)

  // UI 노출은 사용성 편의일 뿐, 실제 허용 여부는 Backend의 IsCommentMineOrAdminGuard가 최종 판단한다.
  const canManage = enableActions && user !== null && (user.id === author.id || user.role === 'ADMIN')
  const showEditMode = enableActions && isEditing

  const startEdit = () => {
    setEditedContent(content)
    setError('')
    onStartEdit()
  }

  const cancelEdit = () => {
    setEditedContent(content)
    setError('')
    onStopEdit()
  }

  const handleSave = () => {
    const trimmed = editedContent.trim()

    if (!trimmed || updateComment.isPending) {
      return
    }

    setError('')

    updateComment.mutate(
      { commentId: id, comment: trimmed },
      {
        onSuccess: () => {
          onStopEdit()
        },
        onError: (err) => {
          setError(getErrorMessage(err, UPDATE_FALLBACK_ERROR))
        },
      },
    )
  }

  const handleDelete = () => {
    if (deleteComment.isPending) {
      return
    }

    if (!window.confirm('댓글을 삭제하시겠습니까?')) {
      return
    }

    setError('')

    deleteComment.mutate(id, {
      onError: (err) => {
        setError(getErrorMessage(err, DELETE_FALLBACK_ERROR))
      },
    })
  }

  // PostCard.tsx와 동일한 이유(리렌더 지연으로 인한 isPending stale 읽기 방지)로 ref를 사용한다.
  const isTogglingLikeRef = useRef(false)

  const handleToggleLike = () => {
    if (!enableActions || isTogglingLikeRef.current) {
      return
    }

    isTogglingLikeRef.current = true
    toggleLike.mutate(
      { commentId: id, liked: isLiked === true },
      { onSettled: () => { isTogglingLikeRef.current = false } },
    )
  }

  const {
    data: repliesData,
    isPending: isRepliesPending,
    hasNextPage: hasNextReplyPage,
    isFetchingNextPage: isFetchingNextReplyPage,
    fetchNextPage: fetchNextReplyPage,
  } = useCommentRepliesInfiniteQuery(postId, id, { enabled: repliesExpanded })
  const replies = repliesData?.pages.flatMap((page) => page.data.map((reply) => toCommentItemComment(reply, postId))) ?? []

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current

    if (!sentinel || !hasNextReplyPage) {
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextReplyPage && !isFetchingNextReplyPage) {
        fetchNextReplyPage()
      }
    })

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasNextReplyPage, isFetchingNextReplyPage, fetchNextReplyPage])

  return (
    <article className="border-b px-4 py-3">
      <div className="flex gap-3">
        <button type="button" onClick={() => navigate(`/profile/${author.id}`)} className="shrink-0">
          <Avatar>
            <AvatarImage src={author.profileImage} alt={author.nickname} />
            <AvatarFallback>{author.nickname.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1 text-sm">
              <button
                type="button"
                onClick={() => navigate(`/profile/${author.id}`)}
                className="min-w-0 truncate font-semibold hover:underline"
              >
                {author.nickname}
              </button>
              <span className="text-muted-foreground">@{author.handle}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{formatRelativeTime(createdAt)}</span>
            </div>

            {canManage && !showEditMode && (
              <div className="flex shrink-0 gap-1 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded-full px-2 py-1 hover:bg-muted hover:text-foreground"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteComment.isPending}
                  className="rounded-full px-2 py-1 hover:bg-muted hover:text-destructive"
                >
                  {deleteComment.isPending ? '삭제 중...' : '삭제'}
                </button>
              </div>
            )}
          </div>

          {showEditMode ? (
            <div className="mt-1">
              <Textarea
                value={editedContent}
                onChange={(event) => setEditedContent(event.target.value)}
                className="min-h-12 resize-none text-sm"
                disabled={updateComment.isPending}
              />
              <div className="mt-1.5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={cancelEdit}
                  disabled={updateComment.isPending}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  onClick={handleSave}
                  disabled={editedContent.trim().length === 0 || updateComment.isPending}
                >
                  {updateComment.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 whitespace-pre-wrap text-sm">{content}</p>
          )}

          {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={toggleLike.isPending}
              className={`flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted ${
                isLiked ? 'text-red-500 hover:text-red-500' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Heart className={`size-4 ${isLiked ? 'fill-red-500' : ''}`} />
              {likeCount > 0 && likeCount}
            </button>

            {enableActions && (
              <button
                type="button"
                onClick={() => setIsReplying((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-full p-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <MessageCircle className="size-4" />
                답글
              </button>
            )}
          </div>

          {isReplying && (
            <div className="mt-1 -ml-1">
              <CommentComposer
                postId={postId}
                parentId={id}
                placeholder={`${author.nickname}님에게 답글 게시하기`}
                onSuccess={() => {
                  setIsReplying(false)
                  setRepliesExpanded(true)
                }}
              />
            </div>
          )}

          {replyCount > 0 && (
            <button
              type="button"
              onClick={() => setRepliesExpanded((prev) => !prev)}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              {repliesExpanded ? '답글 숨기기' : `답글 ${replyCount}개 보기`}
            </button>
          )}
        </div>
      </div>

      {repliesExpanded && (
        <div className="mt-1 ml-6 border-l pl-3">
          {isRepliesPending && (
            <p className="py-3 text-sm text-muted-foreground">답글을 불러오는 중...</p>
          )}

          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              enableActions={enableActions}
              isEditing={editingReplyId === reply.id}
              onStartEdit={() => setEditingReplyId(reply.id)}
              onStopEdit={() => setEditingReplyId(null)}
            />
          ))}

          {hasNextReplyPage && (
            <div ref={sentinelRef} className="py-3 text-center">
              {isFetchingNextReplyPage && (
                <p className="text-xs text-muted-foreground">불러오는 중...</p>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default CommentItem
