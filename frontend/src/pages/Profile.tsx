import { isAxiosError } from 'axios'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PostCard from '@/components/post/PostCard'
import ReplyCard from '@/components/comment/ReplyCard'
import EditProfileDialog from '@/components/user/EditProfileDialog'
import FollowListDialog from '@/components/user/FollowListDialog'
import ProfileHeader from '@/components/user/ProfileHeader'
import { useAuth } from '@/context/useAuth'
import { useUserCommentsInfiniteQuery } from '@/hooks/useComments'
import { useGetOrCreateDirectChatMutation } from '@/hooks/useChats'
import { usePostsInfiniteQuery } from '@/hooks/usePosts'
import { useToggleFollowMutation, useUserProfileQuery } from '@/hooks/useUsers'
import { cn } from '@/lib/utils'
import { toCommentItemComment } from '@/types/comment'
import { toPostCardPost } from '@/types/post'
import { toProfileHeaderUser } from '@/types/user'

const tabs = ['Posts', 'Replies', 'Media'] as const
type ProfileTab = (typeof tabs)[number]

function Profile() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user: currentUser } = useAuth()

  // route param이 없으면(=/profile) 본인 프로필, 있으면(=/profile/:id) 그 id의 사용자 프로필.
  const targetId = id !== undefined ? Number(id) : currentUser?.id
  const isOwnProfile = targetId !== undefined && currentUser?.id === targetId

  const { data: profileUser, isPending, error } = useUserProfileQuery(targetId ?? NaN)
  const notFound = isAxiosError(error) && error.response?.status === 404

  const toggleFollow = useToggleFollowMutation()
  // Home의 좋아요 버튼과 동일한 이유(리렌더 지연으로 인한 isPending stale 읽기 방지)로 ref를 사용한다.
  const isTogglingFollowRef = useRef(false)

  const getOrCreateDirectChat = useGetOrCreateDirectChatMutation()
  const isMessagingRef = useRef(false)

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [followListTab, setFollowListTab] = useState<'followers' | 'following' | null>(null)

  const [activeTab, setActiveTab] = useState<ProfileTab>('Posts')

  // 탭마다 각자의 쿼리를 갖되, 지금 보고 있는 탭의 쿼리만 활성화한다(3개를 동시에
  // 불러올 필요가 없음). filters 객체 자체가 서로 달라 queryKey도 자동으로 분리된다.
  const postsQuery = usePostsInfiniteQuery(
    { order: 'DESC', where__author_id: targetId },
    { enabled: activeTab === 'Posts' && targetId !== undefined },
  )
  const mediaQuery = usePostsInfiniteQuery(
    { order: 'DESC', where__author_id: targetId, where__has_images: true },
    { enabled: activeTab === 'Media' && targetId !== undefined },
  )
  const repliesQuery = useUserCommentsInfiniteQuery(targetId ?? NaN, { enabled: activeTab === 'Replies' })

  const posts = postsQuery.data?.pages.flatMap((page) => page.data) ?? []
  const mediaPosts = mediaQuery.data?.pages.flatMap((page) => page.data) ?? []
  const replies = repliesQuery.data?.pages.flatMap((page) => page.data) ?? []

  // 한 번에 하나의 게시글/댓글만 편집 상태가 되도록 Home과 동일한 방식으로 관리한다.
  // 탭이 다르면 대상 데이터도 다르므로 편집 상태도 탭별로 분리한다.
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null)

  // 지금 활성화된 탭의 pagination 정보만 sentinel에 연결한다(무한스크롤 패턴은 Home과 동일).
  const activePagination =
    activeTab === 'Replies' ? repliesQuery : activeTab === 'Media' ? mediaQuery : postsQuery
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = activePagination

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

  const handleToggleFollow = () => {
    if (!profileUser || isTogglingFollowRef.current) {
      return
    }

    isTogglingFollowRef.current = true
    toggleFollow.mutate(
      { userId: profileUser.id, following: profileUser.isFollowing },
      { onSettled: () => { isTogglingFollowRef.current = false } },
    )
  }

  const handleMessage = () => {
    if (!profileUser || isMessagingRef.current) {
      return
    }

    isMessagingRef.current = true
    getOrCreateDirectChat.mutate(profileUser.id, {
      onSuccess: (chat) => {
        navigate(`/messages/${chat.id}`)
      },
      onSettled: () => { isMessagingRef.current = false },
    })
  }

  return (
    <div className="w-full max-w-2xl border-x">
      <header className="sticky top-0 flex items-center gap-4 border-b bg-background px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full p-1.5 hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </button>
        {profileUser && (
          <div>
            <div className="text-lg leading-tight font-bold">{profileUser.nickname}</div>
            <div className="text-xs text-muted-foreground">{posts.length}개의 게시글</div>
          </div>
        )}
      </header>

      {isPending ? (
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">불러오는 중...</div>
      ) : !profileUser ? (
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          {notFound ? '사용자를 찾을 수 없습니다.' : '사용자 정보를 불러오지 못했습니다.'}
        </div>
      ) : (
        <>
          <ProfileHeader
            user={toProfileHeaderUser(profileUser)}
            isOwnProfile={isOwnProfile}
            isFollowing={profileUser.isFollowing}
            isFollowPending={toggleFollow.isPending}
            onToggleFollow={handleToggleFollow}
            onEditProfile={() => setIsEditProfileOpen(true)}
            onShowFollowers={() => setFollowListTab('followers')}
            onShowFollowing={() => setFollowListTab('following')}
            onMessage={handleMessage}
            isMessagePending={getOrCreateDirectChat.isPending}
          />

          {isOwnProfile && (
            <EditProfileDialog
              open={isEditProfileOpen}
              onOpenChange={setIsEditProfileOpen}
              initialValues={{
                nickname: profileUser.nickname,
                handle: profileUser.handle,
                bio: profileUser.bio,
                profileImage: profileUser.profileImage,
                coverImage: profileUser.coverImage,
              }}
            />
          )}

          {followListTab && (
            <FollowListDialog
              open={followListTab !== null}
              onOpenChange={(nextOpen) => { if (!nextOpen) setFollowListTab(null) }}
              userId={profileUser.id}
              initialTab={followListTab}
            />
          )}

          <div className="flex border-b">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 border-b-2 px-4 py-3 text-sm font-medium hover:bg-muted',
                  tab === activeTab
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground',
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Posts' && (
            <div>
              {postsQuery.isPending && (
                <p className="px-4 py-6 text-sm text-muted-foreground">불러오는 중...</p>
              )}

              {!postsQuery.isPending && posts.length === 0 && (
                <p className="px-4 py-6 text-sm text-muted-foreground">아직 게시글이 없습니다.</p>
              )}

              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={toPostCardPost(post)}
                  enableActions
                  isEditing={editingPostId === post.id}
                  onStartEdit={() => setEditingPostId(post.id)}
                  onStopEdit={() => setEditingPostId(null)}
                />
              ))}
            </div>
          )}

          {activeTab === 'Replies' && (
            <div>
              {repliesQuery.isPending && (
                <p className="px-4 py-6 text-sm text-muted-foreground">불러오는 중...</p>
              )}

              {!repliesQuery.isPending && replies.length === 0 && (
                <p className="px-4 py-6 text-sm text-muted-foreground">아직 작성한 댓글이 없습니다.</p>
              )}

              {replies.map((reply) => (
                <ReplyCard
                  key={reply.id}
                  comment={toCommentItemComment(reply, reply.post.id)}
                  postId={reply.post.id}
                  postContent={reply.post.content}
                  isEditing={editingReplyId === reply.id}
                  onStartEdit={() => setEditingReplyId(reply.id)}
                  onStopEdit={() => setEditingReplyId(null)}
                />
              ))}
            </div>
          )}

          {activeTab === 'Media' && (
            <div>
              {mediaQuery.isPending && (
                <p className="px-4 py-6 text-sm text-muted-foreground">불러오는 중...</p>
              )}

              {!mediaQuery.isPending && mediaPosts.length === 0 && (
                <p className="px-4 py-6 text-sm text-muted-foreground">이미지가 있는 게시글이 없습니다.</p>
              )}

              {mediaPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={toPostCardPost(post)}
                  enableActions
                  isEditing={editingPostId === post.id}
                  onStartEdit={() => setEditingPostId(post.id)}
                  onStopEdit={() => setEditingPostId(null)}
                />
              ))}
            </div>
          )}

          {hasNextPage && (
            <div ref={sentinelRef} className="px-4 py-6 text-center">
              {isFetchingNextPage && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Profile
