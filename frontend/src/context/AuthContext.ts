import { createContext } from 'react'
import type { LoginRequest, RegisterRequest } from '@/types/auth'
import type { CurrentUser } from '@/types/user'

export interface AuthContextValue {
  user: CurrentUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginRequest) => Promise<CurrentUser>
  register: (payload: RegisterRequest) => Promise<CurrentUser>
  logout: () => void
  refreshUser: () => Promise<CurrentUser>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
