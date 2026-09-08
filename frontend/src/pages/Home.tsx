import { useEffect, useRef, useState } from 'react'
import PostCard from '@/components/post/PostCard'
import PostComposer from '@/components/post/PostComposer'
import { usePostsInfiniteQuery } from '@/hooks/usePosts'
import { toPostCardPost } from '@/types/post'

function Home() {
  const { data, error, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } = usePostsInfiniteQuery({
    order: 'DESC',
  })

  const posts = data?.pages.flatMap((page) => page.data) ?? []

  // 한 번에 하나의 게시글만 편집 상태가 되도록 "지금 편집 중인 게시글 id"를 여기서 하나만 관리한다.
  const [editingPostId, setEditingPostId] = useState<number | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)

  // sentinel이 화면에 보이고, 다음 페이지가 있고, 이미 불러오는 중이 아닐 때만 fetchNextPage 호출.
  // hasNextPage가 false면 sentinel 자체가 렌더링되지 않아 observer도 붙지 않는다.
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
    <div className="w-full max-w-2xl border-x">
      <header className="sticky top-0 border-b bg-background px-4 py-3">
        <h1 className="text-lg font-bold">Home</h1>
      </header>

      <PostComposer />

      <div>
        {isPending && <p className="px-4 py-6 text-sm text-muted-foreground">불러오는 중...</p>}

        {error && (
          <p className="px-4 py-6 text-sm text-destructive">게시글을 불러오지 못했습니다.</p>
        )}

        {!isPending && !error && posts.length === 0 && (
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

      {hasNextPage && (
        <div ref={sentinelRef} className="px-4 py-6 text-center">
          {isFetchingNextPage && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
        </div>
      )}
    </div>
  )
}

export default Home
