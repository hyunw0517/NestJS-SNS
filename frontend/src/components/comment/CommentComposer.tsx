import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/useAuth'
import { useCreateCommentMutation } from '@/hooks/useComments'
import { getErrorMessage } from '@/lib/apiError'

const FALLBACK_ERROR_MESSAGE = '댓글을 작성하지 못했습니다. 잠시 후 다시 시도해주세요.'

interface CommentComposerProps {
  postId: number
  // 있으면 그 댓글에 대한 답글(대댓글) 작성, 없으면 게시글에 직접 다는 최상위 댓글 작성.
  parentId?: number
  placeholder?: string
  onSuccess?: () => void
}

function CommentComposer({ postId, parentId, placeholder = '답글 게시하기', onSuccess }: CommentComposerProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const createComment = useCreateCommentMutation(postId)

  const handleSubmit = () => {
    const trimmed = content.trim()

    if (!trimmed || createComment.isPending) {
      return
    }

    setError('')

    createComment.mutate(
      { comment: trimmed, parentId },
      {
        onSuccess: () => {
          setContent('')
          onSuccess?.()
        },
        onError: (err) => {
          // 실패 시 입력 내용은 그대로 남겨 재시도할 수 있게 한다.
          setError(getErrorMessage(err, FALLBACK_ERROR_MESSAGE))
        },
      },
    )
  }

  return (
    <div className="flex gap-3 border-b px-4 py-3">
      <Avatar size="sm">
        <AvatarImage src={user?.profileImage ?? undefined} alt={user?.nickname ?? '나'} />
        <AvatarFallback>{user?.nickname.slice(0, 1) ?? '나'}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={placeholder}
          className="min-h-12 resize-none border-none px-0 shadow-none focus-visible:ring-0"
          disabled={createComment.isPending}
        />

        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

        <div className="mt-2 flex justify-end">
          <Button
            className="rounded-full"
            disabled={content.trim().length === 0 || createComment.isPending}
            onClick={handleSubmit}
          >
            {createComment.isPending ? 'Posting...' : 'Reply'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CommentComposer
