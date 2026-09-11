import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import UserSearchPicker from '@/components/message/UserSearchPicker'
import { useInviteChatMembersMutation } from '@/hooks/useChats'
import { getErrorMessage } from '@/lib/apiError'
import type { ApiUserSearchResult } from '@/types/user'

const FALLBACK_ERROR_MESSAGE = '초대하지 못했습니다. 잠시 후 다시 시도해주세요.'

interface InviteMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId: number
  // 이미 활성 상태인 멤버 id(본인 포함) - 검색 목록에서 제외한다.
  activeMemberIds: number[]
}

// GroupMembersDialog가 OWNER에게만 열도록 노출한다(여기서는 별도로 재검증하지 않고
// Backend가 403으로도 방어한다).
function InviteMembersDialog({ open, onOpenChange, chatId, activeMemberIds }: InviteMembersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>멤버 초대</DialogTitle>
        </DialogHeader>

        <InviteMembersForm chatId={chatId} activeMemberIds={activeMemberIds} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function InviteMembersForm({
  chatId,
  activeMemberIds,
  onClose,
}: {
  chatId: number
  activeMemberIds: number[]
  onClose: () => void
}) {
  const invite = useInviteChatMembersMutation(chatId)
  const isSavingRef = useRef(false)

  const [selectedUsers, setSelectedUsers] = useState<ApiUserSearchResult[]>([])
  const [error, setError] = useState('')

  const toggleUser = (user: ApiUserSearchResult) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user],
    )
  }

  const handleSubmit = () => {
    if (isSavingRef.current || invite.isPending) {
      return
    }

    if (selectedUsers.length === 0) {
      setError('초대할 사용자를 선택해주세요.')
      return
    }

    setError('')
    isSavingRef.current = true

    invite.mutate(
      selectedUsers.map((u) => u.id),
      {
        onSuccess: () => {
          isSavingRef.current = false
          setSelectedUsers([])
          onClose()
        },
        onError: (err) => {
          isSavingRef.current = false
          setError(getErrorMessage(err, FALLBACK_ERROR_MESSAGE))
        },
      },
    )
  }

  // 이미 활성 멤버 + 이미 선택된 사용자는 검색 목록에서 제외.
  const excludeIds = [...activeMemberIds, ...selectedUsers.map((u) => u.id)]

  return (
    <>
      <div className="flex flex-col gap-3">
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
                  disabled={invite.isPending}
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
          <Label>초대할 사용자</Label>
          <UserSearchPicker excludeIds={excludeIds} onToggle={toggleUser} disabled={invite.isPending} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" className="rounded-full" onClick={onClose} disabled={invite.isPending}>
          Cancel
        </Button>
        <Button className="rounded-full" onClick={handleSubmit} disabled={invite.isPending}>
          {invite.isPending ? '초대하는 중...' : '초대하기'}
        </Button>
      </DialogFooter>
    </>
  )
}

export default InviteMembersDialog
