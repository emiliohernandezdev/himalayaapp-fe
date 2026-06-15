import { Box, Stack, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'

type MetricCardProps = {
  title: string
  value: string
  detail: string
  icon: LucideIcon
  tone?: 'primary' | 'success' | 'warning'
}

const toneClass = {
  primary: 'text-sky-700 dark:text-sky-300',
  success: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
}

export function MetricCard({ title, value, detail, icon: Icon, tone = 'primary' }: MetricCardProps) {
  return (
    <Box className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-5 shadow-[var(--himalaya-shadow)]">
      <Stack spacing={2}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Box className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--himalaya-primary-soft)]">
            <Icon className={toneClass[tone]} size={20} />
          </Box>
        </Stack>
        <Box>
          <Typography variant="h4">{value}</Typography>
          <Typography variant="body2" color="text.secondary">
            {detail}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}
