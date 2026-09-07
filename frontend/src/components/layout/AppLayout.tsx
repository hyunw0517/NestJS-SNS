import { Outlet, useLocation } from 'react-router-dom'
import LeftSidebar from '@/components/layout/LeftSidebar'
import RightSidebar from '@/components/layout/RightSidebar'

function AppLayout() {
  const location = useLocation()
  const hideRightSidebar = location.pathname.startsWith('/messages')

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl">
      <div className="hidden shrink-0 border-r md:sticky md:top-0 md:block md:h-screen md:w-20 lg:w-64">
        <LeftSidebar />
      </div>

      <main className="min-h-screen w-full min-w-0 flex-1">
        <Outlet />
      </main>

      {!hideRightSidebar && (
        <div className="hidden w-80 shrink-0 border-l lg:sticky lg:top-0 lg:block lg:h-screen">
          <RightSidebar />
        </div>
      )}
    </div>
  )
}

export default AppLayout
