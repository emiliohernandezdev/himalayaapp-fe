import { Box } from '@mui/material'

type WidgetIconPreviewProps = {
  type: string
  size?: number
}

export function WidgetIconPreview({ type, size = 64 }: WidgetIconPreviewProps) {
  const normalizedType = type.toLowerCase()

  // Return custom SVGs representing the style/layout of each widget type
  if (normalizedType.includes('scatter')) {
    return (
      <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="url(#scatterGrad)" />
          {/* Axis */}
          <path d="M14 16V50H50" stroke="var(--himalaya-border)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          {/* Scatter Points */}
          <circle cx="22" cy="40" r="3" fill="#38bdf8" />
          <circle cx="28" cy="32" r="3" fill="#34d399" />
          <circle cx="36" cy="42" r="3" fill="#f43f5e" />
          <circle cx="34" cy="24" r="3" fill="#fbbf24" />
          <circle cx="44" cy="30" r="3" fill="#38bdf8" />
          <circle cx="42" cy="18" r="3" fill="#818cf8" />
          <defs>
            <linearGradient id="scatterGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--himalaya-primary-soft)" />
              <stop offset="1" stopColor="var(--himalaya-bg)" />
            </linearGradient>
          </defs>
        </svg>
      </Box>
    )
  }

  if (normalizedType.includes('pie') || normalizedType.includes('donut')) {
    return (
      <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="url(#pieGrad)" />
          {/* Pie pieces */}
          <path d="M32 32L32 16A16 16 0 0 1 48 32Z" fill="#38bdf8" />
          <path d="M32 32L48 32A16 16 0 0 1 32 48Z" fill="#34d399" />
          <path d="M32 32L32 48A16 16 0 1 1 32 16Z" fill="#6366f1" />
          <circle cx="32" cy="32" r="8" fill="var(--himalaya-surface)" />
          <defs>
            <linearGradient id="pieGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--himalaya-primary-soft)" />
              <stop offset="1" stopColor="var(--himalaya-bg)" />
            </linearGradient>
          </defs>
        </svg>
      </Box>
    )
  }

  if (normalizedType.includes('bar') || normalizedType.includes('columna')) {
    return (
      <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="url(#barGrad)" />
          {/* Bars */}
          <rect x="18" y="32" width="6" height="18" rx="2" fill="#38bdf8" />
          <rect x="29" y="20" width="6" height="30" rx="2" fill="#6366f1" />
          <rect x="40" y="26" width="6" height="24" rx="2" fill="#34d399" />
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--himalaya-primary-soft)" />
              <stop offset="1" stopColor="var(--himalaya-bg)" />
            </linearGradient>
          </defs>
        </svg>
      </Box>
    )
  }

  if (normalizedType.includes('sparkline') || normalizedType.includes('line')) {
    return (
      <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="url(#sparkGrad)" />
          {/* Wave line */}
          <path d="M12 44C16 44 18 24 24 24C30 24 32 38 38 38C44 38 46 18 52 18" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Gradient underneath line */}
          <path d="M12 44C16 44 18 24 24 24C30 24 32 38 38 38C44 38 46 18 52 18V50H12V44Z" fill="url(#sparkAreaGrad)" opacity="0.15" />
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--himalaya-primary-soft)" />
              <stop offset="1" stopColor="var(--himalaya-bg)" />
            </linearGradient>
            <linearGradient id="sparkAreaGrad" x1="32" y1="18" x2="32" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </Box>
    )
  }

  if (normalizedType.includes('gauge') || normalizedType.includes('medidor')) {
    return (
      <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="url(#gaugeGrad)" />
          {/* Arc */}
          <path d="M16 44A20 20 0 0 1 48 44" stroke="var(--himalaya-border)" strokeWidth="6" strokeLinecap="round" />
          <path d="M16 44A20 20 0 0 1 42 26" stroke="#34d399" strokeWidth="6" strokeLinecap="round" />
          {/* Needle */}
          <circle cx="32" cy="42" r="4" fill="var(--himalaya-text)" />
          <path d="M32 42L40 28" stroke="var(--himalaya-text)" strokeWidth="2.5" strokeLinecap="round" />
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--himalaya-primary-soft)" />
              <stop offset="1" stopColor="var(--himalaya-bg)" />
            </linearGradient>
          </defs>
        </svg>
      </Box>
    )
  }

  if (normalizedType.includes('grid') || normalizedType.includes('tabla') || normalizedType.includes('datagrid')) {
    return (
      <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="url(#gridGrad)" />
          {/* DataGrid Headers */}
          <rect x="12" y="16" width="40" height="8" rx="2" fill="var(--himalaya-border)" opacity="0.6" />
          {/* DataGrid Rows */}
          <rect x="12" y="28" width="12" height="6" rx="1.5" fill="#38bdf8" opacity="0.8" />
          <rect x="28" y="28" width="24" height="6" rx="1.5" fill="var(--himalaya-border)" opacity="0.4" />
          
          <rect x="12" y="38" width="16" height="6" rx="1.5" fill="#34d399" opacity="0.8" />
          <rect x="32" y="38" width="20" height="6" rx="1.5" fill="var(--himalaya-border)" opacity="0.4" />
          <defs>
            <linearGradient id="gridGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--himalaya-primary-soft)" />
              <stop offset="1" stopColor="var(--himalaya-bg)" />
            </linearGradient>
          </defs>
        </svg>
      </Box>
    )
  }

  if (normalizedType.includes('metric') || normalizedType.includes('indicador')) {
    return (
      <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="url(#metricGrad)" />
          {/* Number 99 Representation */}
          <path d="M22 24C22 20 25 18 28 18C31 18 33 20 33 24V28C33 32 31 34 28 34H22V24Z" stroke="#38bdf8" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M22 24H33" stroke="#38bdf8" strokeWidth="3.5" />
          <path d="M35 24C35 20 38 18 41 18C44 18 46 20 46 24V34C46 38 44 40 41 40H35V34" stroke="#38bdf8" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M35 34H46" stroke="#38bdf8" strokeWidth="3.5" />
          {/* Trend arrow */}
          <path d="M14 42L18 38M18 38H15M18 38V41" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
          <defs>
            <linearGradient id="metricGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--himalaya-primary-soft)" />
              <stop offset="1" stopColor="var(--himalaya-bg)" />
            </linearGradient>
          </defs>
        </svg>
      </Box>
    )
  }

  // Fallback / Shortcuts / List
  return (
    <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="12" fill="url(#shortcutGrad)" />
        {/* Buttons / shortcuts */}
        <rect x="16" y="20" width="12" height="10" rx="2.5" fill="#818cf8" />
        <rect x="36" y="20" width="12" height="10" rx="2.5" fill="#38bdf8" />
        <rect x="16" y="36" width="32" height="10" rx="2.5" fill="var(--himalaya-border)" opacity="0.7" />
        <defs>
          <linearGradient id="shortcutGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--himalaya-primary-soft)" />
            <stop offset="1" stopColor="var(--himalaya-bg)" />
          </linearGradient>
        </defs>
      </svg>
    </Box>
  )
}
