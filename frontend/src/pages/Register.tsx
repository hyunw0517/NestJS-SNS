import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/useAuth'
import { getErrorMessage } from '@/lib/apiError'

const FALLBACK_ERROR_MESSAGE = '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.'

function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!email.trim() || !nickname.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('모든 항목을 입력해주세요.')
      return
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await register({ nickname, email, password })

      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err, FALLBACK_ERROR_MESSAGE))
    } finally {
      setIsSubmitting(false)
    }
  }

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword

  return (
    <AuthLayout title="회원가입">
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
          <Label htmlFor="nickname">닉네임</Label>
          <Input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="닉네임을 입력하세요"
            aria-invalid={!!error && !nickname.trim()}
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">비밀번호 확인</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="비밀번호를 다시 입력하세요"
            aria-invalid={passwordMismatch}
          />
          {passwordMismatch && (
            <p className="text-sm text-destructive">비밀번호가 일치하지 않습니다.</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="mt-2 rounded-full" disabled={isSubmitting}>
          {isSubmitting ? '가입 중...' : 'Register'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="font-medium text-foreground hover:underline">
          Login
        </Link>
      </p>
    </AuthLayout>
  )
}

export default Register
