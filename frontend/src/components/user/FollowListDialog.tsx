import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useAuth } from '@/context/useAuth'
import { useFollowersInfiniteQuery, useFollowingInfiniteQuery, useToggleFollowMutation } from '@/hooks/useUsers'
import { cn } from '@/lib/utils'
import type { ApiFollowUser } from '@/types/user'

type FollowListTab = 'followers' | 'following'

interface FollowListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number
  initialTab: FollowListTab
}

// Dialog는 open일 때만 내용을 mount한다(Radix Content가 open=false면 언마운트되므로
// EditProfileDialog와 동일하게 자연스럽게 처리됨). 열릴 때마다 initialTab 기준으로
// 새로 시작해, 이전에 다른 탭을 보고 있었더라도 이번엔 클릭한 count에 맞는 탭으로 연다.
function FollowListDialog({ open, onOpenChange, userId, initialTab }: FollowListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[70vh] max-w-md gap-0 p-0">
        <FollowListBody userId={userId} initialTab={initialTab} />
      </DialogContent>
    </Dialog>
  )
}

function FollowListBody({ userId, initialTab }: { userId: number; initialTab: FollowListTab }) {
  const [activeTab, setActiveTab] = useState<FollowListTab>(initialTab)

  const followersQuery = useFollowersInfiniteQuery(userId, { enabled: activeTab === 'followers' })
  const followingQuery = useFollowingInfiniteQuery(userId, { enabled: activeTab === 'following' })

  const activeQuery = activeTab === 'followers' ? followersQuery : followingQuery
  const users = activeQuery.data?.pages.flatMap((page) => page.data) ?? []
  const { hasNextPage, isFetchingNextPage, fetchNextPage, isPending } = activeQuery

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current

    if (!sentinel || !hasNextPage) {
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    })

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <>
      <DialogHeader className="border-b px-4 py-3">
        <DialogTitle className="sr-only">Followers / Following</DialogTitle>
        <div className="flex">
          {(['followers', 'following'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 border-b-2 pb-2 text-sm font-medium capitalize hover:bg-muted',
                tab === activeTab ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground',
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </DialogHeader>

      <div className="max-h-[55vh] overflow-y-auto">
        {isPending && <p className="px-4 py-6 text-center text-sm text-muted-foreground">불러오는 중...</p>}

        {!isPending && users.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {activeTab === 'followers' ? '아직 팔로워가 없습니다.' : '아직 팔로우하는 사용자가 없습니다.'}
          </p>
        )}

        {users.map((user) => (
          <FollowListItem key={user.id} user={user} />
        ))}

        {hasNextPage && (
          <div ref={sentinelRef} className="px-4 py-4 text-center">
            {isFetchingNextPage && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
          </div>
        )}
      </div>
    </>
  )
}

function FollowListItem({ user }: { user: ApiFollowUser }) {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const toggleFollow = useToggleFollowMutation()
  const isTogglingRef = useRef(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isSelf = currentUser?.id === user.id

  // 실제 토글 요청. window.confirm()과 달리 AlertDialog는 네이티브 블로킹 다이얼로그가
  // 아니라 일반 React 렌더링이라, 빠른 연속 클릭에도 이 함수 자체가 재진입(nested event
  // loop)될 여지가 없다 - ref 가드만으로 충분히 중복 요청을 막는다.
  const runToggle = () => {
    if (isTogglingRef.current) {
      return
    }

    isTogglingRef.current = true
    toggleFollow.mutate(
      { userId: user.id, following: user.isFollowing },
      { onSettled: () => { isTogglingRef.current = false } },
    )
  }

  const handleButtonClick = () => {
    if (isTogglingRef.current) {
      return
    }

    // 팔로우 취소만 확인 안내문을 띄운다(팔로우 자체는 되돌리기 쉬워 확인 불필요).
    if (user.isFollowing) {
      setConfirmOpen(true)
      return
    }

    runToggle()
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
      <button type="button" onClick={() => navigate(`/profile/${user.id}`)} className="shrink-0">
        <Avatar>
          <AvatarImage src={user.profileImage ?? undefined} alt={user.nickname} />
          <AvatarFallback>{user.nickname.slice(0, 1)}</AvatarFallback>
        </Avatar>
      </button>

      <button
        type="button"
        onClick={() => navigate(`/profile/${user.id}`)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="truncate text-sm font-semibold">{user.nickname}</div>
        <div className="truncate text-xs text-muted-foreground">@{user.handle ?? user.nickname}</div>
        {user.bio && <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.bio}</p>}
      </button>

      {!isSelf && (
        <>
          <Button
            variant={user.isFollowing ? 'outline' : 'default'}
            size="sm"
            className="shrink-0 rounded-full"
            onClick={handleButtonClick}
            disabled={toggleFollow.isPending}
          >
            {user.isFollowing ? 'Following' : 'Follow'}
          </Button>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말로 삭제합니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  {user.nickname}님을 더 이상 팔로우하지 않게 됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={runToggle}>확인</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}

export default FollowListDialog
