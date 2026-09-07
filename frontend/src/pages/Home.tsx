import PostCard from '@/components/post/PostCard'
import PostComposer from '@/components/post/PostComposer'
import { mockPosts } from '@/mock/posts'

function Home() {
  return (
    <div className="w-full max-w-2xl border-x">
      <header className="sticky top-0 border-b bg-background px-4 py-3">
        <h1 className="text-lg font-bold">Home</h1>
      </header>

      <PostComposer />

      <div>
        {mockPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}

export default Home
