import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserInfo = {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
}

type AuthState = {
  token: string | null
  user: UserInfo | null
  isAuthenticated: boolean
  login: (token: string, user: UserInfo) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => {
        localStorage.setItem('token', token)
        set({ token, user, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('token')
        set({ token: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'himalaya-auth',
    },
  ),
)
