import { Box, Container } from '@mui/material'
import type { PaletteMode } from '@mui/material/styles'
import { Navigate, Outlet } from 'react-router'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { useAuthStore } from '../store/useAuthStore'

type AppShellProps = {
  mode: PaletteMode
  onToggleMode: () => void
}

export function AppShell({ mode, onToggleMode }: AppShellProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <Box
      data-theme={mode}
      className="flex min-h-screen flex-col bg-[var(--himalaya-bg)] text-[var(--himalaya-text)] transition-colors"
    >
      <Navbar mode={mode} onToggleMode={onToggleMode} />
      <Box component="main" className="min-w-0 flex-1">
        <Container maxWidth="xl" className="px-4 py-5 sm:px-6 md:py-8">
          <Outlet />
        </Container>
      </Box>
      <Footer />
    </Box>
  )
}
