import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import GroupMembersDialog from '@/components/message/GroupMembersDialog'
import MessageBubble from '@/components/message/MessageBubble'
import MessageComposer from '@/components/message/MessageComposer'
import { useMessagesInfiniteQuery } from '@/hooks/useChats'
import type { ApiChat } from '@/types/message'

interface ChatPanelProps {
  chatId: number
  conversation: ApiChat
  currentUserId: number
  onBack: () => void
  onSendMessage: (content: string) => void
  onLeaveChatRoom: (chatId: number) => void
}

// Messages.tsx가 key={chatId}로 이 컴포넌트를 렌더링하므로, 대화를 전환하면 항상 새
// 인스턴스로 mount된다 - 아래의 스크롤/최초진입 관련 ref들이 전환 때마다 자연스럽게
// 초기화되어, chatId 변경을 별도로 감지해 리셋하는 로직이 필요 없다.
function ChatPanel({ chatId, conversation, currentUserId, onBack, onSendMessage, onLeaveChatRoom }: ChatPanelProps) {
  const { type, name, otherUser, memberCount } = conversation
  const isGroup = type === 'GROUP'
  const displayName = isGroup ? (name ?? '그룹') : (otherUser?.nickname ?? '알 수 없음')
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)

  const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = useMessagesInfiniteQuery(chatId)

  // Backend는 최신순(DESC)으로 페이지를 내려준다(과거 페이지일수록 더 이전 데이터).
  // 화면에는 과거->최신 순으로 위에서 아래로 보여줘야 하므로, 페이지 순서와 페이지
  // 내부 순서를 모두 뒤집어서 펼친다.
  const messages = useMemo(() => {
    if (!data) {
      return []
    }

    return [...data.pages].reverse().flatMap((page) => [...page.data].reverse())
  }, [data])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const hasScrolledToBottomRef = useRef(false)
  const prevMessageCountRef = useRef(0)

  // 최초 진입 시(메시지가 로드되고 나서) 최신 메시지가 보이도록 맨 아래로 스크롤.
  useEffect(() => {
    if (!isPending && !hasScrolledToBottomRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
      hasScrolledToBottomRef.current = true
      prevMessageCountRef.current = messages.length
    }
  }, [isPending, messages.length])

  // fetch 중복 방지 가드. React Query의 isFetchingNextPage를 그대로 쓰지 않는 이유:
  // 그 값이 실제로 true로 갱신되는 건 React가 리렌더 + effect를 다시 도는 다음 틱
  // 이후라, 그 사이(브라우저가 같은 intersection 변화를 프레임 몇 번에 걸쳐 나눠
  // 보고하는 경우 등) IntersectionObserver 콜백이 한 번 더 불리면 가드를 통과해
  // fetchNextPage가 중복 호출된다(같은 페이지가 여러 번 append되는 원인이었음).
  // 이 ref는 fetchNextPage 호출 "즉시" 동기적으로 true가 되므로 그런 타이밍 창이 없다.
  const isFetchingRef = useRef(false)

  // 과거 메시지를 새로 불러왔을 때 스크롤 위치를 보존하기 위한 상태. fetchNextPage()의
  // Promise가 풀리는 시점과 React가 실제로 DOM을 반영(reflow)하는 시점은 다를 수 있어,
  // Promise.then()에서 곧바로 scrollHeight를 읽으면 아직 새 메시지가 반영되기 전의
  // (달라지지 않은) 값을 읽어 스크롤 보정이 사실상 무효가 되는 문제가 있었다. 대신
  // "지금 과거 페이지를 불러오는 중"이라는 사실만 표시해두고, 실제 보정은 messages가
  // 커밋된 직후 useLayoutEffect에서(항상 최신 scrollHeight를 보장) 수행한다.
  const isRestoringScrollRef = useRef(false)
  const prevScrollHeightRef = useRef(0)

  useEffect(() => {
    const container = scrollContainerRef.current

    if (!container) {
      return
    }

    // React StrictMode(개발 모드)는 이 effect를 mount -> cleanup -> mount로 두 번
    // 실행한다. 두 번째(실제로 살아남는) IntersectionObserver의 콜백은 isFetchingRef로
    // 막히지만, 첫 번째(곧 정리될) observer가 disconnect() 되기 직전에 이미 "이미
    // 화면에 걸쳐 있다"는 알림을 큐에 올려둔 경우 그 콜백이 뒤늦게 한 번 더 실행되며
    // 같은 페이지를 한 번 더 fetch하는 경우가 있었다. cleanup에서 true로 뒤집는
    // 이 클로저 지역 변수는 "이 특정 effect 인스턴스"에만 묶여 있어, 그 뒤늦은 콜백도
    // 확실히 걸러낸다(공유 ref로는 막을 수 없던 부분).
    let cancelled = false

    const observer = new IntersectionObserver(([entry]) => {
      if (cancelled || !entry.isIntersecting || !hasNextPage || isFetchingRef.current) {
        return
      }

      isFetchingRef.current = true
      prevScrollHeightRef.current = container.scrollHeight
      isRestoringScrollRef.current = true

      fetchNextPage().finally(() => {
        isFetchingRef.current = false
      })
    })

    const sentinel = topSentinelRef.current

    if (sentinel) {
      observer.observe(sentinel)
    }

    return () => {
      cancelled = true
      observer.disconnect()
    }
    // sentinel은 hasNextPage에 따라 조건부로 mount/unmount되는 별개의 DOM 노드이므로,
    // hasNextPage가 바뀔 때만 다시 observe한다.
  }, [hasNextPage, fetchNextPage])

  useLayoutEffect(() => {
    if (isRestoringScrollRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight - prevScrollHeightRef.current
      isRestoringScrollRef.current = false
    }
  }, [messages])

  // 새 메시지가 도착했을 때(내가 보냈거나, 상대가 보냈거나) 이미 맨 아래 근처를 보고
  // 있었다면 자연스럽게 다시 맨 아래로 따라간다. 과거 메시지를 보는 중이었다면
  // 스크롤 위치를 방해하지 않는다.
  useEffect(() => {
    const container = scrollContainerRef.current

    if (!container || messages.length <= prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length
      return
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight

    if (distanceFromBottom < 150) {
      container.scrollTop = container.scrollHeight
    }

    prevMessageCountRef.current = messages.length
  }, [messages.length])

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-1.5 hover:bg-muted md:hidden"
        >
          <ArrowLeft className="size-5" />
        </button>

        <Avatar>
          {!isGroup && <AvatarImage src={otherUser?.profileImage ?? undefined} alt={displayName} />}
          <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{displayName}</div>
          {isGroup ? (
            <div className="truncate text-xs text-muted-foreground">멤버 {memberCount ?? 0}명</div>
          ) : (
            otherUser && (
              <div className="truncate text-xs text-muted-foreground">@{otherUser.handle ?? otherUser.nickname}</div>
            )
          )}
        </div>

        {isGroup && (
          <button
            type="button"
            onClick={() => setMembersDialogOpen(true)}
            aria-label="멤버 목록"
            className="shrink-0 rounded-full p-1.5 hover:bg-muted"
          >
            <Users className="size-5" />
          </button>
        )}
      </div>

      {isGroup && (
        <GroupMembersDialog
          open={membersDialogOpen}
          onOpenChange={setMembersDialogOpen}
          chatId={chatId}
          currentUserId={currentUserId}
          onLeaveChatRoom={onLeaveChatRoom}
        />
      )}

      <div ref={scrollContainerRef} className="min-w-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {hasNextPage && (
          <div ref={topSentinelRef} className="py-2 text-center">
            {isFetchingNextPage && <p className="text-xs text-muted-foreground">불러오는 중...</p>}
          </div>
        )}

        {isPending && <p className="py-6 text-center text-sm text-muted-foreground">불러오는 중...</p>}

        {!isPending && messages.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">아직 메시지가 없습니다. 첫 메시지를 보내보세요!</p>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} isMine={message.author.id === currentUserId} />
        ))}
      </div>

      <MessageComposer onSend={onSendMessage} />
    </div>
  )
}

export default ChatPanel
