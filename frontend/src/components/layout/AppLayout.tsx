import { Outlet } from 'react-router-dom'
import LeftSidebar from '@/components/layout/LeftSidebar'

// 오른쪽 컬럼(Trending/추천 사용자)은 실제 기능 없이 "준비 중입니다" placeholder만
// 있던 죽은 UI라 제거했다(신규 기능 구현은 이번 단계 범위 밖) - 2-column 레이아웃으로 정리.
function AppLayout() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl">
      <div className="hidden shrink-0 border-r md:sticky md:top-0 md:block md:h-screen md:w-20 lg:w-64">
        <LeftSidebar />
      </div>

      <main className="min-h-screen w-full min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
