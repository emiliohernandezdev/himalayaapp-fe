import { Box, Button, Stack, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'

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
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 2,
        justifyContent: 'space-between',
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        {Icon ? (
          <Box className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--himalaya-primary-soft)]">
            <Icon size={22} color="var(--himalaya-primary)" />
          </Box>
        ) : null}
        <Box>
          <Typography variant="h3" component="h2">
            {title}
          </Typography>
          <Typography color="text.secondary">{description}</Typography>
        </Box>
      </Stack>

      {actionLabel ? (
        <Button variant="contained" startIcon={<Plus size={18} />} className="w-full md:w-auto">
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  )
}
