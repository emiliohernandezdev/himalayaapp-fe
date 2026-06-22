import { Box, Button, Stack, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'
import { HimalayaLogo } from './HimalayaLogo'

type PageHeaderProps = {
  title: string
  description: string
  actionLabel?: string
  icon?: LucideIcon
}

export function PageHeader({ title, description, actionLabel, icon: Icon }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 2.25, sm: 3 },
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(12,27,42,0.96), rgba(16,40,61,0.74))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(224,242,254,0.78))',
        boxShadow: 'var(--himalaya-shadow)',
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 3,
        justifyContent: 'space-between',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 12% 10%, color-mix(in srgb, var(--himalaya-primary) 18%, transparent), transparent 34%), radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--himalaya-accent) 16%, transparent), transparent 30%)',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          right: { xs: -90, sm: -40 },
          bottom: -74,
          width: { xs: 240, sm: 360 },
          height: { xs: 170, sm: 240 },
          opacity: 0.13,
          background:
            'url("data:image/svg+xml,%3Csvg viewBox=%270 0 420 260%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath d=%27M0 260L92 126L162 198L258 74L420 260H0Z%27 fill=%27%23075985%27/%3E%3Cpath d=%27M258 74L226 114H294L258 74Z%27 fill=%27%23e0f2fe%27/%3E%3Cpath d=%27M92 126L70 160H116L92 126Z%27 fill=%27%23e0f2fe%27/%3E%3C/svg%3E") center / contain no-repeat',
          pointerEvents: 'none',
        },
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', position: 'relative', zIndex: 1, minWidth: 0 }}>
        {Icon ? (
          <Box
            sx={{
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              width: { xs: 58, sm: 68 },
              height: { xs: 58, sm: 68 },
              borderRadius: 3,
              color: 'primary.main',
              background: 'linear-gradient(135deg, var(--himalaya-primary-soft), color-mix(in srgb, var(--himalaya-surface) 74%, transparent))',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 16px 38px rgba(0,0,0,0.32)'
                : '0 16px 38px rgba(7,89,133,0.16)',
              flexShrink: 0,
            }}
          >
            <HimalayaLogo className="absolute h-12 w-16 opacity-10" />
            <Icon size={28} />
          </Box>
        ) : null}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.4 }}>
            En comando
          </Typography>
          <Typography variant="h3" component="h2" sx={{ fontSize: { xs: '1.85rem', sm: '2.35rem' }, lineHeight: 1.05, fontWeight: 900, letterSpacing: 0 }}>
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 720, fontWeight: 550 }}>{description}</Typography>
        </Box>
      </Stack>

      {actionLabel ? (
        <Button variant="contained" startIcon={<Plus size={18} />} className="w-full md:w-auto" sx={{ position: 'relative', zIndex: 1, borderRadius: 99, px: 2.5 }}>
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  )
}
