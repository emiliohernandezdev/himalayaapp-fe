import type { PaletteMode } from '@mui/material/styles'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeModeState = {
  mode: PaletteMode
  setMode: (mode: PaletteMode) => void
  toggleMode: () => void
}

export const useThemeModeStore = create<ThemeModeState>()(
  persist(
    (set) => ({
      mode: 'light',
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set((state) => ({
          mode: state.mode === 'light' ? 'dark' : 'light',
        })),
    }),
    {
      name: 'himalaya-theme-mode',
    },
  ),
)
