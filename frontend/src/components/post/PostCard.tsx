import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Heart, ImagePlus, MessageCircle, Repeat2, Share, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/useAuth'
import { useDeletePostMutation, useTogglePostLikeMutation, useUpdatePostMutation } from '@/hooks/usePosts'
import { getErrorMessage } from '@/lib/apiError'
import { createPendingImages, extractImageFileName, MAX_POST_IMAGES, revokePendingImage, type PendingImage } from '@/lib/pendingImage'
import type { Post } from '@/types/post'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

const UPDATE_FALLBACK_ERROR = '게시글을 수정하지 못했습니다. 잠시 후 다시 시도해주세요.'
const DELETE_FALLBACK_ERROR = '게시글을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.'

interface ExistingImage {
  fileName: string
  url: string
}

interface PostCardProps {
  post: Post
  // 실제 게시글 수정/삭제가 가능한 화면(Home, Profile Posts/Media)에서만 true로 넘긴다.
  // 이 값만으로 수정/삭제 버튼이 보이는 건 아니고, 실제 소유자 여부는 아래 canManage가
  // 다시 확인한다(Backend IsPostMineOrAdminGuard가 최종 판단하는 것과 별개의 UI 가드).
  enableActions?: boolean
  isEditing?: boolean
  onStartEdit?: () => void
  onStopEdit?: () => void
}

function PostCard({ post, enableActions = false, isEditing = false, onStartEdit = () => {}, onStopEdit = () => {} }: PostCardProps) {
  const { id, author, content, createdAt, likeCount, commentCount, repostCount, images, isLiked } = post
  const { user } = useAuth()
  const navigate = useNavigate()
  const updatePost = useUpdatePostMutation()
  const deletePost = useDeletePostMutation()
  const toggleLike = useTogglePostLikeMutation()

  const [editedContent, setEditedContent] = useState(content)
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
  const [newImages, setNewImages] = useState<PendingImage[]>([])
  const [imagesTouched, setImagesTouched] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 카드가 편집 중 그대로 언마운트되는 드문 경우(예: 다른 곳에서 삭제됨)에도
  // newImages의 blob 미리보기 URL이 새도록 두지 않는다.
  const newImagesRef = useRef(newImages)
  useEffect(() => {
    newImagesRef.current = newImages
  })
  useEffect(() => {
    return () => {
      newImagesRef.current.forEach(revokePendingImage)
    }
  }, [])

  // UI 노출은 사용성 편의일 뿐, 실제 허용 여부는 Backend의 IsPostMineOrAdminGuard가 최종 판단한다.
  const canManage = enableActions && user !== null && (user.id === author.id || user.role === 'ADMIN')
  const showEditMode = enableActions && isEditing

  const totalEditingImageCount = existingImages.length + newImages.length

  const resetEditState = () => {
    setEditedContent(content)
    newImages.forEach(revokePendingImage)
    setNewImages([])
    setExistingImages((images ?? []).map((url) => ({ url, fileName: extractImageFileName(url) })))
    setImagesTouched(false)
    setError('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const startEdit = () => {
    // 다른 카드로 편집 포커스가 강제로 옮겨졌다가 다시 돌아온 경우처럼, 정리 안 된
    // newImages(미리보기 blob URL)가 남아있을 수 있어 resetEditState로 항상 정리 후 시작한다.
    resetEditState()
    onStartEdit()
  }

  const cancelEdit = () => {
    resetEditState()
    onStopEdit()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (files.length === 0) {
      return
    }

    const remainingSlots = MAX_POST_IMAGES - totalEditingImageCount
    setNewImages((prev) => [...prev, ...createPendingImages(files.slice(0, remainingSlots))])
    setImagesTouched(true)
  }

  const removeExistingImage = (fileName: string) => {
    setExistingImages((prev) => prev.filter((image) => image.fileName !== fileName))
    setImagesTouched(true)
  }

  const removeNewImage = (imageId: string) => {
    setNewImages((prev) => {
      const target = prev.find((image) => image.id === imageId)

      if (target) {
        revokePendingImage(target)
      }

      return prev.filter((image) => image.id !== imageId)
    })
    setImagesTouched(true)
  }

  const handleSave = () => {
    const trimmed = editedContent.trim()

    if (!trimmed || updatePost.isPending) {
      return
    }

    setError('')

    const imagesChange = imagesTouched
      ? { keepFileNames: existingImages.map((image) => image.fileName), newFiles: newImages.map((image) => image.file) }
      : undefined

    updatePost.mutate(
      { postId: id, content: trimmed, imagesChange },
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
    if (deletePost.isPending) {
      return
    }

    if (!window.confirm('게시글을 삭제하시겠습니까?')) {
      return
    }

    setError('')

    deletePost.mutate(id, {
      onError: (err) => {
        setError(getErrorMessage(err, DELETE_FALLBACK_ERROR))
      },
    })
  }

  // toggleLike.isPending(리액트 상태)만 보면, 같은 이벤트 루프 안에서 연속으로 클릭이
  // 들어올 때 아직 리렌더가 반영되기 전이라 isPending이 stale하게 false로 읽혀
  // 중복 요청이 나갈 수 있다. ref는 렌더와 무관하게 즉시 갱신되므로 이를 막는다.
  const isTogglingLikeRef = useRef(false)

  const handleToggleLike = () => {
    if (!enableActions || isTogglingLikeRef.current) {
      return
    }

    isTogglingLikeRef.current = true
    toggleLike.mutate(
      { postId: id, liked: isLiked === true },
      { onSettled: () => { isTogglingLikeRef.current = false } },
    )
  }

  return (
    <article className="flex gap-3 border-b px-4 py-3">
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
                disabled={deletePost.isPending}
                className="rounded-full px-2 py-1 hover:bg-muted hover:text-destructive"
              >
                {deletePost.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          )}
        </div>

        {showEditMode ? (
          <div className="mt-1">
            <Textarea
              value={editedContent}
              onChange={(event) => setEditedContent(event.target.value)}
              className="min-h-16 resize-none text-sm"
              disabled={updatePost.isPending}
            />

            {(existingImages.length > 0 || newImages.length > 0) && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {existingImages.map((image) => (
                  <div key={image.fileName} className="relative">
                    <img src={image.url} alt="" className="h-32 w-full rounded-2xl border object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(image.fileName)}
                      disabled={updatePost.isPending}
                      className="absolute -top-2 -right-2 rounded-full bg-foreground p-1 text-background hover:opacity-80"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {newImages.map((image) => (
                  <div key={image.id} className="relative">
                    <img
                      src={image.previewUrl}
                      alt="첨부 이미지 미리보기"
                      className="h-32 w-full rounded-2xl border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(image.id)}
                      disabled={updatePost.isPending}
                      className="absolute -top-2 -right-2 rounded-full bg-foreground p-1 text-background hover:opacity-80"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 flex items-center gap-2">
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={updatePost.isPending || totalEditingImageCount >= MAX_POST_IMAGES}
                className="rounded-full p-2 text-primary hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40"
              >
                <ImagePlus className="size-5" />
              </button>
              {totalEditingImageCount >= MAX_POST_IMAGES && (
                <span className="text-xs text-muted-foreground">최대 {MAX_POST_IMAGES}장까지 첨부할 수 있어요</span>
              )}
            </div>

            <div className="mt-1.5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={cancelEdit}
                disabled={updatePost.isPending}
              >
                취소
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={handleSave}
                disabled={editedContent.trim().length === 0 || updatePost.isPending}
              >
                {updatePost.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        ) : (
          // 게시글 본문/이미지 클릭 시 상세 페이지로 이동. 헤더의 수정/삭제, 하단 액션
          // 버튼들은 이 영역 밖에 있어 클릭해도 상세로 이동하지 않는다.
          <div onClick={() => navigate(`/posts/${id}`)} className="cursor-pointer">
            <p className="mt-0.5 whitespace-pre-wrap text-sm">{content}</p>

            {images && images.length > 0 && (
              <div className={`mt-2 overflow-hidden rounded-2xl border ${images.length > 1 ? 'grid grid-cols-2 gap-0.5' : ''}`}>
                {images.length === 1 ? (
                  <img src={images[0]} alt="" className="max-h-96 w-full object-cover" />
                ) : (
                  images.map((imageUrl) => <img key={imageUrl} src={imageUrl} alt="" className="h-40 w-full object-cover" />)
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

        <div className="mt-2 flex max-w-md items-center justify-between text-muted-foreground">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted hover:text-foreground"
          >
            <MessageCircle className="size-4" />
            {commentCount > 0 && commentCount}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted hover:text-foreground"
          >
            <Repeat2 className="size-4" />
            {(repostCount ?? 0) > 0 && repostCount}
          </button>
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={toggleLike.isPending}
            className={`flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted ${
              isLiked ? 'text-red-500 hover:text-red-500' : 'hover:text-foreground'
            }`}
          >
            <Heart className={`size-4 ${isLiked ? 'fill-red-500' : ''}`} />
            {likeCount > 0 && likeCount}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full p-1.5 text-xs hover:bg-muted hover:text-foreground"
          >
            <Share className="size-4" />
          </button>
        </div>
      </div>
    </article>
  )
}

export default PostCard
