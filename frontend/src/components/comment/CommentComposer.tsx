import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/useAuth'

function CommentComposer() {
  const { user } = useAuth()
  const [content, setContent] = useState('')

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
          placeholder="답글 게시하기"
          className="min-h-12 resize-none border-none px-0 shadow-none focus-visible:ring-0"
        />

        <div className="mt-2 flex justify-end">
          <Button className="rounded-full" disabled={content.trim().length === 0}>
            Reply
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CommentComposer
