import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import UserSearchPicker from '@/components/message/UserSearchPicker'
import { useAuth } from '@/context/useAuth'
import { useCreateGroupChatMutation } from '@/hooks/useChats'
import { getErrorMessage } from '@/lib/apiError'
import type { ApiUserSearchResult } from '@/types/user'

const FALLBACK_ERROR_MESSAGE = '그룹을 만들지 못했습니다. 잠시 후 다시 시도해주세요.'
const MIN_SELECTED_USERS = 2

interface GroupCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Dialog는 open일 때만 내용을 mount한다(EditProfileDialog와 동일 관례) - 열 때마다
// GroupCreateForm이 새로 mount되어 폼 상태가 빈 값으로 초기화된다.
function GroupCreateDialog({ open, onOpenChange }: GroupCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>새 그룹 만들기</DialogTitle>
        </DialogHeader>

        <GroupCreateForm onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function GroupCreateForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const createGroup = useCreateGroupChatMutation()
  const isSavingRef = useRef(false)

  const [name, setName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<ApiUserSearchResult[]>([])
  const [error, setError] = useState('')

  const toggleUser = (user: ApiUserSearchResult) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user],
    )
  }

  const handleSubmit = () => {
    if (isSavingRef.current || createGroup.isPending) {
      return
    }

    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('그룹 이름을 입력해주세요.')
      return
    }

    // 로그인 사용자 본인은 Backend가 자동 포함(OWNER)하므로, 선택 목록에는 최소
    // 2명(본인 포함 총 3명)이 있어야 한다.
    if (selectedUsers.length < MIN_SELECTED_USERS) {
      setError(`본인 외 최소 ${MIN_SELECTED_USERS}명을 선택해주세요.`)
      return
    }

    setError('')
    isSavingRef.current = true

    createGroup.mutate(
      { name: trimmedName, userIds: selectedUsers.map((u) => u.id) },
      {
        onSuccess: (chat) => {
          isSavingRef.current = false
          onClose()
          navigate(`/messages/${chat.id}`)
        },
        onError: (err) => {
          isSavingRef.current = false
          setError(getErrorMessage(err, FALLBACK_ERROR_MESSAGE))
        },
      },
    )
  }

  // 본인(자동 포함) + 이미 선택된 사용자는 검색 목록에서 제외해 중복 선택을 막는다.
  const excludeIds = [...(currentUser ? [currentUser.id] : []), ...selectedUsers.map((u) => u.id)]

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-create-name">그룹 이름</Label>
          <Input
            id="group-create-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="그룹 이름"
            maxLength={50}
            disabled={createGroup.isPending}
          />
        </div>

        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedUsers.map((user) => (
              <span
                key={user.id}
                className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
              >
                {user.nickname}
                <button
                  type="button"
                  onClick={() => toggleUser(user)}
                  disabled={createGroup.isPending}
                  aria-label={`${user.nickname} 선택 해제`}
                  className="disabled:pointer-events-none"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>멤버 선택</Label>
          <UserSearchPicker excludeIds={excludeIds} onToggle={toggleUser} disabled={createGroup.isPending} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" className="rounded-full" onClick={onClose} disabled={createGroup.isPending}>
          Cancel
        </Button>
        <Button className="rounded-full" onClick={handleSubmit} disabled={createGroup.isPending}>
          {createGroup.isPending ? '만드는 중...' : '만들기'}
        </Button>
      </DialogFooter>
    </>
  )
}

export default GroupCreateDialog
