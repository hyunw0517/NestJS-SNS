import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/useAuth'
import { useUpdateProfileMutation } from '@/hooks/useUsers'
import { getErrorMessage } from '@/lib/apiError'

const FALLBACK_ERROR_MESSAGE = '프로필을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'

export interface EditProfileInitialValues {
  nickname: string
  handle: string | null
  bio: string | null
  profileImage: string | null
  coverImage: string | null
}

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues: EditProfileInitialValues
}

// Dialog는 open을 제어만 하고, 실제 폼 상태는 EditProfileForm에서만 갖는다.
// Radix Dialog.Content는 open=false면 언마운트되므로(별도 forceMount 없음), 다이얼로그를
// 열 때마다 EditProfileForm이 새로 mount되어 initialValues 기준으로 state가 초기화된다
// (취소 후 재오픈, 다른 시점의 값으로 재오픈 모두 이 방식으로 자연스럽게 해결됨 - effect로
// 상태를 동기화할 필요가 없다).
function EditProfileDialog({ open, onOpenChange, initialValues }: EditProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <EditProfileForm initialValues={initialValues} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

// 이미지 하나(profileImage/coverImage)의 "다음에 저장할 상태"를 표현한다.
// keep: 기존 이미지 그대로 / removed: 사용자가 명시적으로 제거 / file: 새로 고른 파일
type ImageEditState = { kind: 'keep' } | { kind: 'removed' } | { kind: 'file'; file: File; previewUrl: string }

function EditProfileForm({
  initialValues,
  onClose,
}: {
  initialValues: EditProfileInitialValues
  onClose: () => void
}) {
  const { refreshUser } = useAuth()
  const updateProfile = useUpdateProfileMutation()
  const isSavingRef = useRef(false)

  const [nickname, setNickname] = useState(initialValues.nickname)
  const [handle, setHandle] = useState(initialValues.handle ?? '')
  const [bio, setBio] = useState(initialValues.bio ?? '')
  const [profileImageState, setProfileImageState] = useState<ImageEditState>({ kind: 'keep' })
  const [coverImageState, setCoverImageState] = useState<ImageEditState>({ kind: 'keep' })
  const [error, setError] = useState('')

  const profileFileInputRef = useRef<HTMLInputElement>(null)
  const coverFileInputRef = useRef<HTMLInputElement>(null)

  const revokeIfFile = (state: ImageEditState) => {
    if (state.kind === 'file') {
      URL.revokeObjectURL(state.previewUrl)
    }
  }

  // state가 'file'을 벗어나거나(다른 파일 선택/제거) 컴포넌트가 언마운트될 때(다이얼로그가
  // 저장/취소/Escape/오버레이 클릭 등 어떤 경로로 닫히든) 직전 blob URL을 정리한다.
  // cleanup 함수는 다음 렌더 직전과 unmount 시 모두 실행되므로 두 경우를 함께 커버한다.
  useEffect(() => {
    return () => revokeIfFile(profileImageState)
  }, [profileImageState])

  useEffect(() => {
    return () => revokeIfFile(coverImageState)
  }, [coverImageState])

  const handleFileChange =
    (setState: (state: ImageEditState) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''

      if (!file) {
        return
      }

      setState({ kind: 'file', file, previewUrl: URL.createObjectURL(file) })
    }

  const removeImage = (setState: (state: ImageEditState) => void) => {
    setState({ kind: 'removed' })
  }

  const handleCancel = () => {
    // 다이얼로그가 닫히면서 이 컴포넌트가 언마운트되고, 그 시점에 위 effect들이 새로
    // 골랐던 파일의 미리보기 URL을 정리한다. state는 언마운트되므로 별도로 되돌릴 필요가 없다.
    onClose()
  }

  const profileImagePreviewUrl =
    profileImageState.kind === 'file'
      ? profileImageState.previewUrl
      : profileImageState.kind === 'removed'
        ? undefined
        : (initialValues.profileImage ?? undefined)

  const coverImagePreviewUrl =
    coverImageState.kind === 'file'
      ? coverImageState.previewUrl
      : coverImageState.kind === 'removed'
        ? undefined
        : (initialValues.coverImage ?? undefined)

  const handleSave = () => {
    if (isSavingRef.current || updateProfile.isPending) {
      return
    }

    const trimmedNickname = nickname.trim()

    if (!trimmedNickname) {
      setError('닉네임을 입력해주세요.')
      return
    }

    setError('')
    isSavingRef.current = true

    const trimmedHandle = handle.trim()
    const trimmedBio = bio.trim()

    const toImagePayload = (state: ImageEditState): File | null | undefined => {
      if (state.kind === 'keep') return undefined
      if (state.kind === 'removed') return null
      return state.file
    }

    updateProfile.mutate(
      {
        nickname: trimmedNickname,
        handle: trimmedHandle === '' ? null : trimmedHandle,
        bio: trimmedBio === '' ? null : trimmedBio,
        profileImage: toImagePayload(profileImageState),
        coverImage: toImagePayload(coverImageState),
      },
      {
        onSuccess: async () => {
          await refreshUser()
          isSavingRef.current = false
          onClose()
        },
        onError: (err) => {
          isSavingRef.current = false
          setError(getErrorMessage(err, FALLBACK_ERROR_MESSAGE))
        },
      },
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="relative -mx-5 -mt-1">
          <div className="h-28 w-full bg-muted">
            {coverImagePreviewUrl && (
              <img src={coverImagePreviewUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="absolute top-2 right-6 flex gap-1">
            <button
              type="button"
              aria-label="커버 이미지 변경"
              onClick={() => coverFileInputRef.current?.click()}
              disabled={updateProfile.isPending}
              className="rounded-full bg-background/80 p-1.5 hover:bg-background disabled:pointer-events-none disabled:opacity-40"
            >
              <Camera className="size-4" />
            </button>
            {coverImagePreviewUrl && (
              <button
                type="button"
                aria-label="커버 이미지 제거"
                onClick={() => removeImage(setCoverImageState)}
                disabled={updateProfile.isPending}
                className="rounded-full bg-background/80 p-1.5 hover:bg-background disabled:pointer-events-none disabled:opacity-40"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <input
            ref={coverFileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange(setCoverImageState)}
            className="hidden"
          />

          <div className="absolute -bottom-8 left-4">
            <div className="relative">
              <Avatar size="lg" className="size-16 ring-4 ring-background">
                <AvatarImage src={profileImagePreviewUrl} alt={nickname} />
                <AvatarFallback>{nickname.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                aria-label="프로필 이미지 변경"
                onClick={() => profileFileInputRef.current?.click()}
                disabled={updateProfile.isPending}
                className="absolute -right-1 -bottom-1 rounded-full bg-background p-1 ring-2 ring-background hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                <Camera className="size-3.5" />
              </button>
              {profileImagePreviewUrl && (
                <button
                  type="button"
                  aria-label="프로필 이미지 제거"
                  onClick={() => removeImage(setProfileImageState)}
                  disabled={updateProfile.isPending}
                  className="absolute -top-1 -right-1 rounded-full bg-foreground p-0.5 text-background hover:opacity-80 disabled:pointer-events-none disabled:opacity-40"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>
          <input
            ref={profileFileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange(setProfileImageState)}
            className="hidden"
          />
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-profile-nickname">Nickname</Label>
            <Input
              id="edit-profile-nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={20}
              disabled={updateProfile.isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-profile-handle">Handle</Label>
            <Input
              id="edit-profile-handle"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="handle 없음"
              maxLength={30}
              disabled={updateProfile.isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-profile-bio">Bio</Label>
            <Textarea
              id="edit-profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={200}
              className="min-h-20 resize-none"
              disabled={updateProfile.isPending}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" className="rounded-full" onClick={handleCancel} disabled={updateProfile.isPending}>
          Cancel
        </Button>
        <Button className="rounded-full" onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </>
  )
}

export default EditProfileDialog
