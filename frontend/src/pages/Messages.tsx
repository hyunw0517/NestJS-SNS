import { useState } from 'react'
import ChatPanel from '@/components/message/ChatPanel'
import ConversationList from '@/components/message/ConversationList'
import { cn } from '@/lib/utils'
import { mockConversations, mockMessages } from '@/mock/messages'

function Messages() {
  const [selectedId, setSelectedId] = useState(mockConversations[0].id)
  const [showChatOnMobile, setShowChatOnMobile] = useState(false)

  const selectedConversation = mockConversations.find(
    (conversation) => conversation.id === selectedId,
  )!
  const messages = mockMessages.filter((message) => message.conversationId === selectedId)

  const handleSelect = (id: number) => {
    setSelectedId(id)
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
          conversations={mockConversations}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>

      <div className={cn('min-w-0 flex-1', showChatOnMobile ? 'block' : 'hidden md:block')}>
        <ChatPanel
          conversation={selectedConversation}
          messages={messages}
          onBack={() => setShowChatOnMobile(false)}
        />
      </div>
    </div>
  )
}

export default Messages
