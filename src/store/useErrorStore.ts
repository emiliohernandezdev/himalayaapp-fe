import { create } from 'zustand'

export type ErrorType = '404' | '500' | null

type ErrorStore = {
  errorType: ErrorType
  setError: (type: ErrorType) => void
  clearError: () => void
}

export const useErrorStore = create<ErrorStore>((set) => ({
  errorType: null,
  setError: (type) => set({ errorType: type }),
  clearError: () => set({ errorType: null }),
}))
