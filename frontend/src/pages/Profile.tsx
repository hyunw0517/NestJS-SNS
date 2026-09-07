import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PostCard from '@/components/post/PostCard'
import ProfileHeader from '@/components/user/ProfileHeader'
import { mockPosts } from '@/mock/posts'
import { mockUser } from '@/mock/user'
import { cn } from '@/lib/utils'

const tabs = ['Posts', 'Replies', 'Media']

function Profile() {
  const navigate = useNavigate()
  const posts = mockPosts.filter((post) => post.author.handle === mockUser.handle)

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
        <div>
          <div className="text-lg leading-tight font-bold">{mockUser.nickname}</div>
          <div className="text-xs text-muted-foreground">{posts.length}개의 게시글</div>
        </div>
      </header>

      <ProfileHeader user={mockUser} />

      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={cn(
              'flex-1 border-b-2 px-4 py-3 text-sm font-medium hover:bg-muted',
              tab === 'Posts'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}

export default Profile
