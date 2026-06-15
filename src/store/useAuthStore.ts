import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserInfo = {
  id?: string
  uuid?: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
}

export type ModuleAccess = {
  instanceUuid: string
  slug: string
  title: string
  description: string
  route: string
  icon: string
  nickname: string
  logoDataUrl?: string | null
}

export type NodeAccess = {
  slug: string
  title: string
  description: string
  logoDataUrl?: string | null
  modules: ModuleAccess[]
}

type AuthState = {
  token: string | null
  user: UserInfo | null
  accessNodes: NodeAccess[]
  activeNodeSlug: string | null
  activeModuleSlug: string | null
  isAuthenticated: boolean
  login: (token: string, user: UserInfo, accessNodes?: NodeAccess[], instanceUuid?: string) => void
  setActiveModule: (nodeSlug: string, moduleSlug: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      accessNodes: [],
      activeNodeSlug: null,
      activeModuleSlug: null,
      isAuthenticated: false,
      login: (token, user, accessNodes = [], instanceUuid) => {
        localStorage.setItem('token', token)
        const firstNode = accessNodes[0]
        const selected = accessNodes
          .flatMap((node) => node.modules.map((module) => ({ node, module })))
          .find((item) => item.module.instanceUuid === instanceUuid)
        const firstModule = selected
          ? selected.module
          : firstNode?.modules.length === 1
            ? firstNode.modules[0]
            : null
        set({
          token,
          user,
          accessNodes,
          activeNodeSlug: selected ? selected.node.slug : firstModule ? firstNode.slug : null,
          activeModuleSlug: firstModule?.slug ?? null,
          isAuthenticated: true,
        })
      },
      setActiveModule: (nodeSlug, moduleSlug) => {
        set({ activeNodeSlug: nodeSlug, activeModuleSlug: moduleSlug })
      },
      logout: () => {
        localStorage.removeItem('token')
        set({
          token: null,
          user: null,
          accessNodes: [],
          activeNodeSlug: null,
          activeModuleSlug: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'himalaya-auth',
    },
  ),
)
