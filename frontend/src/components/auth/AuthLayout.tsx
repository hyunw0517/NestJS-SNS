import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  children: ReactNode
}

function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center text-2xl font-bold">SNS</div>
        <h1 className="mb-6 text-xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  )
}

export default AuthLayout
