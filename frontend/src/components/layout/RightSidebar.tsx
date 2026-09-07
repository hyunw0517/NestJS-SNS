import { Search } from 'lucide-react'

function RightSidebar() {
  return (
    <aside className="flex h-full flex-col gap-4 px-4 py-4">
      <div className="flex items-center gap-2 rounded-full border px-4 py-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          placeholder="검색"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <section className="rounded-2xl border">
        <h2 className="px-4 pt-3 pb-2 text-lg font-bold">Trending</h2>
        <div className="px-4 pb-4 text-sm text-muted-foreground">준비 중입니다</div>
      </section>

      <section className="rounded-2xl border">
        <h2 className="px-4 pt-3 pb-2 text-lg font-bold">추천 사용자</h2>
        <div className="px-4 pb-4 text-sm text-muted-foreground">준비 중입니다</div>
      </section>
    </aside>
  )
}

export default RightSidebar
