import { Alert, Avatar, Box, Button, Container, Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography, Menu, MenuItem, ListItemIcon, Divider, ButtonBase, Badge, Chip } from '@mui/material'
import type { PaletteMode } from '@mui/material/styles'
import type { GridColDef } from '@mui/x-data-grid'
import CircularProgress from '@mui/material/CircularProgress'
import DialogActions from '@mui/material/DialogActions'
import { CalendarClock, CircleAlert, ClipboardCheck, Layers, LogOut, MessageSquare, Moon, Sun, User as UserIcon, Shield, Palette, Bell, Briefcase, ShieldAlert, FileText, Plus, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { AppLauncherIcon } from './AppLauncherIcon'
import { HimalayaLogo } from './HimalayaLogo'
import { MaintenanceDrawer } from './MaintenanceDrawer'
import { UserProfileDialog } from './UserProfileDialog'
import { useAuthStore } from '../store/useAuthStore'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { userRoleLabels } from '../api/securityApi'
import { fetchMyNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notificationApi'
import type { SystemNotification } from '../api/notificationApi'
import { createCase, fetchPolicies, type PolicyRaw } from '../api/maintenanceApi'
import { ResponsiveDataGrid } from './ResponsiveDataGrid'
import { caseRoute } from '../utils/routes'
import { publishAppEvent, subscribeAppEvent } from '../utils/appEvents'
import { esESGrid } from '../utils/enumLabels'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

type NavbarProps = {
  mode: PaletteMode
  onToggleMode: () => void
}

const caseNotificationTypes = new Set([
  'case_assignment',
  'case_status_change',
  'case_priority_change',
  'case_due_date_change',
  'case_comment',
  'case_internal_comment',
])

const policyNotificationTypes = new Set([
  'policy_expired',
  'policy_expiring_soon',
  'policy_renewal_due',
])

function isCaseNotification(notification: SystemNotification) {
  return Boolean(notification.relatedEntityUuid && notification.type && caseNotificationTypes.has(notification.type))
}

function isPolicyNotification(notification: SystemNotification) {
  return Boolean(notification.type && policyNotificationTypes.has(notification.type))
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function sortPoliciesByEndDate(policies: PolicyRaw[]) {
  return [...policies].sort((first, second) => first.endDate.localeCompare(second.endDate))
}

function normalizePolicyStatus(status: string) {
  return status
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase()
}

function isOpenPolicyStatus(status: string) {
  return ['active', 'pending_renewal'].includes(normalizePolicyStatus(status))
}

function upcomingOpenPolicies(policies: PolicyRaw[], today: string) {
  return sortPoliciesByEndDate(policies.filter((policy) => isOpenPolicyStatus(policy.status) && policy.endDate >= today))
}

function policyStatusLabel(status: string) {
  const normalized = normalizePolicyStatus(status)
  if (normalized === 'expired') return 'Vencida'
  if (normalized === 'pending_renewal') return 'Por renovar'
  if (normalized === 'cancelled') return 'Cancelada'
  if (normalized === 'draft') return 'Borrador'
  return 'Vigente'
}

function policyStatusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
  const normalized = normalizePolicyStatus(status)
  if (normalized === 'expired' || normalized === 'cancelled') return 'error'
  if (normalized === 'pending_renewal') return 'warning'
  if (normalized === 'active') return 'success'
  return 'default'
}

function formatPolicyPremium(policy: PolicyRaw) {
  if (policy.premiumAmount == null) return '—'
  const currency = policy.currency ?? 'GTQ'
  return `${currency} ${Number(policy.premiumAmount).toLocaleString('es-GT')}`
}

function filterPoliciesForNotification(policies: PolicyRaw[], notification: SystemNotification) {
  const today = new Date().toISOString().slice(0, 10)
  const expirationLimit = addDays(today, 15)
  const renewalLimit = addDays(today, 45)
  let filtered: PolicyRaw[] = []

  if (notification.type === 'policy_expired') {
    filtered = policies.filter((policy) => normalizePolicyStatus(policy.status) === 'expired' || policy.endDate < today)
    if (!filtered.length) {
      filtered = policies.filter((policy) => normalizePolicyStatus(policy.status) === 'expired')
    }
    return sortPoliciesByEndDate(filtered)
  }
  if (notification.type === 'policy_expiring_soon') {
    filtered = policies.filter((policy) => isOpenPolicyStatus(policy.status) && policy.endDate >= today && policy.endDate <= expirationLimit)
    if (!filtered.length) {
      filtered = policies.filter((policy) => isOpenPolicyStatus(policy.status) && policy.endDate >= today && policy.endDate <= renewalLimit)
    }
    if (!filtered.length) {
      filtered = upcomingOpenPolicies(policies, today)
    }
    return sortPoliciesByEndDate(filtered)
  }
  if (notification.type === 'policy_renewal_due') {
    filtered = policies.filter((policy) => isOpenPolicyStatus(policy.status) && policy.endDate > expirationLimit && policy.endDate <= renewalLimit)
    if (!filtered.length) {
      filtered = policies.filter((policy) => normalizePolicyStatus(policy.status) === 'pending_renewal' || (isOpenPolicyStatus(policy.status) && policy.endDate >= today && policy.endDate <= renewalLimit))
    }
    if (!filtered.length) {
      filtered = upcomingOpenPolicies(policies, today)
    }
    return sortPoliciesByEndDate(filtered)
  }
  return []
}

function getNotificationConfig(notification: SystemNotification) {
  if (notification.type === 'case_assignment') {
    return {
      icon: Briefcase,
      color: '#d97706',
      bgSoft: 'rgba(217, 119, 6, 0.1)',
      tag: 'Asignación',
    }
  }
  if (notification.type === 'case_status_change') {
    return {
      icon: ClipboardCheck,
      color: '#0f766e',
      bgSoft: 'rgba(15, 118, 110, 0.1)',
      tag: 'Estado',
    }
  }
  if (notification.type === 'case_comment' || notification.type === 'case_internal_comment') {
    return {
      icon: MessageSquare,
      color: notification.type === 'case_internal_comment' ? '#7c3aed' : '#0284c7',
      bgSoft: notification.type === 'case_internal_comment' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(2, 132, 199, 0.1)',
      tag: notification.type === 'case_internal_comment' ? 'Comentario interno' : 'Comentario',
    }
  }
  if (notification.type === 'case_priority_change') {
    return {
      icon: CircleAlert,
      color: '#be123c',
      bgSoft: 'rgba(190, 18, 60, 0.1)',
      tag: 'Prioridad',
    }
  }
  if (notification.type === 'case_due_date_change') {
    return {
      icon: CalendarClock,
      color: '#4f46e5',
      bgSoft: 'rgba(79, 70, 229, 0.1)',
      tag: 'Seguimiento',
    }
  }
  if (notification.type === 'policy_expired') {
    return {
      icon: FileText,
      color: '#be123c',
      bgSoft: 'rgba(190, 18, 60, 0.1)',
      tag: 'Pólizas vencidas',
    }
  }
  if (notification.type === 'policy_expiring_soon') {
    return {
      icon: CalendarClock,
      color: '#d97706',
      bgSoft: 'rgba(217, 119, 6, 0.1)',
      tag: 'Por vencer',
    }
  }
  if (notification.type === 'policy_renewal_due') {
    return {
      icon: FileText,
      color: '#0f766e',
      bgSoft: 'rgba(15, 118, 110, 0.1)',
      tag: 'Renovación',
    }
  }

  const lowercaseTitle = notification.title.toLowerCase()
  if (lowercaseTitle.includes('caso') || lowercaseTitle.includes('siniestro') || lowercaseTitle.includes('asignado')) {
    return {
      icon: Briefcase,
      color: '#d97706', // Amber
      bgSoft: 'rgba(217, 119, 6, 0.1)',
      tag: 'Operaciones'
    }
  }
  if (lowercaseTitle.includes('seguridad') || lowercaseTitle.includes('acceso') || lowercaseTitle.includes('contraseña') || lowercaseTitle.includes('usuario')) {
    return {
      icon: ShieldAlert,
      color: '#ef4444', // Red
      bgSoft: 'rgba(239, 68, 68, 0.1)',
      tag: 'Seguridad'
    }
  }
  if (lowercaseTitle.includes('póliza') || lowercaseTitle.includes('vence') || lowercaseTitle.includes('vencimiento') || lowercaseTitle.includes('fianza')) {
    return {
      icon: FileText,
      color: '#3b82f6', // Blue
      bgSoft: 'rgba(59, 130, 246, 0.1)',
      tag: 'Finanzas'
    }
  }
  return {
    icon: Bell,
    color: '#64748b', // Slate
    bgSoft: 'rgba(100, 116, 139, 0.1)',
    tag: 'Sistema'
  }
}

export function Navbar({ mode, onToggleMode }: NavbarProps) {
  const [maintenanceOpen, setMaintenanceOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  
  // Notification States
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null)
  const notificationMenuOpen = Boolean(notificationAnchorEl)
  
  // States for the new user profile dialog
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileActiveTab, setProfileActiveTab] = useState<'profile' | 'security' | 'appearance' | 'notifications'>('profile')
  
  const menuOpen = Boolean(anchorEl)
  
  const ThemeIcon = mode === 'light' ? Moon : Sun
  const { user, logout, accessNodes, activeModuleSlug } = useAuthStore()
  const navigate = useNavigate()
  const activeModule = accessNodes.flatMap((node) => node.modules).find((module) => module.slug === activeModuleSlug)
  const activeNode = accessNodes.find((node) => node.modules.some((module) => module.slug === activeModuleSlug))

  const [notificationsData, setNotificationsData] = useState<SystemNotification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState<string | null>(null)
  const notificationsRequestInFlight = useRef(false)
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  const [policyDialogNotification, setPolicyDialogNotification] = useState<SystemNotification | null>(null)
  const [policyDialogPolicies, setPolicyDialogPolicies] = useState<PolicyRaw[]>([])
  const [policyDialogLoading, setPolicyDialogLoading] = useState(false)
  const [policyDialogPaginationModel, setPolicyDialogPaginationModel] = useState({ page: 0, pageSize: 5 })
  const [creatingRenewalCases, setCreatingRenewalCases] = useState(false)

  const refetchNotifications = useCallback(async () => {
    if (!user) {
      setNotificationsData([])
      setNotificationsError(null)
      return
    }

    if (notificationsRequestInFlight.current) return
    notificationsRequestInFlight.current = true
    setNotificationsLoading(true)
    try {
      const notifications = await fetchMyNotifications()
      setNotificationsData(notifications)
      setNotificationsError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar las notificaciones.'
      setNotificationsError(message)
    } finally {
      notificationsRequestInFlight.current = false
      setNotificationsLoading(false)
    }
  }, [user])

  useEffect(() => {
    refetchNotifications()
  }, [refetchNotifications])

  useEffect(() => {
    const refreshNotifications = () => refetchNotifications()
    window.addEventListener('himalaya-notifications:refresh', refreshNotifications)
    const unsubscribe = subscribeAppEvent('notifications:refresh', refreshNotifications)
    return () => {
      window.removeEventListener('himalaya-notifications:refresh', refreshNotifications)
      unsubscribe()
    }
  }, [refetchNotifications])

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refetchNotifications()
      }
    }
    window.addEventListener('focus', refetchNotifications)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('focus', refetchNotifications)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [refetchNotifications])

  const policyDialogColumns = useMemo<GridColDef<PolicyRaw>[]>(() => [
    { field: 'policyNumber', headerName: 'No. póliza', width: 150 },
    { field: 'client', headerName: 'Cliente', flex: 1, minWidth: 190, valueGetter: (_value, row) => row.client?.displayName ?? '—' },
    { field: 'product', headerName: 'Producto', flex: 1, minWidth: 170, valueGetter: (_value, row) => row.product?.name ?? '—' },
    {
      field: 'status',
      headerName: 'Estado',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={policyStatusLabel(params.row.status)}
          size="small"
          color={policyStatusColor(params.row.status)}
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    {
      field: 'endDate',
      headerName: 'Vence',
      width: 130,
      valueGetter: (_value, row) => row.endDate ? dayjs(row.endDate).format('DD/MM/YYYY') : '—',
    },
    {
      field: 'premiumAmount',
      headerName: 'Prima',
      width: 140,
      valueGetter: (_value, row) => formatPolicyPremium(row),
    },
  ], [])

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

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget)
    refetchNotifications()
  }

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null)
  }

  const handleMarkAsRead = async (uuid: string) => {
    try {
      await markNotificationRead(uuid)
      refetchNotifications()
    } catch (e) {
      toast.error('No se pudo marcar como leída')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotificationsData((current) => current.map((notification) => ({ ...notification, isRead: true })))
      refetchNotifications()
    } catch (e) {
      toast.error('No se pudieron marcar las notificaciones como leídas')
    }
  }

  const handleOpenPolicyNotification = async (notification: SystemNotification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.uuid)
    }

    setPolicyDialogNotification(notification)
    setPolicyDialogPolicies([])
    setPolicyDialogPaginationModel({ page: 0, pageSize: 5 })
    setPolicyDialogOpen(true)
    setPolicyDialogLoading(true)
    handleNotificationMenuClose()

    try {
      const policiesData = await fetchPolicies()
      setPolicyDialogPolicies(filterPoliciesForNotification(policiesData.items, notification))
    } catch (error) {
      toast.error('No se pudieron cargar las pólizas de la notificación')
      setPolicyDialogPolicies([])
    } finally {
      setPolicyDialogLoading(false)
    }
  }

  const handleCreateRenewalFollowUpCases = async () => {
    if (!policyDialogPolicies.length || creatingRenewalCases) return

    const policiesWithoutClient = policyDialogPolicies.filter((policy) => !(policy.clientUuid || policy.client?.uuid))
    if (policiesWithoutClient.length) {
      toast.error('Hay pólizas sin cliente asociado. No se pueden crear casos de seguimiento.')
      return
    }

    setCreatingRenewalCases(true)
    try {
      await Promise.all(
        policyDialogPolicies.map((policy) => {
          return createCase({
            title: `Seguimiento de renovación ${policy.policyNumber}`,
            description: `Seguimiento generado desde notificación de renovación para la póliza ${policy.policyNumber}. Vence el ${dayjs(policy.endDate).format('DD/MM/YYYY')}.`,
            type: 'Renewal',
            status: 'Pending',
            priority: 'Medium',
            dueAt: policy.endDate,
            clientId: policy.clientUuid || policy.client?.uuid,
            policyId: policy.uuid,
            tagUuids: [],
          })
        }),
      )
      toast.success(policyDialogPolicies.length === 1 ? 'Caso de renovación creado' : `${policyDialogPolicies.length} casos de renovación creados`)
      publishAppEvent({ type: 'records:changed', source: 'notification', entity: 'case', action: 'refresh' })
      setPolicyDialogOpen(false)
    } catch (error) {
      toast.error('No se pudieron crear los casos de seguimiento')
    } finally {
      setCreatingRenewalCases(false)
    }
  }

  const handleOpenNotification = async (notification: SystemNotification) => {
    if (isPolicyNotification(notification)) {
      await handleOpenPolicyNotification(notification)
      return
    }

    if (!notification.isRead) {
      await handleMarkAsRead(notification.uuid)
    }

    if (isCaseNotification(notification)) {
      handleNotificationMenuClose()
      publishAppEvent({ type: 'records:changed', source: 'notification', entity: 'case', action: 'refresh', uuid: notification.relatedEntityUuid })
      navigate(caseRoute(notification.relatedEntityUuid))
      return
    }

  }

  const openProfileDialog = (tab: 'profile' | 'security' | 'appearance' | 'notifications') => {
    handleMenuClose()
    setProfileActiveTab(tab)
    setProfileDialogOpen(true)
  }

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U'
  const unreadCount = notificationsData?.filter(n => !n.isRead).length || 0

  return (
    <Box
      component="header"
      className="sticky top-0 z-20 px-3 pt-3 sm:px-5"
      sx={{ pointerEvents: 'none' }}
    >
      <Container maxWidth="xl" disableGutters>
        <Stack
          direction="row"
          sx={{
            pointerEvents: 'auto',
            alignItems: 'center',
            gap: { xs: 1, sm: 2 },
            justifyContent: 'space-between',
            px: { xs: 1.25, sm: 2 },
            py: 1.1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 99,
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(12,27,42,0.88), rgba(16,40,61,0.72))'
              : 'linear-gradient(135deg, rgba(255,255,255,0.90), rgba(238,247,255,0.74))',
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 24px 70px rgba(0,0,0,0.46)'
              : '0 22px 60px rgba(7,89,133,0.14)',
            backdropFilter: 'blur(22px)',
          }}
        >
          <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} sx={{ alignItems: 'center', minWidth: 0, flexGrow: 1 }}>
            <Box
              sx={{
                display: 'grid',
                placeItems: 'center',
                width: { xs: 50, sm: 62 },
                height: { xs: 42, sm: 50 },
                borderRadius: 99,
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(125,211,252,0.18), rgba(94,234,212,0.12))'
                  : 'linear-gradient(135deg, rgba(224,242,254,0.98), rgba(207,250,254,0.72))',
                border: '1px solid',
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(125,211,252,0.28)' : 'rgba(7,89,133,0.16)',
                boxShadow: (theme) => theme.palette.mode === 'dark'
                  ? '0 10px 28px rgba(0, 0, 0, 0.28)'
                  : '0 12px 28px rgba(7, 89, 133, 0.14)',
                color: 'primary.main',
                flexShrink: 0,
              }}
            >
              <HimalayaLogo className="h-9 w-12 sm:h-11 sm:w-14" />
            </Box>
            <Box className="min-w-0" sx={{ mr: { xs: 0.5, sm: 1 } }}>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 950, fontSize: { xs: '1.05rem', sm: '1.32rem' }, lineHeight: 1.18 }} className="truncate">
                Seguros Himalaya
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.76rem', fontWeight: 750, lineHeight: 1.35, letterSpacing: 0 }} className="truncate">
                Aplicativo de manejo de seguros
              </Typography>
            </Box>
            <Tooltip title="Abrir mantenimientos">
              <IconButton
                aria-label="Abrir mantenimientos"
                onClick={() => setMaintenanceOpen(true)}
                size="small"
                className="shrink-0"
                sx={{ p: 0.9, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: '0 8px 18px rgba(15,23,42,0.08)' }}
              >
                <AppLauncherIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} sx={{ alignItems: 'center', flexShrink: 0 }}>
            
            {/* Notification Bell */}
            <Tooltip title="Notificaciones">
              <IconButton
                onClick={handleNotificationMenuOpen}
                size="small"
                className="shrink-0"
                sx={{ p: 0.9, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: '0 8px 18px rgba(15,23,42,0.08)' }}
              >
                <Badge badgeContent={unreadCount} color="error" max={99} variant="standard" sx={{ '& .MuiBadge-badge': { fontWeight: 800 } }}>
                  <Bell size={18} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Notification Menu Popover */}
            <Menu
              anchorEl={notificationAnchorEl}
              open={notificationMenuOpen}
              onClose={handleNotificationMenuClose}
              slotProps={{
                paper: {
                  elevation: 0,
                  sx: {
                    mt: 1.5,
                    borderRadius: 4,
                    minWidth: 380,
                    maxWidth: 440,
                    maxHeight: 550,
                    p: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(7, 17, 31, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: (theme) => theme.palette.mode === 'dark' 
                      ? '0 20px 60px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)' 
                      : '0 20px 60px -10px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, zIndex: 1, backdropFilter: 'blur(10px)' }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Notificaciones</Typography>
                  {notificationsData.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      {unreadCount > 0 && (
                        <Chip label={`${unreadCount} nuevas`} size="small" color="primary" sx={{ fontWeight: 800, height: 22 }} />
                      )}
                      <Button
                        size="small"
                        variant="text"
                        disabled={unreadCount === 0}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleMarkAllAsRead()
                        }}
                        sx={{ fontWeight: 750, textTransform: 'none', minWidth: 0, px: 1 }}
                      >
                        Marcar leídas
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Box>
              
              <Box sx={{ overflowY: 'auto', flex: 1, pb: 1 }}>
                {notificationsError ? (
                  <Box sx={{ p: 2.5 }}>
                    <Alert severity="error" sx={{ borderRadius: 2 }}>{notificationsError}</Alert>
                  </Box>
                ) : notificationsLoading && notificationsData.length === 0 ? (
                  <Box sx={{ p: 3 }}>
                    <Typography variant="body2" color="text.secondary">Cargando notificaciones...</Typography>
                  </Box>
                ) : notificationsData.length === 0 ? (
                  <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Box 
                      sx={{ 
                        width: 76, 
                        height: 76, 
                        borderRadius: '50%', 
                        bgcolor: 'action.hover',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        mb: 3,
                        boxShadow: (theme) => theme.palette.mode === 'dark' 
                          ? '0 0 20px rgba(255,255,255,0.02), inset 0 0 12px rgba(255,255,255,0.05)'
                          : '0 0 20px rgba(0,0,0,0.02), inset 0 0 12px rgba(0,0,0,0.02)',
                        border: '1px solid',
                        borderColor: 'divider',
                        position: 'relative'
                      }}
                    >
                      <Box sx={{
                        position: 'absolute',
                        width: 14,
                        height: 14,
                        bgcolor: 'success.main',
                        borderRadius: '50%',
                        bottom: 4,
                        right: 4,
                        border: '3px solid',
                        borderColor: (theme) => theme.palette.mode === 'dark' ? '#07111f' : 'white',
                      }} />
                      <Bell size={32} style={{ color: 'var(--himalaya-primary)' }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>Todo al día por aquí</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 260, lineHeight: 1.4 }}>
                      No tienes alertas pendientes en este momento. Te avisaremos cuando ocurra algo importante.
                    </Typography>
                  </Box>
                ) : (
                  notificationsData.map((notif: SystemNotification) => {
                    const config = getNotificationConfig(notif)
                    const IconComponent = config.icon
                    const canOpenNotification = isCaseNotification(notif) || isPolicyNotification(notif)
                    const notificationActionLabel = isPolicyNotification(notif) ? 'Ver pólizas' : 'Abrir caso'
                    return (
                      <Box 
                        key={notif.uuid} 
                        sx={{ 
                          p: 2.5, 
                          borderBottom: '1px solid', 
                          borderColor: 'divider', 
                          position: 'relative',
                          bgcolor: notif.isRead ? 'transparent' : (theme) => theme.palette.mode === 'dark' ? 'rgba(2, 132, 199, 0.04)' : 'rgba(2, 132, 199, 0.02)',
                          transition: 'all 0.25s',
                          borderLeft: notif.isRead ? '3px solid transparent' : '3px solid var(--himalaya-primary)',
                          cursor: canOpenNotification ? 'pointer' : 'default',
                          '&:hover': { 
                            bgcolor: 'action.hover',
                            '& .notif-action': { opacity: 1 }
                          }
                        }}
                        onClick={() => handleOpenNotification(notif)}
                      >
                        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                          <Box 
                            sx={{ 
                              width: 36, 
                              height: 36, 
                              borderRadius: '50%', 
                              bgcolor: config.bgSoft, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              flexShrink: 0,
                              color: config.color,
                              mt: 0.25
                            }}
                          >
                            <IconComponent size={18} />
                          </Box>
                          
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontWeight: 800, 
                                  color: config.color, 
                                  textTransform: 'uppercase',
                                  fontSize: '0.65rem',
                                  letterSpacing: '0.05em'
                                }}
                              >
                                {config.tag}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.disabled' }}>
                                {dayjs(notif.createdAt).fromNow()}
                              </Typography>
                            </Stack>
                            
                            <Typography variant="subtitle2" sx={{ fontWeight: notif.isRead ? 600 : 800, color: notif.isRead ? 'text.secondary' : 'text.primary', mb: 0.5, lineHeight: 1.3 }}>
                              {notif.title}
                            </Typography>
                            <Typography variant="body2" color={notif.isRead ? 'text.disabled' : 'text.secondary'} sx={{ lineHeight: 1.4, fontSize: '0.825rem' }}>
                              {notif.body}
                            </Typography>

                            {(canOpenNotification || !notif.isRead) && (
                              <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                {canOpenNotification && (
                                  <ButtonBase
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleOpenNotification(notif)
                                    }}
                                    sx={{
                                      fontSize: '0.72rem',
                                      fontWeight: 750,
                                      px: 1.5,
                                      py: 0.5,
                                      borderRadius: 1.5,
                                      bgcolor: 'primary.main',
                                      color: 'primary.contrastText',
                                      border: '1px solid',
                                      borderColor: 'primary.main',
                                      transition: 'all 0.2s',
                                      '&:hover': {
                                        bgcolor: 'primary.dark',
                                        transform: 'translateY(-1px)'
                                      }
                                    }}
                                  >
                                    {notificationActionLabel}
                                  </ButtonBase>
                                )}
                                {!notif.isRead && (
                                <ButtonBase 
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleMarkAsRead(notif.uuid)
                                  }}
                                  className="notif-action"
                                  sx={{ 
                                    fontSize: '0.72rem', 
                                    fontWeight: 750, 
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 1.5,
                                    bgcolor: 'transparent',
                                    color: 'primary.main',
                                    border: '1px solid',
                                    borderColor: 'primary.main',
                                    opacity: { xs: 1, md: 0.7 },
                                    transition: 'all 0.2s',
                                    '&:hover': { 
                                      bgcolor: 'primary.main',
                                      color: 'white',
                                      transform: 'translateY(-1px)'
                                    } 
                                  }}
                                >
                                  Marcar como leída
                                </ButtonBase>
                                )}
                              </Box>
                            )}
                          </Box>
                        </Stack>
                      </Box>
                    )
                  })
                )}
              </Box>
            </Menu>

            {/* Theme Toggle */}
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
                        borderRadius: 4,
                        minWidth: 320,
                        p: 0,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: (theme) => theme.palette.mode === 'dark' 
                          ? '0 10px 40px -10px rgba(0,0,0,0.5)' 
                          : '0 10px 40px -10px rgba(0,0,0,0.15)',
                        overflow: 'hidden',
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  {/* Rich Profile Header */}
                  <Box
                    sx={{
                      p: 3,
                      position: 'relative',
                      background: (theme) => theme.palette.mode === 'dark'
                        ? `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${(theme.palette as any).surfaceSoft || 'var(--himalaya-surfaceSoft)'} 100%)`
                        : `linear-gradient(135deg, ${(theme.palette as any).surfaceSoft || 'var(--himalaya-surfaceSoft)'} 0%, ${theme.palette.background.default} 100%)`,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1.5
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        width: 72, 
                        height: 72, 
                        bgcolor: 'primary.main', 
                        color: 'primary.contrastText',
                        fontSize: '1.75rem', 
                        fontWeight: 800,
                        border: '4px solid',
                        borderColor: 'background.paper',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                      }}
                    >
                      {initials}
                    </Avatar>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary' }}>
                        {user.firstName} {user.lastName}
                      </Typography>
                      {user.email && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
                          {user.email}
                        </Typography>
                      )}

                      <Box sx={{ mt: 1.5, px: 2, py: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'inline-block' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 0.25, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Instancia Actual
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 750, color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <Layers size={14} />
                          {activeNode?.nickname ?? 'Global'} <Box component="span" sx={{ color: 'text.secondary', mx: 0.5 }}>/</Box> {activeModule?.title ?? 'Plataforma'}
                        </Typography>
                      </Box>

                      <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                        {user.roles.map((r) => (
                          <Typography 
                            key={r}
                            variant="caption" 
                            sx={{ 
                              display: 'inline-block', 
                              px: 1.5, 
                              py: 0.5, 
                              borderRadius: 4, 
                              bgcolor: 'primary.main', 
                              color: 'primary.contrastText', 
                              fontWeight: 750, 
                              fontSize: '0.65rem', 
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}
                          >
                            {userRoleLabels[r] ?? r}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  </Box>

                  {/* Actions Area */}
                  <Box sx={{ p: 1 }}>
                    <MenuItem 
                      onClick={() => openProfileDialog('profile')} 
                      sx={{ 
                        py: 1.25, 
                        px: 2, 
                        borderRadius: 2, 
                        mb: 0.25,
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: 'text.primary',
                        transition: 'all 0.2s ease',
                        '&:hover': { bgcolor: 'action.hover', color: 'primary.main', '& .MuiListItemIcon-root': { color: 'primary.main' } }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: '36px !important', color: 'text.secondary', transition: 'all 0.2s ease' }}>
                        <UserIcon size={18} />
                      </ListItemIcon>
                      Mi Perfil
                    </MenuItem>

                    <MenuItem 
                      onClick={() => openProfileDialog('security')} 
                      sx={{ 
                        py: 1.25, 
                        px: 2, 
                        borderRadius: 2, 
                        mb: 0.25,
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: 'text.primary',
                        transition: 'all 0.2s ease',
                        '&:hover': { bgcolor: 'action.hover', color: 'primary.main', '& .MuiListItemIcon-root': { color: 'primary.main' } }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: '36px !important', color: 'text.secondary', transition: 'all 0.2s ease' }}>
                        <Shield size={18} />
                      </ListItemIcon>
                      Seguridad y Acceso
                    </MenuItem>

                    <MenuItem 
                      onClick={() => openProfileDialog('appearance')} 
                      sx={{ 
                        py: 1.25, 
                        px: 2, 
                        borderRadius: 2, 
                        mb: 0.5,
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: 'text.primary',
                        transition: 'all 0.2s ease',
                        '&:hover': { bgcolor: 'action.hover', color: 'primary.main', '& .MuiListItemIcon-root': { color: 'primary.main' } }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: '36px !important', color: 'text.secondary', transition: 'all 0.2s ease' }}>
                        <Palette size={18} />
                      </ListItemIcon>
                      Apariencia y Tema
                    </MenuItem>
                    
                    <Divider sx={{ my: 0.5 }} />
                    
                    <MenuItem 
                      onClick={handleLogout} 
                      sx={{ 
                        py: 1.25, 
                        px: 2, 
                        borderRadius: 2, 
                        mt: 0.5,
                        color: 'error.main', 
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        transition: 'all 0.2s ease',
                        '&:hover': { bgcolor: 'error.main', color: 'error.contrastText', '& .MuiListItemIcon-root': { color: 'error.contrastText' } }
                      }}
                    >
                      <ListItemIcon sx={{ color: 'error.main', minWidth: '36px !important', transition: 'all 0.2s ease' }}>
                        <LogOut size={18} />
                      </ListItemIcon>
                      Cerrar Sesión
                    </MenuItem>
                  </Box>
                </Menu>
              </>
            )}
          </Stack>
        </Stack>
      </Container>

      <Dialog
        open={policyDialogOpen}
        onClose={() => setPolicyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 850, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 850 }}>
              {policyDialogNotification?.title ?? 'Pólizas'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {policyDialogLoading ? 'Buscando pólizas relacionadas...' : `${policyDialogPolicies.length} póliza(s) encontradas`}
            </Typography>
          </Box>
          <IconButton onClick={() => setPolicyDialogOpen(false)} aria-label="Cerrar detalle de pólizas">
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'divider', p: 3 }}>
          {policyDialogPolicies.length === 0 && !policyDialogLoading ? (
            <Box sx={{ py: 6, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <FileText size={48} style={{ opacity: 0.3 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>No hay pólizas para mostrar</Typography>
                <Typography variant="body2" color="text.secondary">
                  La revisión ya pudo haber sido atendida o las pólizas ya no están en esta ventana.
                </Typography>
              </Box>
            </Box>
          ) : (
            <ResponsiveDataGrid
              rows={policyDialogPolicies}
              columns={policyDialogColumns}
              getRowId={(row) => row.uuid}
              loading={policyDialogLoading}
              paginationModel={policyDialogPaginationModel}
              onPaginationModelChange={setPolicyDialogPaginationModel}
              pageSizeOptions={[5, 10, 25]}
              localeText={esESGrid}
              height={430}
              mobileHeight={520}
              showToolbar={false}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setPolicyDialogOpen(false)} disabled={creatingRenewalCases} sx={{ color: 'text.secondary' }}>
            Cerrar
          </Button>
          <Button
            variant="contained"
            startIcon={creatingRenewalCases ? <CircularProgress size={16} color="inherit" /> : <Plus size={18} />}
            onClick={handleCreateRenewalFollowUpCases}
            disabled={policyDialogLoading || creatingRenewalCases || policyDialogPolicies.length === 0}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            {policyDialogPolicies.length <= 1 ? 'Crear caso de seguimiento' : 'Crear casos de seguimiento'}
          </Button>
        </DialogActions>
      </Dialog>

      <MaintenanceDrawer
        mode={mode}
        open={maintenanceOpen}
        onClose={() => setMaintenanceOpen(false)}
      />

      <UserProfileDialog 
        open={profileDialogOpen} 
        onClose={() => setProfileDialogOpen(false)} 
        initialTab={profileActiveTab} 
        mode={mode} 
        onToggleMode={onToggleMode} 
      />
    </Box>
  )
}
