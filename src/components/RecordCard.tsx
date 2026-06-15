import { Box, Chip, Stack, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'

type RecordCardProps = {
  title: string
  eyebrow?: string
  detail: string
  status: string
  icon: LucideIcon
}

export function RecordCard({ title, eyebrow, detail, status, icon: Icon }: RecordCardProps) {
  return (
    <Box className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-4 shadow-[var(--himalaya-shadow)]">
      <Stack spacing={2}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1.5 }}>
          <Box className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--himalaya-primary-soft)]">
            <Icon size={20} color="var(--himalaya-primary)" />
          </Box>
          <Box className="min-w-0 flex-1">
            {eyebrow ? (
              <Typography variant="caption" color="text.secondary">
                {eyebrow}
              </Typography>
            ) : null}
            <Typography variant="subtitle1" className="break-words">
              {title}
            </Typography>
          </Box>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {detail}
        </Typography>
        <Chip label={status} variant="outlined" color="primary" className="w-fit" />
      </Stack>
    </Box>
  )
}
