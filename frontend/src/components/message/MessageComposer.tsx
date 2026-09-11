import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MessageComposerProps {
  onSend: (content: string) => void
}

function MessageComposer({ onSend }: MessageComposerProps) {
  const [content, setContent] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    const trimmed = content.trim()

    if (!trimmed) {
      return
    }

    // socket 발신은 fire-and-forget이다. 로컬에서 임시 메시지를 만들어 화면에 먼저
    // 붙이지 않고(중복 방지), 서버가 저장 후 되돌려주는 receive_message를 받아야만
    // 화면에 보인다(useChatSocket 참고) - 입력창은 그와 무관하게 바로 비운다.
    onSend(trimmed)
    setContent('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t px-4 py-3">
      {/* 이미지 메시지는 이번 범위에서 구현하지 않아 버튼 자체를 숨긴다. */}

      <input
        type="text"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="쪽지 보내기"
        className="flex-1 rounded-full border px-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
      />

      <Button type="submit" size="icon" className="shrink-0 rounded-full" disabled={content.trim().length === 0}>
        <Send className="size-4" />
      </Button>
    </form>
  )
}

export default MessageComposer
