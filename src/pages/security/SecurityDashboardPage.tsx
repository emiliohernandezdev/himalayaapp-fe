import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material'
import { Activity, KeyRound, LockKeyhole, ShieldCheck, UsersRound } from 'lucide-react'
import { fetchUsers } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'

const securityTiles = [
  {
    title: 'Usuarios',
    description: 'Altas, perfiles, estado de acceso y roles base.',
    icon: UsersRound,
    status: 'Disponible',
    route: '/users',
  },
  {
    title: 'Roles',
    description: 'Agrupaciones de permisos y jerarquias de autorizacion.',
    icon: ShieldCheck,
    status: 'Base',
    route: '/security/roles',
  },
  {
    title: 'Matriz de seguridad',
    description: 'Permitir o bloquear mantenimientos y acciones por rol.',
    icon: LockKeyhole,
    status: 'Activo',
    route: '/security/matrix',
  },
  {
    title: 'Autorizaciones',
    description: 'Acciones que requieren contraseña de supervisor.',
    icon: KeyRound,
    status: 'Activo',
    route: '/security/matrix',
  },
  {
    title: 'Historico general',
    description: 'Auditoría de acciones realizadas dentro del sistema.',
    icon: Activity,
    status: 'Activo',
    route: '/security/audit',
  },
]

export function SecurityDashboardPage() {
  const { data: users, error } = useApiQuery('security-users-summary', fetchUsers)

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Security"
        description="Usuarios, roles, matriz de seguridad, autorizaciones y auditoría."
        actionLabel=""
        icon={LockKeyhole}
      />

      {error && <Alert severity="error">No se pudo cargar la informacion de seguridad.</Alert>}

      <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {securityTiles.map((tile) => {
          const Icon = tile.icon

          return (
            <Box
              key={tile.title}
              className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-5"
            >
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--himalaya-primary-soft)]">
                    <Icon size={20} color="var(--himalaya-primary)" />
                  </Box>
                  <Chip size="small" label={tile.status} />
                </Stack>
                <Box>
                  <Typography variant="h6">{tile.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    {tile.description}
                  </Typography>
                  <Button href={tile.route} size="small" sx={{ mt: 2 }}>
                    Abrir
                  </Button>
                </Box>
              </Stack>
            </Box>
          )
        })}
      </Box>

      <Box className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-5">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
          <Box>
            <Typography variant="h6">Resumen de usuarios</Typography>
            <Typography variant="body2" color="text.secondary">
              {users?.length ?? 0} usuarios registrados con roles operativos.
            </Typography>
          </Box>
          <Button variant="outlined" href="/users">
            Administrar usuarios
          </Button>
        </Stack>
      </Box>
    </Stack>
  )
}
