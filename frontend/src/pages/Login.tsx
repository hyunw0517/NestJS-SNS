import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/useAuth'
import { getErrorMessage } from '@/lib/apiError'

const FALLBACK_ERROR_MESSAGE = '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await login({ email, password })

      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err, FALLBACK_ERROR_MESSAGE))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout title="로그인">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-invalid={!!error && !email.trim()}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호를 입력하세요"
            aria-invalid={!!error && !password.trim()}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="mt-2 rounded-full" disabled={isSubmitting}>
          {isSubmitting ? '로그인 중...' : 'Login'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        계정이 없으신가요?{' '}
        <Link to="/register" className="font-medium text-foreground hover:underline">
          Register
        </Link>
      </p>
    </AuthLayout>
  )
}

export default Login
