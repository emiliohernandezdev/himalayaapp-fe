import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import { CalendarClock, FileText, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { policies } from '../data/mockAdminData'

export function PoliciesPage() {
  return (
    <Stack spacing={4}>
      <PageHeader
        title="Polizas"
        description="Control de vigencias, proveedores, productos y estado documental."
        actionLabel="Nueva poliza"
        icon={FileText}
      />

      <Box className="grid gap-4 xl:grid-cols-3">
        {policies.map((policy) => (
          <Box
            key={policy.code}
            className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-5 shadow-[var(--himalaya-shadow)]"
          >
            <Stack spacing={2.5}>
              <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                <Box className="min-w-0">
                  <Typography variant="caption" color="text.secondary">
                    {policy.code}
                  </Typography>
                  <Typography variant="h6" className="break-words">
                    {policy.client}
                  </Typography>
                </Box>
                <Chip label={policy.status} color="primary" variant="outlined" />
              </Stack>

              <Box className="rounded-lg bg-[var(--himalaya-surface-soft)] p-3">
                <Typography variant="subtitle1">{policy.product}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {policy.provider}
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5 }}>
                <Button variant="outlined" startIcon={<CalendarClock size={18} />} className="flex-1">
                  {policy.renewal}
                </Button>
                <Button variant="contained" startIcon={<ShieldCheck size={18} />} className="flex-1">
                  Ver detalle
                </Button>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Box>
    </Stack>
  )
}
