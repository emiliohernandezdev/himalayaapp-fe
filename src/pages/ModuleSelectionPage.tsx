import { Box, Button, Stack, Typography } from '@mui/material'
import type { PaletteMode } from '@mui/material/styles'
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router'
import { HimalayaLogo } from '../components/HimalayaLogo'
import { useAuthStore } from '../store/useAuthStore'

type ModuleSelectionPageProps = {
  mode: PaletteMode
}

const moduleIcons: Record<string, LucideIcon> = {
  ssm: ShieldCheck,
  security: LockKeyhole,
}

export function ModuleSelectionPage({ mode }: ModuleSelectionPageProps) {
  const navigate = useNavigate()
  const { isAuthenticated, accessNodes, setActiveModule } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const modules = accessNodes.flatMap((node) =>
    node.modules.map((module) => ({ ...module, nodeSlug: node.slug, nodeTitle: node.title })),
  )

  if (modules.length === 1) {
    return <Navigate to={modules[0].route} replace />
  }

  return (
    <Box
      data-theme={mode}
      className="min-h-screen bg-[var(--himalaya-bg)] px-4 py-6 text-[var(--himalaya-text)] sm:px-6 lg:px-8"
    >
      <Box className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-5xl flex-col justify-center">
        <Stack spacing={4}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <HimalayaLogo className="h-12 w-16 shrink-0" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Seguros Himalaya
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Selecciona el módulo de trabajo
              </Typography>
            </Box>
          </Stack>

          <Box>
            <Typography variant="h3" sx={{ fontWeight: 850, fontSize: { xs: '2rem', md: '2.8rem' } }}>
              Nodo operativo
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
              Tu usuario puede entrar a estos módulos dentro del nodo Seguros Himalaya.
            </Typography>
          </Box>

          <Box className="grid gap-4 md:grid-cols-2">
            {modules.map((module) => {
              const Icon = moduleIcons[module.slug] ?? ShieldCheck

              return (
                <Box
                  key={`${module.nodeSlug}-${module.slug}`}
                  className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-5 shadow-[var(--himalaya-shadow)]"
                >
                  <Stack spacing={3}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Box className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--himalaya-primary-soft)]">
                        <Icon size={22} color="var(--himalaya-primary)" />
                      </Box>
                      <Box>
                        <Typography variant="overline" color="text.secondary">
                          {module.nodeTitle}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800 }}>
                          {module.title}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography color="text.secondary">{module.description}</Typography>
                    <Button
                      variant="contained"
                      endIcon={<ArrowRight size={18} />}
                      onClick={() => {
                        setActiveModule(module.nodeSlug, module.slug)
                        navigate(module.route)
                      }}
                    >
                      Entrar
                    </Button>
                  </Stack>
                </Box>
              )
            })}
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}
