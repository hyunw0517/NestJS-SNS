import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ChatPanel from '@/components/message/ChatPanel'
import ConversationList from '@/components/message/ConversationList'
import { useAuth } from '@/context/useAuth'
import { useChatSocket } from '@/hooks/useChatSocket'
import { useChatsQuery } from '@/hooks/useChats'
import { cn } from '@/lib/utils'

function Messages() {
  const navigate = useNavigate()
  const { chatId } = useParams()
  const { user: currentUser } = useAuth()
  const [showChatOnMobile, setShowChatOnMobile] = useState(false)

  const selectedChatId = chatId !== undefined ? Number(chatId) : undefined

  const { data: chats, isPending: isChatsPending } = useChatsQuery()
  const selectedChat = chats?.find((chat) => chat.id === selectedChatId)

  // Messages 화면 전체에서 socket 연결은 이 하나뿐이다(선택된 chatId가 바뀌면 같은
  // 연결에서 enter_chat만 다시 보낸다). ChatPanel/MessageComposer는 여기서 내려주는
  // sendMessage만 쓰고 자체적으로 소켓을 만들지 않는다.
  const { sendMessage, leaveChatRoom } = useChatSocket(selectedChatId)

  const handleSelect = (id: number) => {
    navigate(`/messages/${id}`)
    setShowChatOnMobile(true)
  }

  return (
    <div className="flex h-screen min-w-0">
      <div
        className={cn(
          'w-full shrink-0 border-r md:block md:w-80 lg:w-96',
          showChatOnMobile ? 'hidden' : 'block',
        )}
      >
        <ConversationList
          conversations={chats ?? []}
          isPending={isChatsPending}
          selectedId={selectedChatId}
          onSelect={handleSelect}
        />
      </div>

      <div className={cn('min-w-0 flex-1', showChatOnMobile ? 'block' : 'hidden md:block')}>
        {!currentUser ? null : selectedChatId === undefined ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            대화를 선택해주세요.
          </div>
        ) : !selectedChat ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            {isChatsPending ? '불러오는 중...' : '대화를 찾을 수 없습니다.'}
          </div>
        ) : (
          <ChatPanel
            key={selectedChatId}
            chatId={selectedChatId}
            conversation={selectedChat}
            currentUserId={currentUser.id}
            onBack={() => setShowChatOnMobile(false)}
            onSendMessage={sendMessage}
            onLeaveChatRoom={leaveChatRoom}
          />
        )}
      </div>
    </div>
  )
}

export default Messages
