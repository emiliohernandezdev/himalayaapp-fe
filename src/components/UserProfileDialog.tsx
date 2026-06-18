import { Dialog, Box, Typography, Stack, Avatar, IconButton, Button, TextField, Chip, Switch, CircularProgress, InputAdornment } from '@mui/material'
import { X, User, Shield, Palette, Bell, Key, Smartphone, Check, Eye, EyeOff, Layers } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { userRoleLabels, updateSecurityUser } from '../api/securityApi'
import { toast } from 'sonner'

type TabType = 'profile' | 'security' | 'appearance' | 'notifications'

interface UserProfileDialogProps {
  open: boolean
  onClose: () => void
  initialTab?: TabType
  mode: 'light' | 'dark'
  onToggleMode: () => void
}

export function UserProfileDialog({ open, onClose, initialTab = 'profile', mode, onToggleMode }: UserProfileDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const { user, accessNodes, activeModuleSlug } = useAuthStore()
  const activeModule = accessNodes.flatMap((node) => node.modules).find((module) => module.slug === activeModuleSlug)
  const activeNode = accessNodes.find((node) => node.modules.some((module) => module.slug === activeModuleSlug))

  // State for profile form
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [loadingProfile, setLoadingProfile] = useState(false)

  // State for password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loadingPassword, setLoadingPassword] = useState(false)

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  const tabs: { id: TabType, label: string, icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Información General', icon: <User size={18} /> },
    { id: 'security', label: 'Seguridad y Acceso', icon: <Shield size={18} /> },
    { id: 'appearance', label: 'Apariencia y Tema', icon: <Palette size={18} /> },
    { id: 'notifications', label: 'Notificaciones', icon: <Bell size={18} /> },
  ]

  const handleUpdateProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Nombres y apellidos son requeridos')
      return
    }
    setLoadingProfile(true)
    try {
      await updateSecurityUser({
        uuid: user.uuid,
        firstName,
        lastName,
      })
      toast.success('Perfil actualizado correctamente. Los cambios se verán en tu próximo inicio de sesión.')
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar perfil')
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setLoadingPassword(true)
    try {
      await updateSecurityUser({
        uuid: user.uuid,
        password: newPassword,
      })
      toast.success('Contraseña actualizada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar contraseña')
    } finally {
      setLoadingPassword(false)
    }
  }

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
        {/* Top Header */}
        <Stack
          direction="row"
          className="border-b border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] px-4 py-3 sm:px-6"
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Avatar 
              sx={{ 
                width: 40, 
                height: 40, 
                bgcolor: 'primary.main', 
                color: 'primary.contrastText',
                fontWeight: 800,
              }}
            >
              {initials}
            </Avatar>
            <Box className="min-w-0">
              <Typography variant="h6" className="truncate" sx={{ fontWeight: 800 }}>
                Configuración del Sistema
              </Typography>
              <Typography variant="body2" color="text.secondary" className="hidden sm:block" sx={{ fontSize: '0.8rem' }}>
                Gestiona tus datos personales, contraseñas, apariencia y preferencias del sistema.
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} aria-label="Cerrar panel">
            <X size={20} />
          </IconButton>
        </Stack>

        {/* Content area: Sidebar + Details */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, overflow: 'hidden' }}>
          
          {/* Sidebar */}
          <Box 
            sx={{ 
              width: { xs: '100%', md: 280 }, 
              bgcolor: 'var(--himalaya-surface)', 
              borderRight: { xs: 'none', md: '1px solid var(--himalaya-border)' },
              borderBottom: { xs: '1px solid var(--himalaya-border)', md: 'none' },
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0
            }}
          >
            <Stack spacing={0.5} sx={{ p: 2, flex: 1, overflowY: 'auto' }} direction={{ xs: 'row', md: 'column' }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <Button
                    key={tab.id}
                    fullWidth
                    onClick={() => setActiveTab(tab.id)}
                    sx={{
                      justifyContent: 'flex-start',
                      py: 1.5,
                      px: 2,
                      borderRadius: 1.5,
                      color: isActive ? 'var(--himalaya-primary)' : 'var(--himalaya-text)',
                      bgcolor: isActive ? 'action.selected' : 'transparent',
                      fontWeight: isActive ? 750 : 600,
                      textTransform: 'none',
                      minWidth: { xs: 'max-content', md: '100%' },
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: isActive ? 'action.selected' : 'action.hover',
                      }
                    }}
                    startIcon={tab.icon}
                  >
                    {tab.label}
                  </Button>
                )
              })}
            </Stack>
          </Box>

          {/* Details Content Panel */}
          <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: 'transparent', p: { xs: 3, sm: 6 } }}>
            <Box sx={{ maxWidth: 680, mx: 'auto' }}>
              
              {/* 1. PROFILE TAB */}
              {activeTab === 'profile' && (
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 850, mb: 1, letterSpacing: '-0.02em' }}>Perfil de Usuario</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontSize: '0.95rem' }}>Administra tu información personal y cómo te ven los demás en el sistema.</Typography>
                  
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: 'center', mb: 5, p: 3, borderRadius: 2, border: '1px solid var(--himalaya-border)', bg: 'var(--himalaya-surface)' }}>
                    <Avatar 
                      sx={{ 
                        width: 88, 
                        height: 88, 
                        bgcolor: 'primary.main', 
                        color: 'primary.contrastText',
                        fontSize: '2.5rem', 
                        fontWeight: 800,
                        border: '4px solid var(--himalaya-border)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                      }}
                    >
                      {initials}
                    </Avatar>
                    <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                      <Stack direction="row" spacing={1} sx={{ mb: 1, justifyContent: { xs: 'center', sm: 'flex-start' }, flexWrap: 'wrap' }}>
                        {user.roles.map((r) => (
                          <Chip key={r} label={userRoleLabels[r] ?? r} size="small" color="primary" sx={{ fontWeight: 750, fontSize: '0.7rem', textTransform: 'uppercase', height: 24 }} />
                        ))}
                      </Stack>
                      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{user.firstName} {user.lastName}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{user.email}</Typography>
                      <Box sx={{ mt: 1.5, display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.75, borderRadius: 1.5, border: '1px solid var(--himalaya-border)', bgcolor: 'var(--himalaya-surface-soft)' }}>
                        <Layers size={15} />
                        <Typography variant="caption" sx={{ fontWeight: 750, color: 'text.primary' }}>
                          {activeNode?.nickname ?? 'Global'} / {activeModule?.title ?? 'Plataforma'}
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>

                  <Stack spacing={3}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField fullWidth label="Nombres" value={firstName} onChange={(e) => setFirstName(e.target.value)} variant="outlined" />
                      <TextField fullWidth label="Apellidos" value={lastName} onChange={(e) => setLastName(e.target.value)} variant="outlined" />
                    </Stack>
                    <TextField fullWidth label="Correo Electrónico Corporativo" value={user.email} variant="outlined" disabled />
                    <TextField fullWidth label="Teléfono de Contacto" placeholder="+502 0000-0000" variant="outlined" />
                    
                    <Box sx={{ mt: 2, pt: 3, borderTop: '1px solid var(--himalaya-border)', display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        size="large" 
                        onClick={handleUpdateProfile}
                        disabled={loadingProfile}
                        startIcon={loadingProfile ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{ px: 4, borderRadius: 1.5, fontWeight: 700 }}
                      >
                        Guardar Cambios
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              )}

              {/* 2. SECURITY TAB */}
              {activeTab === 'security' && (
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 850, mb: 1, letterSpacing: '-0.02em' }}>Seguridad y Acceso</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontSize: '0.95rem' }}>Administra tus credenciales y aumenta la seguridad de tu cuenta.</Typography>
                  
                  <Box sx={{ border: '1px solid var(--himalaya-border)', borderRadius: 2, p: 3, mb: 3, bgcolor: 'var(--himalaya-surface)' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
                      <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, color: 'text.primary', display: { xs: 'none', sm: 'block' } }}>
                        <Key size={24} />
                      </Box>
                      <Box sx={{ flex: 1, width: '100%' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Cambiar Contraseña</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Te recomendamos usar una contraseña de al menos 12 caracteres para mayor seguridad.</Typography>
                        <Stack spacing={2.5}>
                          
                          <TextField 
                            fullWidth 
                            type={showCurrentPassword ? 'text' : 'password'} 
                            label="Contraseña Actual" 
                            value={currentPassword} 
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            slotProps={{
                              input: {
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end">
                                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </IconButton>
                                  </InputAdornment>
                                )
                              }
                            }}
                          />

                          <TextField 
                            fullWidth 
                            type={showNewPassword ? 'text' : 'password'} 
                            label="Nueva Contraseña" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)}
                            slotProps={{
                              input: {
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end">
                                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </IconButton>
                                  </InputAdornment>
                                )
                              }
                            }}
                          />

                          <TextField 
                            fullWidth 
                            type={showConfirmPassword ? 'text' : 'password'} 
                            label="Confirmar Nueva Contraseña" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            slotProps={{
                              input: {
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </IconButton>
                                  </InputAdornment>
                                )
                              }
                            }}
                          />
                          
                          <Button 
                            variant="contained" 
                            color="inherit" 
                            onClick={handleUpdatePassword}
                            disabled={loadingPassword || !newPassword}
                            startIcon={loadingPassword ? <CircularProgress size={20} color="inherit" /> : null}
                            sx={{ width: 'max-content', mt: 1, fontWeight: 700, px: 3, border: '1px solid var(--himalaya-border)' }}
                          >
                            Actualizar Contraseña
                          </Button>
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>

                  <Box sx={{ border: '1px solid var(--himalaya-border)', borderRadius: 2, p: 3, bgcolor: 'var(--himalaya-surface)' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
                      <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, color: 'success.main' }}>
                        <Smartphone size={24} />
                      </Box>
                      <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Autenticación en Dos Pasos (2FA)</Typography>
                        <Typography variant="body2" color="text.secondary">Agrega una capa adicional de seguridad a tu cuenta.</Typography>
                      </Box>
                      <Button variant="outlined" color="inherit" sx={{ fontWeight: 700, mt: { xs: 2, sm: 0 }, border: '1px solid var(--himalaya-border)' }}>
                        Configurar App
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              )}

              {/* 3. APPEARANCE TAB */}
              {activeTab === 'appearance' && (
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 850, mb: 1, letterSpacing: '-0.02em' }}>Apariencia</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Personaliza cómo se ve el sistema en tu dispositivo.</Typography>
                  
                  <Typography variant="subtitle2" sx={{ fontWeight: 750, mb: 2 }}>Tema Visual</Typography>
                  <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                    {/* Light Mode Card */}
                    <Box 
                      onClick={() => { if (mode !== 'light') onToggleMode() }}
                      sx={{ 
                        flex: 1, 
                        cursor: 'pointer', 
                        borderRadius: 2, 
                        border: '2px solid', 
                        borderColor: mode === 'light' ? 'primary.main' : 'var(--himalaya-border)',
                        bgcolor: 'var(--himalaya-surface)',
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      <Box sx={{ p: 2, bgcolor: '#f5f9fd', height: 100 }}>
                        <Box sx={{ width: '60%', height: 12, bgcolor: '#cfe1ef', borderRadius: 1, mb: 1 }} />
                        <Box sx={{ width: '40%', height: 12, bgcolor: '#cfe1ef', borderRadius: 1 }} />
                      </Box>
                      <Box sx={{ p: 1.5, borderTop: '1px solid var(--himalaya-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>Modo Claro</Typography>
                        {mode === 'light' && <Check size={16} color="var(--himalaya-primary)" />}
                      </Box>
                    </Box>

                    {/* Dark Mode Card */}
                    <Box 
                      onClick={() => { if (mode !== 'dark') onToggleMode() }}
                      sx={{ 
                        flex: 1, 
                        cursor: 'pointer', 
                        borderRadius: 2, 
                        border: '2px solid', 
                        borderColor: mode === 'dark' ? 'primary.main' : 'var(--himalaya-border)',
                        bgcolor: 'var(--himalaya-surface)',
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      <Box sx={{ p: 2, bgcolor: '#07111f', height: 100 }}>
                        <Box sx={{ width: '60%', height: 12, bgcolor: '#24435b', borderRadius: 1, mb: 1 }} />
                        <Box sx={{ width: '40%', height: 12, bgcolor: '#24435b', borderRadius: 1 }} />
                      </Box>
                      <Box sx={{ p: 1.5, borderTop: '1px solid var(--himalaya-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>Modo Oscuro</Typography>
                        {mode === 'dark' && <Check size={16} color="var(--himalaya-primary)" />}
                      </Box>
                    </Box>
                  </Stack>
                </Box>
              )}

              {/* 4. NOTIFICATIONS TAB */}
              {activeTab === 'notifications' && (
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 850, mb: 1, letterSpacing: '-0.02em' }}>Notificaciones</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Controla qué correos y alertas recibes de Seguros Himalaya.</Typography>
                  
                  <Stack spacing={3}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--himalaya-border)', pb: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Resumen Diario</Typography>
                        <Typography variant="body2" color="text.secondary">Recibe un reporte de los casos cerrados y vencidos del día.</Typography>
                      </Box>
                      <Switch defaultChecked color="primary" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--himalaya-border)', pb: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Asignación de Casos</Typography>
                        <Typography variant="body2" color="text.secondary">Alerta inmediata cuando te asignan un nuevo caso.</Typography>
                      </Box>
                      <Switch defaultChecked color="primary" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--himalaya-border)', pb: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Vencimiento de Pólizas</Typography>
                        <Typography variant="body2" color="text.secondary">Avisos 30 y 15 días antes de vencer las pólizas asignadas a ti.</Typography>
                      </Box>
                      <Switch defaultChecked color="primary" />
                    </Box>
                  </Stack>
                </Box>
              )}

            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  )
}
