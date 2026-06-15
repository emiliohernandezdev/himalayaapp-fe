import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type MaintenanceDrawerState = {
  favoriteRoutes: string[]
  recentRoutes: string[]
  toggleFavorite: (route: string) => void
  rememberRecent: (route: string) => void
}

export const useMaintenanceDrawerStore = create<MaintenanceDrawerState>()(
  persist(
    (set) => ({
      favoriteRoutes: [],
      recentRoutes: [],
      toggleFavorite: (route) =>
        set((state) => ({
          favoriteRoutes: state.favoriteRoutes.includes(route)
            ? state.favoriteRoutes.filter((item) => item !== route)
            : [route, ...state.favoriteRoutes],
        })),
      rememberRecent: (route) =>
        set((state) => ({
          recentRoutes: [route, ...state.recentRoutes.filter((item) => item !== route)].slice(0, 8),
        })),
    }),
    {
      name: 'himalaya-maintenance-drawer',
    },
  ),
)
