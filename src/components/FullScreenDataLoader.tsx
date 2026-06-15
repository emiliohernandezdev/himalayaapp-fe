import { Box, LinearProgress, Stack, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'

type FullScreenDataLoaderProps = {
  title: string
  description?: string
  icon: LucideIcon
}

export function FullScreenDataLoader({ title, description, icon: Icon }: FullScreenDataLoaderProps) {
  return (
    <Box
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 grid place-items-center bg-[var(--himalaya-bg)]/88 px-4 text-[var(--himalaya-text)] backdrop-blur-md"
    >
      <Stack spacing={3} sx={{ alignItems: 'center', width: 'min(92vw, 420px)' }}>
        <Box className="relative grid h-28 w-28 place-items-center">
          <Box
            className="absolute inset-0 rounded-full border border-[var(--himalaya-border)]"
            sx={{
              animation: 'himalayaLoaderPulse 1.8s ease-in-out infinite',
              '@keyframes himalayaLoaderPulse': {
                '0%, 100%': { opacity: 0.45, transform: 'scale(0.94)' },
                '50%': { opacity: 1, transform: 'scale(1)' },
              },
            }}
          />
          <Box
            className="absolute inset-2 rounded-full"
            sx={{
              background:
                'conic-gradient(from 90deg, var(--himalaya-primary), var(--himalaya-accent), transparent 72%)',
              animation: 'himalayaLoaderSpin 1.1s linear infinite',
              '@keyframes himalayaLoaderSpin': {
                to: { transform: 'rotate(360deg)' },
              },
            }}
          />
          <Box className="absolute inset-4 rounded-full bg-[var(--himalaya-bg)]" />
          <Box className="relative grid h-14 w-14 place-items-center rounded-lg bg-[var(--himalaya-primary-soft)] text-[var(--himalaya-primary)] shadow-[var(--himalaya-shadow)]">
            <Icon size={26} />
          </Box>
        </Box>

        <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Typography variant="h5">{title}</Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          ) : null}
        </Stack>

        <Box className="w-full rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-3 shadow-sm">
          <Stack spacing={1.25}>
            <LinearProgress />
            <Box className="h-2 w-10/12 rounded-full bg-[var(--himalaya-panel)]" />
            <Box className="h-2 w-7/12 rounded-full bg-[var(--himalaya-panel)]" />
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}
