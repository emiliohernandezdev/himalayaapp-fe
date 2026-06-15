import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import { Mail, Shield, UserRoundCog } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { appUsers } from '../data/mockAdminData'

export function UsersPage() {
  return (
    <Stack spacing={4}>
      <PageHeader
        title="Usuarios"
        description="Equipo interno, roles operativos y carga de trabajo asignada."
        actionLabel="Nuevo usuario"
        icon={UserRoundCog}
      />

      <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {appUsers.map((user) => (
          <Box
            key={user.email}
            className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-5 shadow-[var(--himalaya-shadow)]"
          >
            <Stack spacing={2.5}>
              <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1.5 }}>
                <Box className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[var(--himalaya-primary-soft)]">
                  <UserRoundCog size={22} color="var(--himalaya-primary)" />
                </Box>
                <Box className="min-w-0 flex-1">
                  <Typography variant="h6" className="break-words">
                    {user.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.role}
                  </Typography>
                </Box>
                <Chip label={user.status} color="success" variant="outlined" />
              </Stack>

              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Mail size={16} color="var(--himalaya-primary)" />
                  <Typography variant="body2" className="break-all">
                    {user.email}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Shield size={16} color="var(--himalaya-primary)" />
                  <Typography variant="body2">{user.workload}</Typography>
                </Stack>
              </Stack>

              <Button variant="outlined">Ver permisos</Button>
            </Stack>
          </Box>
        ))}
      </Box>
    </Stack>
  )
}
