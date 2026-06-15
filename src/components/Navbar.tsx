import { Avatar, Box, Container, IconButton, Stack, Tooltip, Typography, Menu, MenuItem, ListItemIcon, Divider, ButtonBase } from '@mui/material'
import type { PaletteMode } from '@mui/material/styles'
import { Layers, LogOut, Moon, Sun, User as UserIcon } from 'lucide-react'
import { useState } from 'react'
import { AppLauncherIcon } from './AppLauncherIcon'
import { HimalayaLogo } from './HimalayaLogo'
import { MaintenanceDrawer } from './MaintenanceDrawer'
import { useAuthStore } from '../store/useAuthStore'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { userRoleLabels } from '../api/securityApi'

type NavbarProps = {
  mode: PaletteMode
  onToggleMode: () => void
}

export function Navbar({ mode, onToggleMode }: NavbarProps) {
  const [maintenanceOpen, setMaintenanceOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const menuOpen = Boolean(anchorEl)
  
  const ThemeIcon = mode === 'light' ? Moon : Sun
  const { user, logout, accessNodes, activeModuleSlug } = useAuthStore()
  const navigate = useNavigate()
  const moduleCount = accessNodes.reduce((count, node) => count + node.modules.length, 0)
  const activeModule = accessNodes.flatMap((node) => node.modules).find((module) => module.slug === activeModuleSlug)
  const activeNode = accessNodes.find((node) => node.modules.some((module) => module.slug === activeModuleSlug))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U'

  return (
    <Box
      component="header"
      className="sticky top-0 z-20 border-b border-[var(--himalaya-border)] bg-[var(--himalaya-surface)]/95 backdrop-blur"
    >
      <Container maxWidth="xl" className="px-4 py-2.5 sm:px-6">
        <Stack direction="row" sx={{ alignItems: 'center', gap: { xs: 1, sm: 2 }, justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} sx={{ alignItems: 'center', minWidth: 0, flexGrow: 1 }}>
            <HimalayaLogo className="h-9 w-12 shrink-0 sm:h-11 sm:w-15" />
            <Box className="min-w-0" sx={{ mr: { xs: 0.5, sm: 1 } }}>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 850, fontSize: { xs: '1.05rem', sm: '1.25rem' } }} className="truncate">
                Himalaya {activeNode ? `(${activeNode.nickname})` : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.75rem' }} className="truncate">
                {activeModule ? activeModule.title : 'Administracion de seguros y fianzas'}
              </Typography>
            </Box>
            <Tooltip title="Abrir mantenimientos">
              <IconButton
                aria-label="Abrir mantenimientos"
                onClick={() => setMaintenanceOpen(true)}
                size="small"
                className="shrink-0 border border-[var(--himalaya-border)]"
                sx={{ p: 0.75 }}
              >
                <AppLauncherIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Tooltip title={mode === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}>
              <IconButton
                aria-label="Cambiar tema"
                onClick={onToggleMode}
                size="small"
                className="shrink-0 border border-[var(--himalaya-border)]"
                sx={{ p: 0.75 }}
              >
                <ThemeIcon size={16} />
              </IconButton>
            </Tooltip>

            {user && (
              <>
                <ButtonBase
                  onClick={handleMenuOpen}
                  sx={{
                    p: 0.5,
                    px: { xs: 0.5, sm: 1.25 },
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'var(--himalaya-border)',
                    bgcolor: 'action.hover',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: 'var(--himalaya-primary)', width: 28, height: 28, fontSize: '0.75rem', fontWeight: 700 }}>
                      {initials}
                    </Avatar>
                    <Box sx={{ textAlign: 'left', display: { xs: 'none', md: 'block' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 650, lineHeight: 1.1, fontSize: '0.8rem' }}>
                        {user.firstName} {user.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'capitalize', fontSize: '0.68rem', lineHeight: 1 }}>
                        {user.roles.map((r) => userRoleLabels[r] ?? r).join(', ')}
                      </Typography>
                    </Box>
                  </Stack>
                </ButtonBase>

                <Menu
                  anchorEl={anchorEl}
                  open={menuOpen}
                  onClose={handleMenuClose}
                  onClick={handleMenuClose}
                  slotProps={{
                    paper: {
                      elevation: 0,
                      sx: {
                        mt: 1.5,
                        borderRadius: 3,
                        minWidth: 200,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        overflow: 'visible',
                        '&::before': {
                          content: '""',
                          display: 'block',
                          position: 'absolute',
                          top: 0,
                          right: 14,
                          width: 10,
                          height: 10,
                          bgcolor: 'background.paper',
                          transform: 'translateY(-50%) rotate(45deg)',
                          zIndex: 0,
                          borderLeft: '1px solid',
                          borderTop: '1px solid',
                          borderColor: 'divider',
                        },
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {user.firstName} {user.lastName}
                    </Typography>
                    {user.email && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {user.email}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.selected', color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                      {user.roles.map((r) => userRoleLabels[r] ?? r).join(', ')}
                    </Typography>
                  </Box>
                  <Divider />
                  {moduleCount > 1 && (
                    <MenuItem onClick={() => { logout(); navigate('/login') }} sx={{ py: 1, fontSize: '0.875rem' }}>
                      <ListItemIcon sx={{ minWidth: '32px !important' }}>
                        <Layers size={16} />
                      </ListItemIcon>
                      Cambiar modulo
                    </MenuItem>
                  )}
                  <MenuItem onClick={() => { navigate('/users'); toast.info('Perfil de usuario') }} sx={{ py: 1, fontSize: '0.875rem' }}>
                    <ListItemIcon sx={{ minWidth: '32px !important' }}>
                      <UserIcon size={16} />
                    </ListItemIcon>
                    Mi Perfil
                  </MenuItem>
                  <MenuItem onClick={handleLogout} sx={{ color: 'error.main', py: 1, fontSize: '0.875rem' }}>
                    <ListItemIcon sx={{ color: 'error.main', minWidth: '32px !important' }}>
                      <LogOut size={16} />
                    </ListItemIcon>
                    Cerrar Sesión
                  </MenuItem>
                </Menu>
              </>
            )}
          </Stack>
        </Stack>
      </Container>

      <MaintenanceDrawer
        mode={mode}
        open={maintenanceOpen}
        onClose={() => setMaintenanceOpen(false)}
      />
    </Box>
  )
}
