import { useState } from 'react'
import { ImagePlus, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

function MessageComposer() {
  const [content, setContent] = useState('')

  return (
    <div className="flex items-center gap-2 border-t px-4 py-3">
      <button type="button" className="shrink-0 rounded-full p-2 text-primary hover:bg-primary/10">
        <ImagePlus className="size-5" />
      </button>

      <input
        type="text"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="쪽지 보내기"
        className="flex-1 rounded-full border px-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
      />

      <Button size="icon" className="shrink-0 rounded-full" disabled={content.trim().length === 0}>
        <Send className="size-4" />
      </Button>
    </div>
  )
}

export default MessageComposer
