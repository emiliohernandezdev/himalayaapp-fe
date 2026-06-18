import { Box, Button, Stack, Typography } from '@mui/material'
import { Home, ArrowLeft, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router'

type ErrorStateProps = {
  type: '404' | '500'
  onRetry?: () => void
}

export function ErrorState({ type, onRetry }: ErrorStateProps) {
  const navigate = useNavigate()

  const is404 = type === '404'
  const title = is404 ? 'Página o Recurso No Encontrado' : 'Error Interno del Servidor'
  const description = is404
    ? 'Lo sentimos, pero no pudimos encontrar el recurso o la página que buscas. Es posible que el enlace esté roto o haya sido eliminado.'
    : 'Hemos experimentado un problema temporal en nuestros servidores. Nuestro equipo técnico ha sido notificado y estamos trabajando para solucionarlo.'

  return (
    <Box className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Premium glowing background effect */}
      <Box className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)]/60 p-8 shadow-[var(--himalaya-shadow)] backdrop-blur-md sm:p-12">
        <Box className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/5 blur-3xl pointer-events-none" />
        <Box className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        <Stack spacing={4} className="relative z-10 items-center">
          {/* Animated/Interactive SVG Illustration */}
          <Box className="relative flex h-36 w-full justify-center">
            {is404 ? (
              <svg viewBox="0 0 200 120" fill="none" className="h-full w-auto drop-shadow-md">
                {/* 404 Mountain search scene */}
                <path d="M40 100 L90 30 L140 100 Z" fill="var(--himalaya-primary-soft)" opacity="0.6" />
                <path d="M80 100 L130 15 L180 100 Z" fill="var(--himalaya-primary)" opacity="0.15" />
                <path d="M10 100 L50 45 L90 100 Z" fill="var(--himalaya-primary)" opacity="0.3" />
                
                {/* Dashed search circle */}
                <circle cx="120" cy="55" r="25" stroke="var(--himalaya-primary)" strokeWidth="2" strokeDasharray="4 4" className="animate-spin" style={{ animationDuration: '30s' }} />
                
                {/* Search glass */}
                <g transform="translate(105, 40)">
                  <circle cx="10" cy="10" r="10" stroke="var(--himalaya-primary)" strokeWidth="3" fill="none" />
                  <line x1="17" y1="17" x2="28" y2="28" stroke="var(--himalaya-primary)" strokeWidth="3" strokeLinecap="round" />
                </g>
                <text x="100" y="115" fill="var(--himalaya-muted)" fontSize="10" fontWeight="bold" letterSpacing="2" textAnchor="middle">404 NOT FOUND</text>
              </svg>
            ) : (
              <svg viewBox="0 0 200 120" fill="none" className="h-full w-auto drop-shadow-md">
                {/* 500 Server error scene */}
                <rect x="50" y="20" width="100" height="70" rx="8" fill="var(--himalaya-surface)" stroke="var(--himalaya-border)" strokeWidth="2" />
                <rect x="60" y="35" width="80" height="8" rx="2.5" fill="var(--himalaya-primary-soft)" />
                <rect x="60" y="50" width="80" height="8" rx="2.5" fill="var(--himalaya-primary-soft)" />
                <rect x="60" y="65" width="80" height="8" rx="2.5" fill="var(--himalaya-primary-soft)" />
                
                {/* Small indicator light */}
                <circle cx="68" cy="39" r="2" fill="#ef4444" className="animate-pulse" />
                <circle cx="68" cy="54" r="2" fill="#ef4444" className="animate-pulse" />
                <circle cx="68" cy="69" r="2" fill="#ef4444" className="animate-pulse" />

                {/* Warning sign overlay */}
                <g transform="translate(130, 55)">
                  <path d="M12 2 L22 20 L2 20 Z" fill="#f59e0b" />
                  <text x="12" y="17" fill="white" fontSize="11" fontWeight="bold" textAnchor="middle">!</text>
                </g>
                
                <text x="100" y="115" fill="var(--himalaya-muted)" fontSize="10" fontWeight="bold" letterSpacing="2" textAnchor="middle">500 SERVER ERROR</text>
              </svg>
            )}
          </Box>

          <Stack spacing={1.5}>
            <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.5rem' }, color: 'var(--himalaya-text)' }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--himalaya-muted)', fontSize: '0.875rem', maxWidth: '380px', lineHeight: 1.6 }}>
              {description}
            </Typography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%', justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Home size={16} />}
              onClick={() => {
                if (onRetry) onRetry()
                navigate('/dashboard')
              }}
              sx={{ px: 3 }}
            >
              Panel Principal
            </Button>
            {onRetry ? (
              <Button
                variant="outlined"
                startIcon={<RefreshCw size={16} />}
                onClick={onRetry}
                sx={{ px: 3 }}
              >
                Reintentar
              </Button>
            ) : (
              <Button
                variant="outlined"
                startIcon={<ArrowLeft size={16} />}
                onClick={() => navigate(-1)}
                sx={{ px: 3 }}
              >
                Regresar
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  )
}
