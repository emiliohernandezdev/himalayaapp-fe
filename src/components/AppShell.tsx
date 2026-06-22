import { Box, Container } from '@mui/material'
import type { PaletteMode } from '@mui/material/styles'
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { useAuthStore } from '../store/useAuthStore'
import { useErrorStore } from '../store/useErrorStore'
import { ErrorState } from './ErrorState'
import { SummitAssistant } from './SherpaAssistant'
import { isSsmRoute } from '../utils/routes'
import { connectSystemEvents } from '../api/systemEventsApi'

type AppShellProps = {
  mode: PaletteMode
  onToggleMode: () => void
}

export function AppShell({ mode, onToggleMode }: AppShellProps) {
  const { isAuthenticated, accessNodes, activeModuleSlug, token } = useAuthStore()
  const { errorType, clearError } = useErrorStore()
  const location = useLocation()

  useEffect(() => {
    clearError()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname, clearError])

  useEffect(() => {
    const releasePointerFocus = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target?.closest('button, [role="button"], .MuiButtonBase-root')) return

      window.requestAnimationFrame(() => {
        const activeElement = document.activeElement
        if (activeElement instanceof HTMLElement && activeElement.matches('button, [role="button"], .MuiButtonBase-root')) {
          activeElement.blur()
        }
      })
    }

    document.addEventListener('click', releasePointerFocus, true)
    return () => document.removeEventListener('click', releasePointerFocus, true)
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !token) return

    const controller = new AbortController()
    connectSystemEvents(controller.signal).catch((error) => {
      if (!controller.signal.aborted) {
        console.warn('No se pudo mantener el stream de eventos en tiempo real.', error)
      }
    })

    return () => controller.abort()
  }, [isAuthenticated, token])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const moduleCount = accessNodes.reduce((count, node) => count + node.modules.length, 0)
  if (moduleCount > 1 && !activeModuleSlug) {
    return <Navigate to="/select-module" replace />
  }

  if (activeModuleSlug === 'security' && isSsmRoute(location.pathname)) {
    return <Navigate to="/security" replace />
  }

  if (activeModuleSlug === 'ssm' && (location.pathname.startsWith('/security') || location.pathname === '/users')) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <Box
      data-theme={mode}
      className="flex min-h-screen flex-col bg-[var(--himalaya-bg)] text-[var(--himalaya-text)] transition-colors"
    >
      <Navbar mode={mode} onToggleMode={onToggleMode} />
      <Box component="main" className="min-w-0 flex-1">
        <Container maxWidth="xl" className="px-4 py-5 sm:px-6 md:py-8">
          {errorType ? (
            <ErrorState type={errorType} onRetry={clearError} />
          ) : (
            <Outlet />
          )}
        </Container>
      </Box>
      <Footer />
      <SummitAssistant />
    </Box>
  )
}
