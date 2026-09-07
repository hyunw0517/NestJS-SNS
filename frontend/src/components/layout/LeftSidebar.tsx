import { Compass, Home, Mail, PenLine, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/messages', label: 'Messages', icon: Mail },
  { to: '/profile', label: 'Profile', icon: User },
]

function LeftSidebar() {
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

      <Button className="aspect-square w-full rounded-full p-0 lg:aspect-auto lg:px-4">
        <PenLine className="size-5 lg:hidden" />
        <span className="hidden lg:inline">Post</span>
      </Button>
    </aside>
  )
}

export default LeftSidebar
