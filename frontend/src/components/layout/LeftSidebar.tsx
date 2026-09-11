import { Home, LogOut, Mail, PenLine, User } from 'lucide-react'
import { useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/useAuth'
import { cn } from '@/lib/utils'

// Explore는 실제 라우트/기능이 없어(이번 단계 범위 밖) 메뉴에서 제거했다 - App.tsx에
// 대응하는 <Route>가 없는 죽은 링크로 남겨두지 않는다.
const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/messages', label: 'Messages', icon: Mail },
  { to: '/profile', label: 'Profile', icon: User },
]

function LeftSidebar() {
  const { user, logout } = useAuth()
  // logout() 자체는 동기 처리라 사실상 클릭 즉시 ProtectedRoute가 리다이렉트해 버튼이
  // 사라지지만, 그 사이 빠른 연속 클릭으로 여러 번 호출되는 걸 명시적으로 막는다.
  const isLoggingOutRef = useRef(false)

  const handleLogout = () => {
    if (isLoggingOutRef.current) {
      return
    }

    isLoggingOutRef.current = true
    logout()
  }

  return (
    <aside className="flex h-full flex-col justify-between px-2 py-4 md:px-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center rounded-full px-3 py-2 text-xl font-bold md:justify-start">
          <span className="lg:hidden">S</span>
          <span className="hidden lg:inline">SNS</span>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-center gap-4 rounded-full px-3 py-2.5 text-lg hover:bg-muted md:justify-start',
                  isActive && 'font-semibold',
                )
              }
            >
              <Icon className="size-6 shrink-0" />
              <span className="hidden lg:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-2">
        {/* 글 작성 폼은 Home 화면에만 있다(PostComposer) - 전역 작성 모달은 이번 단계
            범위 밖이라, 아무 동작 없는 버튼 대신 Home으로 이동하는 실제 링크로 둔다. */}
        <Button asChild className="aspect-square w-full rounded-full p-0 lg:aspect-auto lg:px-4">
          <NavLink to="/">
            <PenLine className="size-5 lg:hidden" />
            <span className="hidden lg:inline">Post</span>
          </NavLink>
        </Button>

        {user && (
          <div className="flex items-center justify-center gap-2 rounded-full px-2 py-2 hover:bg-muted md:justify-start">
            <NavLink
              to="/profile"
              className="flex min-w-0 flex-1 items-center justify-center gap-2 md:justify-start"
            >
              <Avatar size="sm">
                <AvatarImage src={user.profileImage ?? undefined} alt={user.nickname} />
                <AvatarFallback>{user.nickname.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="hidden min-w-0 flex-1 truncate text-sm font-medium lg:inline">{user.nickname}</span>
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="로그아웃"
              className="hidden shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground lg:inline-flex"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

export default LeftSidebar
