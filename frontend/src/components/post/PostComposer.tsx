import { useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/useAuth'

function PostComposer() {
  const { user } = useAuth()
  const [content, setContent] = useState('')

  return (
    <div className="flex gap-3 border-b px-4 py-3">
      <Avatar>
        <AvatarImage src={user?.profileImage ?? undefined} alt={user?.nickname ?? '나'} />
        <AvatarFallback>{user?.nickname.slice(0, 1) ?? '나'}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="무슨 일이 일어나고 있나요?"
          className="min-h-20 resize-none border-none px-0 shadow-none focus-visible:ring-0"
        />

        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <button type="button" className="rounded-full p-2 text-primary hover:bg-primary/10">
            <ImagePlus className="size-5" />
          </button>
          <Button className="rounded-full" disabled={content.trim().length === 0}>
            Post
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PostComposer
