import { Box, Button, Chip, Divider, LinearProgress, Stack, Typography } from '@mui/material'
import {
  CalendarClock,
  CircleDollarSign,
  FileCheck2,
  FileWarning,
  Plus,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router'
import { MetricCard } from '../components/MetricCard'
import { dashboardModules } from '../data/mockAdminData'

const metrics = [
  {
    title: 'Clientes en cartera',
    value: '864',
    detail: '+28 nuevos en los ultimos 30 dias',
    icon: UsersRound,
    tone: 'primary' as const,
  },
  {
    title: 'Polizas activas',
    value: '1,284',
    detail: '92% con expediente completo',
    icon: ShieldCheck,
    tone: 'success' as const,
  },
  {
    title: 'Renovaciones pendientes',
    value: '42',
    detail: '15 vencen durante esta semana',
    icon: CalendarClock,
    tone: 'warning' as const,
  },
  {
    title: 'Prima administrada',
    value: '$2.4M',
    detail: 'Cartera anual estimada',
    icon: CircleDollarSign,
    tone: 'primary' as const,
  },
]

const renewals = [
  { client: 'Constructora Altavista', policy: 'Todo riesgo contratista', progress: 84 },
  { client: 'Grupo Medico Central', policy: 'Responsabilidad civil', progress: 62 },
  { client: 'Transporte del Norte', policy: 'Flotilla comercial', progress: 41 },
]

const followUps = [
  'Solicitar documento de endoso pendiente',
  'Confirmar pago de prima fraccionada',
  'Validar condiciones de renovacion con aseguradora',
]

export function DashboardPage() {
  return (
    <Stack spacing={4}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h3" component="h2">
            Panel operativo
          </Typography>
          <Typography color="text.secondary">
            Seguimiento de cartera, polizas, renovaciones y tareas comerciales.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button variant="outlined" startIcon={<FileCheck2 size={18} />}>
            Subir poliza
          </Button>
          <Button variant="contained" startIcon={<Plus size={18} />}>
            Nuevo cliente
          </Button>
        </Stack>
      </Stack>

      <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </Box>

      <Stack spacing={2}>
        <Box>
          <Typography variant="h5">Accesos operativos</Typography>
          <Typography variant="body2" color="text.secondary">
            Modulos de trabajo diario para el equipo.
          </Typography>
        </Box>
        <Box className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dashboardModules.map((module) => {
            const Icon = module.icon

            return (
              <Button
                key={module.label}
                component={Link}
                to={module.route}
                variant="outlined"
                className="justify-start bg-[var(--himalaya-surface)] p-4 text-left"
                startIcon={<Icon size={18} />}
              >
                <Stack spacing={0.25} sx={{ alignItems: 'flex-start' }}>
                  <Typography variant="subtitle1">{module.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {module.description}
                  </Typography>
                </Stack>
              </Button>
            )
          })}
        </Box>
      </Stack>

      <Box className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Box className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-5 shadow-[var(--himalaya-shadow)]">
          <Stack spacing={3}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h5">Renovaciones prioritarias</Typography>
                <Typography variant="body2" color="text.secondary">
                  Casos que requieren seguimiento antes de vencer.
                </Typography>
              </Box>
              <Chip label="42 pendientes" color="warning" variant="outlined" />
            </Stack>

            <Stack spacing={2.25}>
              {renewals.map((item) => (
                <Box key={item.client}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    sx={{
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 1,
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1">{item.client}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.policy}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.progress}% listo
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={item.progress}
                    className="mt-3 h-2 rounded-full"
                  />
                </Box>
              ))}
            </Stack>
          </Stack>
        </Box>

        <Box className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-5 shadow-[var(--himalaya-shadow)]">
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <Box className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--himalaya-primary-soft)]">
                <FileWarning size={20} color="var(--himalaya-primary)" />
              </Box>
              <Box>
                <Typography variant="h5">Seguimientos</Typography>
                <Typography variant="body2" color="text.secondary">
                  Tareas abiertas para hoy
                </Typography>
              </Box>
            </Stack>
            <Divider />
            <Stack spacing={1.5}>
              {followUps.map((item) => (
                <Box
                  key={item}
                  className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface-soft)] p-3"
                >
                  <Typography variant="body2">{item}</Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Stack>
  )
}
