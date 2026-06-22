import { Fab, Tooltip, useMediaQuery, useTheme } from '@mui/material'
import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'

interface MaintenanceFabProps {
  label: string
  onClick: () => void
  disabled?: boolean
  icon?: ReactNode
  color?: 'primary' | 'error'
}

/**
 * Floating Action Button for all maintenance pages.
 * Matches the DashboardPage SpeedDial main button.
 */
export function MaintenanceFab({ label, onClick, disabled = false, icon, color = 'primary' }: MaintenanceFabProps) {
  const theme = useTheme()
  const isTouch = useMediaQuery('(hover: none), (pointer: coarse)')

  const button = (
    <Fab
      color={color}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      disabled={disabled}
      sx={{
        position: 'fixed',
        bottom: { xs: 'calc(20px + env(safe-area-inset-bottom))', sm: 24 },
        right: { xs: 'calc(20px + env(safe-area-inset-right))', sm: 24 },
        zIndex: theme.zIndex.drawer + 20,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        bgcolor: `${color}.main`,
        color: `${color}.contrastText`,
        border: '1px solid',
        borderColor: (theme) => theme.palette[color].dark ?? theme.palette[color].main,
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? `0 10px 28px ${theme.palette[color].main}33`
            : `0 10px 28px ${(theme.palette[color].dark ?? theme.palette[color].main)}33`,
        transition: 'background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
        '&:hover': {
          bgcolor: `${color}.dark`,
          color: `${color}.contrastText`,
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? `0 14px 34px ${theme.palette[color].main}40`
              : `0 14px 34px ${(theme.palette[color].dark ?? theme.palette[color].main)}40`,
          transform: 'translateY(-1px)',
        },
        '&:active': {
          transform: 'translateY(0)',
        },
      }}
    >
      {icon ?? <Plus size={24} />}
    </Fab>
  )

  if (isTouch) return button

  return (
    <Tooltip title={label} placement="left" arrow>
      {button}
    </Tooltip>
  )
}
