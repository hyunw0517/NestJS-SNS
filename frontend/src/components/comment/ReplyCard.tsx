import { useNavigate } from 'react-router-dom'
import CommentItem from '@/components/comment/CommentItem'
import type { Comment } from '@/types/comment'

interface ReplyCardProps {
  comment: Comment
  postId: number
  // 원글 미리보기 한 줄. CommentItem은 PostDetail 전용이라 "어느 게시글에 단
  // 댓글인지" 표시할 방법이 없어서, 그 context만 얇게 덧붙이는 wrapper.
  postContent: string
  isEditing?: boolean
  onStartEdit?: () => void
  onStopEdit?: () => void
}

function ReplyCard({ comment, postId, postContent, isEditing = false, onStartEdit = () => {}, onStopEdit = () => {} }: ReplyCardProps) {
  const navigate = useNavigate()

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(`/posts/${postId}`)}
        className="block w-full truncate px-4 pt-3 text-left text-xs text-muted-foreground hover:underline"
      >
        원글: {postContent}
      </button>
      <CommentItem
        comment={comment}
        postId={postId}
        enableActions
        isEditing={isEditing}
        onStartEdit={onStartEdit}
        onStopEdit={onStopEdit}
      />
    </div>
  )
}

export default ReplyCard
