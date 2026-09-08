import { useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/useAuth'
import { useCreatePostMutation } from '@/hooks/usePosts'
import { getErrorMessage } from '@/lib/apiError'
import { createPendingImages, MAX_POST_IMAGES, revokePendingImage, type PendingImage } from '@/lib/pendingImage'

const FALLBACK_ERROR_MESSAGE = '게시글을 작성하지 못했습니다. 잠시 후 다시 시도해주세요.'

function PostComposer() {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [images, setImages] = useState<PendingImage[]>([])
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createPost = useCreatePostMutation()

  const clearImages = () => {
    images.forEach(revokePendingImage)
    setImages([])

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = '' // 같은 파일을 다시 선택해도 change가 또 발생하도록

    if (files.length === 0) {
      return
    }

    const remainingSlots = MAX_POST_IMAGES - images.length
    setImages((prev) => [...prev, ...createPendingImages(files.slice(0, remainingSlots))])
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((image) => image.id === id)

      if (target) {
        revokePendingImage(target)
      }

      return prev.filter((image) => image.id !== id)
    })
  }

  const handleSubmit = () => {
    const trimmed = content.trim()

    if (!trimmed || createPost.isPending) {
      return
    }

    setError('')

    createPost.mutate(
      { content: trimmed, imageFiles: images.map((image) => image.file) },
      {
        onSuccess: () => {
          setContent('')
          clearImages()
        },
        onError: (err) => {
          // 실패 시 content/이미지는 그대로 남겨 재시도할 수 있게 한다.
          setError(getErrorMessage(err, FALLBACK_ERROR_MESSAGE))
        },
      },
    )
  }

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
          disabled={createPost.isPending}
        />

        {images.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {images.map((image) => (
              <div key={image.id} className="relative">
                <img
                  src={image.previewUrl}
                  alt="첨부 이미지 미리보기"
                  className="h-32 w-full rounded-2xl border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  disabled={createPost.isPending}
                  className="absolute -top-2 -right-2 rounded-full bg-foreground p-1 text-background hover:opacity-80"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

        <div className="mt-2 flex items-center justify-between border-t pt-2">
          {/*
            multiple을 쓰면 한 번에 여러 장을 고를 때 브라우저/OS 파일 선택창이 반환하는
            순서가 실제로 클릭/선택한 순서와 다를 수 있어(파일명 등 자체 정렬 기준을 따름),
            의도한 순서가 보장되도록 한 번에 한 장만 선택하게 하고 "+"를 반복 클릭해 추가한다.
          */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={createPost.isPending || images.length >= MAX_POST_IMAGES}
              className="rounded-full p-2 text-primary hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40"
            >
              <ImagePlus className="size-5" />
            </button>
            {images.length >= MAX_POST_IMAGES && (
              <span className="text-xs text-muted-foreground">최대 {MAX_POST_IMAGES}장까지 첨부할 수 있어요</span>
            )}
          </div>
          <Button
            className="rounded-full"
            disabled={content.trim().length === 0 || createPost.isPending}
            onClick={handleSubmit}
          >
            {createPost.isPending ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PostComposer
