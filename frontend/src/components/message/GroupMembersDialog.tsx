import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, UserPlus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import InviteMembersDialog from '@/components/message/InviteMembersDialog'
import { useChatMembersQuery, useLeaveChatMutation } from '@/hooks/useChats'

interface GroupMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId: number
  currentUserId: number
  onLeaveChatRoom: (chatId: number) => void
}

// GROUP 전용(DIRECT는 애초에 호출하는 쪽인 ChatPanel에서 열지 않는다).
function GroupMembersDialog({ open, onOpenChange, chatId, currentUserId, onLeaveChatRoom }: GroupMembersDialogProps) {
  const navigate = useNavigate()
  const membersQuery = useChatMembersQuery(chatId, { enabled: open })
  const leaveChat = useLeaveChatMutation()
  const isLeavingRef = useRef(false)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)

  const members = membersQuery.data ?? []
  const currentMembership = members.find((member) => member.id === currentUserId)
  const isOwner = currentMembership?.role === 'OWNER'

  // window.confirm() 대신 AlertDialog를 쓰는 이유는 FollowListDialog에서 실제로 겪은
  // nested-event-loop 재진입 버그(빠른 연속 클릭 시 confirm이 여러 번 열림) 때문 -
  // 여기서도 동일한 관례를 따른다.
  const handleLeave = () => {
    if (isLeavingRef.current) {
      return
    }

    isLeavingRef.current = true

    leaveChat.mutate(chatId, {
      onSuccess: () => {
        isLeavingRef.current = false
        onLeaveChatRoom(chatId)
        onOpenChange(false)
        navigate('/messages')
      },
      onError: () => {
        isLeavingRef.current = false
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-3">
        <DialogHeader>
          <DialogTitle>멤버 {members.length > 0 ? `${members.length}명` : ''}</DialogTitle>
        </DialogHeader>

        <div className="-mx-5 max-h-64 overflow-y-auto border-y">
          {membersQuery.isPending && <p className="px-5 py-6 text-center text-sm text-muted-foreground">불러오는 중...</p>}

          {membersQuery.isError && (
            <p className="px-5 py-6 text-center text-sm text-destructive">멤버 목록을 불러오지 못했습니다.</p>
          )}

          {!membersQuery.isPending && !membersQuery.isError && members.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">멤버가 없습니다.</p>
          )}

          {members.map((member) => (
            <div key={member.id} data-member-id={member.id} className="flex items-center gap-3 px-5 py-2.5">
              <Avatar size="sm">
                <AvatarImage src={member.profileImage ?? undefined} alt={member.nickname} />
                <AvatarFallback>{member.nickname.slice(0, 1)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{member.nickname}</div>
                <div className="truncate text-xs text-muted-foreground">@{member.handle ?? member.nickname}</div>
              </div>

              {member.role === 'OWNER' && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">OWNER</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {isOwner && (
            <Button variant="outline" className="rounded-full" onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" />
              멤버 초대
            </Button>
          )}

          <Button variant="destructive" className="rounded-full" onClick={() => setLeaveConfirmOpen(true)}>
            <LogOut className="size-4" />
            그룹 나가기
          </Button>
        </div>
      </DialogContent>

      <InviteMembersDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        chatId={chatId}
        activeMemberIds={members.map((member) => member.id)}
      />

      <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>그룹을 나가시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              나가면 이 그룹의 대화 내용에 더 이상 접근할 수 없습니다.
              {isOwner && ' OWNER 권한은 가장 먼저 참여한 멤버에게 자동으로 넘어갑니다.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave}>나가기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

export default GroupMembersDialog
