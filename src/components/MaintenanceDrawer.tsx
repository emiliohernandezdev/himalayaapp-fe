import { Alert, Box, Button, Dialog, IconButton, InputAdornment, Skeleton, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { Clock3, Grid3X3, Search, Star, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { fetchMaintenanceModules } from '../api/maintenanceApi'
import type { MaintenanceModuleDto } from '../api/maintenanceApi'
import { useApiQuery } from '../api/useApiQuery'
import { HimalayaLogo } from './HimalayaLogo'
import { getMaintenanceModuleIcon } from './maintenanceModuleIcons'
import { useAuthStore } from '../store/useAuthStore'
import { useMaintenanceDrawerStore } from '../store/useMaintenanceDrawerStore'
import { usePermission } from '../hooks/usePermission'
import { normalizeAppRoute } from '../utils/routes'

type MaintenanceDrawerProps = {
  open: boolean
  onClose: () => void
  mode: 'light' | 'dark'
}

const toneStyles = {
  sky: {
    accent: '#0284c7',
    soft: 'rgba(2, 132, 199, 0.1)',
  },
  teal: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.1)',
  },
  indigo: {
    accent: '#4f46e5',
    soft: 'rgba(79, 70, 229, 0.1)',
  },
  cyan: {
    accent: '#0891b2',
    soft: 'rgba(8, 145, 178, 0.1)',
  },
  violet: {
    accent: '#7c3aed',
    soft: 'rgba(124, 58, 237, 0.1)',
  },
  amber: {
    accent: '#d97706',
    soft: 'rgba(217, 119, 6, 0.11)',
  },
  emerald: {
    accent: '#059669',
    soft: 'rgba(5, 150, 105, 0.1)',
  },
  slate: {
    accent: '#475569',
    soft: 'rgba(71, 85, 105, 0.12)',
  },
  rose: {
    accent: '#be123c',
    soft: 'rgba(190, 18, 60, 0.1)',
  },
  lime: {
    accent: '#65a30d',
    soft: 'rgba(101, 163, 13, 0.11)',
  },
  orange: {
    accent: '#ea580c',
    soft: 'rgba(234, 88, 12, 0.11)',
  },
  fuchsia: {
    accent: '#c026d3',
    soft: 'rgba(192, 38, 211, 0.1)',
  },
} as const

type ModuleView = 'all' | 'favorites' | 'recent'

const viewOptions: Array<{ value: ModuleView; label: string; icon: LucideIcon }> = [
  { value: 'all', label: 'Todos', icon: Grid3X3 },
  { value: 'favorites', label: 'Favoritos', icon: Star },
  { value: 'recent', label: 'Recientes', icon: Clock3 },
]

const securityModules: MaintenanceModuleDto[] = [
  {
    uuid: 'security-overview',
    slug: 'security-overview',
    title: 'Panel Security',
    description: 'Vista general de usuarios, roles, autorizaciones y actividad del sistema.',
    route: '/security',
    icon: 'LockKeyhole',
    tone: 'slate',
    sortOrder: 10,
  },
  {
    uuid: 'security-users',
    slug: 'security-users',
    title: 'Usuarios',
    description: 'Gestiona cuentas, datos de acceso, estados y perfiles operativos.',
    route: '/users',
    icon: 'UsersRound',
    tone: 'sky',
    sortOrder: 20,
  },
  {
    uuid: 'security-roles',
    slug: 'security-roles',
    title: 'Roles',
    description: 'Administra jerarquías y perfiles base para accesos del sistema.',
    route: '/security/roles',
    icon: 'ShieldCheck',
    tone: 'indigo',
    sortOrder: 30,
  },
  {
    uuid: 'security-matrix',
    slug: 'security-matrix',
    title: 'Matriz de seguridad',
    description: 'Define accesos por nodo, módulo, mantenimiento y accion sensible.',
    route: '/security/matrix',
    icon: 'KeyRound',
    tone: 'violet',
    sortOrder: 40,
  },
  {
    uuid: 'security-audit',
    slug: 'security-audit',
    title: 'Histórico general',
    description: 'Consulta acciones importantes, autorizaciones y cambios de información.',
    route: '/security/audit',
    icon: 'Activity',
    tone: 'teal',
    sortOrder: 50,
  },
]

export function MaintenanceDrawer({ open, onClose, mode }: MaintenanceDrawerProps) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ModuleView>('all')
  const activeModuleSlug = useAuthStore((state) => state.activeModuleSlug)
  const favoriteRoutes = useMaintenanceDrawerStore((state) => state.favoriteRoutes)
  const recentRoutes = useMaintenanceDrawerStore((state) => state.recentRoutes)
  const toggleFavorite = useMaintenanceDrawerStore((state) => state.toggleFavorite)
  const rememberRoute = useMaintenanceDrawerStore((state) => state.rememberRecent)
  const { data: moduleData, error, loading } = useApiQuery('maintenanceModules', fetchMaintenanceModules)
  const isSecurityModule = activeModuleSlug === 'security'
  const modules = isSecurityModule ? securityModules : moduleData ?? []
  const normalizedQuery = query.trim().toLowerCase()

  const canViewProviders = usePermission('view_providers')
  const canViewClients = usePermission('view_clients')
  const canViewProducts = usePermission('view_products')
  const canViewPolicies = usePermission('view_policies')
  const canViewCases = usePermission('view_cases')
  const canViewTags = usePermission('view_tags')
  const canViewWidgets = usePermission('view_widgets')

  const canManageUsers = usePermission('manage_users')
  const canManageRoles = usePermission('manage_roles')
  const canManageSecurityMatrix = usePermission('manage_security_matrix')
  const canViewAuditLog = usePermission('view_audit_log')

  const allowedModules = useMemo(() => {
    return modules.filter((module) => {
      if (module.slug === 'dashboard') return true
      if (module.slug === 'providers') return canViewProviders
      if (module.slug === 'clients') return canViewClients
      if (module.slug === 'products') return canViewProducts
      if (module.slug === 'policies') return canViewPolicies
      if (module.slug === 'cases') return canViewCases
      if (module.slug === 'tags') return canViewTags
      if (module.slug === 'widgets') return canViewWidgets

      if (module.slug === 'security-users') return canManageUsers
      if (module.slug === 'security-roles') return canManageRoles
      if (module.slug === 'security-matrix') return canManageSecurityMatrix
      if (module.slug === 'security-audit') return canViewAuditLog
      return true
    })
  }, [
    modules,
    canViewProviders,
    canViewClients,
    canViewProducts,
    canViewPolicies,
    canViewCases,
    canViewTags,
    canViewWidgets,
    canManageUsers,
    canManageRoles,
    canManageSecurityMatrix,
    canViewAuditLog,
  ])

  const visibleModules = useMemo(() => {
    if (view === 'favorites') {
      return allowedModules.filter((module) => favoriteRoutes.includes(normalizeAppRoute(module.route)))
    }

    if (view === 'recent') {
      return allowedModules
        .filter((module) => recentRoutes.includes(normalizeAppRoute(module.route)))
        .sort((first, second) => recentRoutes.indexOf(normalizeAppRoute(first.route)) - recentRoutes.indexOf(normalizeAppRoute(second.route)))
    }

    return allowedModules
  }, [favoriteRoutes, allowedModules, recentRoutes, view])

  const filteredModules = useMemo(
    () =>
      visibleModules.filter((module) => {
        const text = `${module.title} ${module.description}`.toLowerCase()

        return text.includes(normalizedQuery)
      }),
    [normalizedQuery, visibleModules],
  )

  const rememberRecent = (route: string) => {
    rememberRoute(normalizeAppRoute(route))
    onClose()
  }

  const emptyMessage =
    normalizedQuery.length > 0
      ? 'No hay mantenimientos que coincidan con la búsqueda.'
      : view === 'favorites'
        ? 'Marca mantenimientos con la estrella para tenerlos siempre a mano.'
        : view === 'recent'
          ? 'Los mantenimientos que abras aparecerán aquí.'
          : 'No hay mantenimientos disponibles.'

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
          },
        },
        backdrop: {
          sx: {
            bgcolor: mode === 'light' ? 'rgba(3, 15, 28, 0.34)' : 'rgba(2, 8, 23, 0.62)',
            backdropFilter: 'blur(10px)',
          },
        },
      }}
    >
      <Box
        data-theme={mode}
        className="flex h-full flex-col bg-[var(--himalaya-bg)]/90 text-[var(--himalaya-text)] backdrop-blur-md"
      >
        <Stack
          direction="row"
          className="border-b border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] px-4 py-3 sm:px-6"
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            <HimalayaLogo className="h-10 w-14 shrink-0 sm:h-12 sm:w-16" />
            <Box className="min-w-0">
              <Typography variant="h5" className="truncate">
                Himalaya
              </Typography>
              <Typography variant="body2" color="text.secondary" className="hidden sm:block">
                {isSecurityModule ? 'Security - usuarios, roles y auditoría' : 'SSM - administración de seguros y fianzas'}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} aria-label="Cerrar mantenimientos">
            <X size={20} />
          </IconButton>
        </Stack>

        <Box className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <Stack spacing={3} className="mx-auto max-w-7xl">
            {error && !isSecurityModule ? (
              <Alert severity="error">
                No se pudieron cargar los mantenimientos desde la API.
              </Alert>
            ) : null}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
              <TextField
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar mantenimiento..."
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={18} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                {viewOptions.map((option) => {
                  const Icon = option.icon
                  const selected = view === option.value

                  return (
                    <Button
                      key={option.value}
                      variant={selected ? 'contained' : 'outlined'}
                      startIcon={<Icon size={17} />}
                      onClick={() => setView(option.value)}
                      sx={{ flexShrink: 0 }}
                    >
                      {option.label}
                    </Button>
                  )
                })}
              </Stack>
            </Stack>

            {loading && !isSecurityModule ? (
              <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Box
                    key={index}
                    className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-5"
                  >
                    <Stack spacing={2}>
                      <Skeleton variant="text" width="40%" />
                      <Skeleton variant="text" width="85%" />
                      <Skeleton variant="text" width="65%" />
                    </Stack>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {filteredModules.map((module) => {
                const Icon = getMaintenanceModuleIcon(module.icon)
                const tone = toneStyles[module.tone as keyof typeof toneStyles] ?? toneStyles.sky
                const route = normalizeAppRoute(module.route)
                const isFavorite = favoriteRoutes.includes(route)

                return (
                  <Box
                    key={module.title}
                    className="relative overflow-hidden rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--himalaya-primary)] hover:shadow-[var(--himalaya-shadow)]"
                  >
                    <Box
                      className="absolute inset-y-0 left-0 w-1"
                      sx={{ backgroundColor: tone.accent }}
                    />
                    <Box
                      className="pointer-events-none absolute bottom-3 right-3 h-24 w-24 rounded-lg"
                      sx={{
                        backgroundColor: tone.soft,
                        transform: 'rotate(-6deg)',
                      }}
                    />
                    <Icon
                      size={82}
                      strokeWidth={1.25}
                      className="pointer-events-none absolute bottom-6 right-6 opacity-20"
                      color={tone.accent}
                    />
                    <Tooltip title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
                      <IconButton
                        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        onClick={() => toggleFavorite(route)}
                        size="small"
                        sx={{
                          position: 'absolute',
                          right: 12,
                          top: 12,
                          zIndex: 10,
                          border: '1px solid var(--himalaya-border)',
                          bgcolor: 'var(--himalaya-surface)',
                          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
                          '&:hover': {
                            bgcolor: 'var(--himalaya-surface-soft)',
                          },
                        }}
                      >
                        <Star
                          size={18}
                          fill={isFavorite ? 'currentColor' : 'none'}
                          color={isFavorite ? 'var(--himalaya-primary)' : 'currentColor'}
                        />
                      </IconButton>
                    </Tooltip>

                    <Box
                      component={Link}
                      to={route}
                      onClick={() => rememberRecent(route)}
                      className="relative z-0 block min-h-36 p-5 pr-16 no-underline text-inherit sm:min-h-40"
                    >
                      <Typography variant="subtitle1" className="pr-2">
                        {module.title}
                      </Typography>
                      <Typography variant="body2" className="mt-2 max-w-[28rem] opacity-80">
                        {module.description}
                      </Typography>
                    </Box>
                  </Box>
                )
              })}
              </Box>
            )}

            {!loading && filteredModules.length === 0 ? (
              <Box className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-6 text-center">
                <Typography variant="h6">Sin resultados</Typography>
                <Typography variant="body2" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </Box>
            ) : null}
          </Stack>
        </Box>
      </Box>
    </Dialog>
  )
}
