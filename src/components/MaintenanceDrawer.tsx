import { Alert, Box, Button, Dialog, IconButton, InputAdornment, Skeleton, Stack, TextField, Tooltip, Typography, useMediaQuery } from '@mui/material'
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
  sky: { accent: '#0284c7', soft: 'rgba(2, 132, 199, 0.12)' },
  teal: { accent: '#0f766e', soft: 'rgba(15, 118, 110, 0.12)' },
  indigo: { accent: '#4f46e5', soft: 'rgba(79, 70, 229, 0.12)' },
  cyan: { accent: '#0891b2', soft: 'rgba(8, 145, 178, 0.12)' },
  violet: { accent: '#7c3aed', soft: 'rgba(124, 58, 237, 0.12)' },
  amber: { accent: '#d97706', soft: 'rgba(217, 119, 6, 0.13)' },
  emerald: { accent: '#059669', soft: 'rgba(5, 150, 105, 0.12)' },
  slate: { accent: '#475569', soft: 'rgba(71, 85, 105, 0.14)' },
  rose: { accent: '#be123c', soft: 'rgba(190, 18, 60, 0.12)' },
  lime: { accent: '#65a30d', soft: 'rgba(101, 163, 13, 0.13)' },
  orange: { accent: '#ea580c', soft: 'rgba(234, 88, 12, 0.13)' },
  fuchsia: { accent: '#c026d3', soft: 'rgba(192, 38, 211, 0.12)' },
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
    description: 'Define accesos por nodo, módulo, mantenimiento y acción sensible.',
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
  const isMobile = useMediaQuery('(max-width:600px)')
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
        paper: { sx: { bgcolor: 'transparent', boxShadow: 'none' } },
        backdrop: {
          sx: {
            bgcolor: mode === 'light' ? 'rgba(3, 15, 28, 0.34)' : 'rgba(2, 8, 23, 0.62)',
            backdropFilter: 'blur(12px)',
          },
        },
      }}
    >
      <Box data-theme={mode} className="flex h-full bg-[var(--himalaya-bg)]/80 p-3 text-[var(--himalaya-text)] backdrop-blur-md sm:p-5">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            overflow: 'hidden',
            borderRadius: { xs: 4, sm: 6 },
            border: '1px solid',
            borderColor: 'divider',
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(7,17,31,0.96), rgba(16,40,61,0.88))'
              : 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(238,247,255,0.86))',
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 30px 90px rgba(0,0,0,0.62)'
              : '0 30px 90px rgba(7,89,133,0.22)',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 2.5,
              p: { xs: 2.5, sm: 4 },
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--himalaya-primary) 18%, transparent), transparent 32%), radial-gradient(circle at 86% 16%, color-mix(in srgb, var(--himalaya-accent) 16%, transparent), transparent 32%)',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                right: -64,
                bottom: -110,
                width: 360,
                height: 230,
                opacity: 0.16,
                background: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 420 260%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath d=%27M0 260L92 126L162 198L258 74L420 260H0Z%27 fill=%27%23075985%27/%3E%3Cpath d=%27M258 74L226 114H294L258 74Z%27 fill=%27%23e0f2fe%27/%3E%3Cpath d=%27M92 126L70 160H116L92 126Z%27 fill=%27%23e0f2fe%27/%3E%3C/svg%3E") center / contain no-repeat',
              },
            }}
          >
            <Stack direction="row" spacing={2} sx={{ position: 'relative', zIndex: 1, alignItems: 'center', minWidth: 0 }}>
              <Box sx={{ display: 'grid', placeItems: 'center', width: { xs: 64, sm: 76 }, height: { xs: 56, sm: 64 }, borderRadius: 4, background: 'linear-gradient(135deg, var(--himalaya-primary-soft), color-mix(in srgb, var(--himalaya-surface) 74%, transparent))', border: '1px solid', borderColor: 'divider', color: 'primary.main', boxShadow: 'var(--himalaya-shadow)', flexShrink: 0 }}>
                <HimalayaLogo className="h-12 w-16 sm:h-14 sm:w-20" />
              </Box>
              <Box className="min-w-0">
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                  Centro de mantenimientos
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1.1, fontSize: { xs: '1.4rem', sm: '1.85rem', md: '2.125rem' } }}>
                  Seguros Himalaya
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }} className="hidden sm:block">
                  {isSecurityModule ? 'Usuarios, roles, permisos y auditoría.' : 'Administración de seguros, pólizas, casos y catálogo operativo.'}
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={onClose} aria-label="Cerrar mantenimientos" sx={{ position: 'relative', zIndex: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: 'var(--himalaya-shadow)' }}>
              <X size={20} />
            </IconButton>
          </Stack>

          <Box className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
            <Stack spacing={3} className="mx-auto max-w-7xl">
              {error && !isSecurityModule ? (
                <Alert severity="error">No se pudieron cargar los mantenimientos desde la API.</Alert>
              ) : null}

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', md: 'center' }, p: { xs: 1.25, md: 1 }, borderRadius: { xs: 4, md: 99 }, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'var(--himalaya-shadow)' }}>
                <TextField
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar mantenimiento..."
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: { xs: 3, md: 99 },
                      bgcolor: { xs: 'action.selected', md: 'transparent' },
                      minHeight: 48,
                      '& fieldset': { borderColor: { xs: 'divider', md: 'transparent' } },
                      '&:hover fieldset': { borderColor: { xs: 'primary.main', md: 'transparent' } },
                      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                    },
                  }}
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

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, width: { xs: '100%', md: 'auto' } }}>
                  {viewOptions.map((option) => {
                    const Icon = option.icon
                    const selected = view === option.value
                    return (
                      <Button key={option.value} variant={selected ? 'contained' : 'outlined'} startIcon={<Icon size={17} />} onClick={() => setView(option.value)} sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '0 0 auto' }, justifyContent: 'center', borderRadius: { xs: 2.5, md: 99 }, minHeight: 42, px: 2 }}>
                        {option.label}
                      </Button>
                    )
                  })}
                </Stack>
              </Stack>

              {loading && !isSecurityModule ? (
                <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Box key={index} className="rounded-3xl border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-6">
                      <Stack spacing={2}>
                        <Skeleton variant="text" width="40%" />
                        <Skeleton variant="text" width="85%" />
                        <Skeleton variant="text" width="65%" />
                      </Stack>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box className="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredModules.map((module) => {
                    const Icon = getMaintenanceModuleIcon(module.icon)
                    const tone = toneStyles[module.tone as keyof typeof toneStyles] ?? toneStyles.sky
                    const route = normalizeAppRoute(module.route)
                    const isFavorite = favoriteRoutes.includes(route)

                    return (
                      <Box key={module.title} className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] shadow-sm transition hover:-translate-y-1 hover:border-[var(--himalaya-primary)] hover:shadow-[var(--himalaya-shadow)]">
                        <Box className="absolute inset-y-0 left-0 w-1" sx={{ backgroundColor: tone.accent }} />
                        <Box className="pointer-events-none absolute bottom-2 right-2 h-16 w-16 sm:h-28 sm:w-28 rounded-2xl sm:rounded-3xl" sx={{ backgroundColor: tone.soft, transform: 'rotate(-8deg)' }} />
                        <Icon size={isMobile ? 48 : 88} strokeWidth={1.2} className="pointer-events-none absolute bottom-4 right-4 sm:bottom-7 sm:right-7 opacity-20" color={tone.accent} />
                        <Tooltip title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
                          <IconButton
                            aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                            onClick={() => toggleFavorite(route)}
                            size="small"
                            sx={{ position: 'absolute', right: 12, top: 12, zIndex: 10, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 0.5, sm: 0.75 }, boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)' }}
                          >
                            <Star size={isMobile ? 15 : 18} fill={isFavorite ? 'currentColor' : 'none'} color={isFavorite ? 'var(--himalaya-primary)' : 'currentColor'} />
                          </IconButton>
                        </Tooltip>
                        <Box component={Link} to={route} onClick={() => rememberRecent(route)} className="relative z-0 block pr-14 sm:pr-16 no-underline text-inherit" sx={{ minHeight: { xs: 80, sm: 160 }, p: { xs: 2, sm: 3 } }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, fontSize: { xs: '0.925rem', sm: '1.08rem' } }} className="pr-1">
                            {module.title}
                          </Typography>
                          <Typography variant="body2" className="mt-1 max-w-[28rem] opacity-80" sx={{ fontSize: { xs: '0.785rem', sm: '0.875rem' }, lineHeight: 1.4 }}>
                            {module.description}
                          </Typography>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )}

              {!loading && filteredModules.length === 0 ? (
                <Box className="rounded-3xl border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-6 text-center">
                  <Typography variant="h6">Sin resultados</Typography>
                  <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
                </Box>
              ) : null}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Dialog>
  )
}
