import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Autocomplete, Avatar, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControlLabel, IconButton, Menu, MenuItem, Skeleton, Stack, Tab, Tabs, TextField, Typography, InputAdornment, Tooltip, alpha } from '@mui/material'
import type { GridColDef, GridRowSelectionModel } from '@mui/x-data-grid'
import { ClipboardCheck, Clock, Edit2, MessageSquare, MoreVertical, Trash2, X, Eye, EyeOff, Send, Play, CheckCircle, RotateCcw, User, ShieldCheck, FileText, Mail, Phone, Calendar, AlertCircle } from 'lucide-react'
import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams } from 'react-router'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import dayjs from 'dayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { addCommentApi, createCase, fetchCaseDetail, fetchCases, fetchClients, fetchPolicies, fetchUsers, fetchTags, removeCase, updateCase, verifySupervisorAuthorizationApi } from '../../api/maintenanceApi'
import type { CaseDetail, CaseRaw, ClientRaw, PolicyRaw, UserRaw, TagRaw } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { ResponsiveDataGrid } from '../../components/ResponsiveDataGrid'
import { usePermission, usePermissionLoading } from '../../hooks/usePermission'
import { useAuthStore } from '../../store/useAuthStore'
import { casePriorityLabels, caseStatusLabels, caseTypeLabels, policyStatusLabels, esESGrid, t } from '../../utils/enumLabels'
import { MaintenanceSkeleton } from '../../components/MaintenanceSkeleton'
import { MaintenanceFab } from '../../components/MaintenanceFab'
import { subscribeAppEvent } from '../../utils/appEvents'
import { createEmptyGridSelectionModel, getSelectedGridIds } from '../../utils/gridSelection'
import { ResponsiveSelect } from '../../components/ResponsiveSelect'
import { ResponsiveAutocomplete } from '../../components/ResponsiveAutocomplete'

/** Sanitize backend errors for user display */
function friendlyError(err: any, fallback = 'Ocurrió un error inesperado.'): string {
  const msg = typeof err?.message === 'string' ? err.message : ''
  if (
    msg.includes('violates') ||
    msg.includes('constraint') ||
    msg.includes('duplicate key') ||
    msg.includes('relation') ||
    msg.includes('column') ||
    msg.includes('syntax') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('Internal server') ||
    msg.includes('Cannot return null')
  ) {
    return 'Error del servidor. Intente de nuevo o contacte al administrador.'
  }
  if (msg.length > 0 && msg.length < 150) return msg
  return fallback
}

const auditActionLabels: Record<string, string> = {
  Create: 'Creado', Update: 'Actualizado', Delete: 'Eliminado',
  StatusChange: 'Cambio de Estado', Comment: 'Comentario añadido',
  Assign: 'Asignado', Login: 'Inicio de sesión', Logout: 'Cierre de sesión', Restore: 'Restaurado',
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    create: 'Creado',
    update: 'Actualizado',
    delete: 'Eliminado',
    status_change: 'Cambio de estado',
    comment: 'Comentario agregado',
    assign: 'Asignado',
    login: 'Inicio de sesion',
    logout: 'Cierre de sesion',
    restore: 'Restaurado',
  }
  return labels[action] ?? auditActionLabels[action] ?? action
}

function normalizeCaseInput(data: CaseFormData) {
  return {
    ...data,
    description: data.description?.trim() || undefined,
    dueAt: data.dueAt || undefined,
    policyId: data.policyId || undefined,
    assignedUserId: data.assignedUserId || undefined,
    tagUuids: data.tagUuids ?? [],
  }
}

function withSelectedOption<T extends { uuid: string }>(
  options: T[] | null | undefined,
  selected: T | null | undefined,
) {
  const nextOptions = [...(options ?? [])]
  if (selected && !nextOptions.some((option) => option.uuid === selected.uuid)) {
    nextOptions.unshift(selected)
  }
  return nextOptions
}

function isSupervisorUser(user: UserRaw) {
  const privilegedRoles = ['manager', 'supervisor', 'administrator', 'owner']
  return user.roles.some((role) => privilegedRoles.includes(role.toLowerCase()))
}

function StatusChip({ status }: { status: string }) {
  const color: Record<string, { bgcolor: string; color: string }> = {
    Pending: { bgcolor: 'warning.main', color: 'warning.contrastText' },
    pending: { bgcolor: 'warning.main', color: 'warning.contrastText' },
    InProgress: { bgcolor: 'info.main', color: 'info.contrastText' },
    in_progress: { bgcolor: 'info.main', color: 'info.contrastText' },
    Closed: { bgcolor: 'success.main', color: 'success.contrastText' },
    closed: { bgcolor: 'success.main', color: 'success.contrastText' },
    Cancelled: { bgcolor: 'error.main', color: 'error.contrastText' },
    cancelled: { bgcolor: 'error.main', color: 'error.contrastText' },
    WaitingForClient: { bgcolor: 'warning.light', color: 'warning.contrastText' },
    waiting_for_client: { bgcolor: 'warning.light', color: 'warning.contrastText' },
    WaitingForProvider: { bgcolor: 'warning.dark', color: 'warning.contrastText' },
    waiting_for_provider: { bgcolor: 'warning.dark', color: 'warning.contrastText' },
  }
  const c = color[status] ?? { bgcolor: 'action.disabledBackground', color: 'text.secondary' }
  return <Chip label={t(caseStatusLabels, status)} size="small" sx={{ fontWeight: 600, ...c }} />
}

function PriorityChip({ priority }: { priority: string }) {
  const color: Record<string, { bgcolor: string; color: string }> = {
    Urgent: { bgcolor: 'error.main', color: 'error.contrastText' },
    urgent: { bgcolor: 'error.main', color: 'error.contrastText' },
    High: { bgcolor: 'warning.main', color: 'warning.contrastText' },
    high: { bgcolor: 'warning.main', color: 'warning.contrastText' },
    Medium: { bgcolor: 'info.main', color: 'info.contrastText' },
    medium: { bgcolor: 'info.main', color: 'info.contrastText' },
    Low: { bgcolor: 'action.disabledBackground', color: 'text.secondary' },
    low: { bgcolor: 'action.disabledBackground', color: 'text.secondary' },
  }
  const c = color[priority] ?? { bgcolor: 'action.disabledBackground', color: 'text.secondary' }
  return <Chip label={t(casePriorityLabels, priority)} size="small" sx={{ fontWeight: 600, ...c }} />
}

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (val === '' ? undefined : val), schema) as z.ZodType<z.infer<T> | undefined, any, any>

const caseSchema = z.object({
  title: z.string().min(2, 'El título es requerido'),
  description: emptyToUndefined(z.string().optional()),
  status: z.enum(['Pending', 'InProgress', 'WaitingForClient', 'WaitingForProvider', 'Closed', 'Cancelled']),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  type: z.enum(['Claim', 'Renewal', 'Endorsement', 'Payment', 'Documentation', 'GeneralSupport']),
  dueAt: emptyToUndefined(z.string().optional()),
  clientId: z.string().min(1, 'Selecciona un cliente'),
  policyId: emptyToUndefined(z.string().optional()),
  assignedUserId: emptyToUndefined(z.string().optional()),
  tagUuids: z.array(z.string()),
})

type CaseFormData = z.infer<typeof caseSchema>

// ─── Case Detail Drawer ─────────────────────────────────

type CaseDetailDrawerProps = {
  caseUuid: string | null
  open: boolean
  onClose: () => void
  onEdit: (c: CaseDetail) => void
  onDelete: (c: CaseDetail) => void
  onRefresh: () => void
  clients?: ClientRaw[] | null
  policies?: PolicyRaw[] | null
  users?: UserRaw[] | null
  tags?: TagRaw[] | null
}

function CaseDetailDrawer({ caseUuid, open, onClose, onEdit, onDelete, onRefresh, clients, policies, users, tags }: CaseDetailDrawerProps) {
  const [tab, setTab] = useState(0)
  const [newCommentBody, setNewCommentBody] = useState('')
  const [newCommentInternal, setNewCommentInternal] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const canEditCase = usePermission('edit_case')
  const canDeleteCase = usePermission('delete_case')

  const { user } = useAuthStore()
  const hasSupervisorPrivileges = useMemo(() => {
    if (!user) return false
    const privilegedRoles = ['manager', 'supervisor', 'administrator', 'owner']
    return user.roles.some((role) => privilegedRoles.includes(role.toLowerCase()))
  }, [user])

  // Closing case states
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [supervisorEmail, setSupervisorEmail] = useState('')
  const [supervisorPassword, setSupervisorPassword] = useState('')
  const [showSupervisorPassword, setShowSupervisorPassword] = useState(false)
  const [isSubmittingClose, setIsSubmittingClose] = useState(false)

  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  
  const { data: detail, loading, refetch } = useApiQuery(
    caseUuid ? `case-${caseUuid}` : '__none__',
    () => (caseUuid ? fetchCaseDetail(caseUuid) : Promise.resolve(null as unknown as CaseDetail)),
  )

  const fullPolicy = useMemo(() => {
    if (!detail?.policy) return null
    return policies?.find(p => p.uuid === detail.policy?.uuid) || null
  }, [detail, policies])

  useEffect(() => {
    if (caseUuid) {
      setTab(0)
    }
  }, [caseUuid])

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseUuid || !newCommentBody.trim()) return
    setIsSubmittingComment(true)
    try {
      await addCommentApi(caseUuid, newCommentBody, newCommentInternal)
      toast.success('Comentario añadido')
      setNewCommentBody('')
      setNewCommentInternal(false)
      refetch()
    } catch (err: any) {
      toast.error(friendlyError(err, 'Error al añadir comentario'))
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleCloseCaseSubmit = async () => {
    if (!caseUuid || !closeReason.trim()) return
    if (!hasSupervisorPrivileges && (!supervisorEmail || !supervisorPassword)) return
    setIsSubmittingClose(true)
    try {
      if (!hasSupervisorPrivileges) {
        await verifySupervisorAuthorizationApi(supervisorEmail, supervisorPassword)
      }
      await addCommentApi(caseUuid, `Razón de cierre: ${closeReason}`, false)
      await updateCase({ uuid: caseUuid, status: 'Closed' })
      toast.success('Caso cerrado exitosamente')
      setCloseReason('')
      setSupervisorEmail('')
      setSupervisorPassword('')
      setCloseDialogOpen(false)
      refetch()
      onRefresh()
    } catch (err: any) {
      toast.error(friendlyError(err, 'No se pudo autorizar la accion.'))
    } finally {
      setIsSubmittingClose(false)
    }
  }

  const [isActivating, setIsActivating] = useState(false)
  const supervisorUsers = (users ?? []).filter(isSupervisorUser)

  const handleActivateCaseClick = async () => {
    if (!caseUuid) return
    setIsActivating(true)
    try {
      await updateCase({ uuid: caseUuid, status: 'InProgress' })
      toast.success('Caso activado / reabierto')
      refetch()
      onRefresh()
    } catch (err: any) {
      toast.error(friendlyError(err, 'Error al activar el caso'))
    } finally {
      setIsActivating(false)
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100vw', sm: 560 },
            bgcolor: 'background.default',
            borderLeft: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }
      }}
    >
      {/* Header */}
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', p: 3, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ flex: 1, mr: 2 }}>
          {loading ? (
            <>
              <Skeleton variant="text" width={120} height={20} />
              <Skeleton variant="text" width={240} height={32} />
            </>
          ) : (
            <>
              <Typography variant="caption" data-case-number={detail?.caseNumber} sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 1 }}>
                {detail?.caseNumber}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                {detail?.title}
              </Typography>
            </>
          )}
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ mt: -0.5, alignItems: 'center' }}>
          {detail && (
            <>
              {(detail.status === 'InProgress' || detail.status === 'WaitingForClient' || detail.status === 'WaitingForProvider') && (
                <Tooltip title="Cerrar y archivar este caso de soporte" arrow>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => setCloseDialogOpen(true)}
                    startIcon={<CheckCircle size={14} />}
                    sx={{ mr: 1, textTransform: 'none', fontWeight: 600, height: 28 }}
                  >
                    Cerrar Caso
                  </Button>
                </Tooltip>
              )}
              {detail.status === 'Pending' && (
                <Tooltip title="Iniciar la atención del caso y cambiar estado a 'En proceso'" arrow>
                  <Button
                    variant="outlined"
                    color="success"
                    size="small"
                    disabled={isActivating}
                    onClick={handleActivateCaseClick}
                    startIcon={isActivating ? <CircularProgress size={14} color="inherit" /> : <Play size={14} />}
                    sx={{ mr: 1, textTransform: 'none', fontWeight: 600, height: 28 }}
                  >
                    {isActivating ? 'Abriendo…' : 'Iniciar Atención'}
                  </Button>
                </Tooltip>
              )}
              {(detail.status === 'Closed' || detail.status === 'Cancelled') && (
                <Tooltip title="Reabrir este caso para continuar la gestión" arrow>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    disabled={isActivating}
                    onClick={handleActivateCaseClick}
                    startIcon={isActivating ? <CircularProgress size={14} color="inherit" /> : <RotateCcw size={14} />}
                    sx={{ mr: 1, textTransform: 'none', fontWeight: 600, height: 28 }}
                  >
                    {isActivating ? 'Activando…' : 'Reabrir Caso'}
                  </Button>
                </Tooltip>
              )}
              {canEditCase && (
                <Tooltip title="Editar detalles del caso" arrow>
                  <IconButton onClick={() => onEdit(detail)} size="small" sx={{ color: 'text.secondary', mr: 0.5 }}>
                    <Edit2 size={18} />
                  </IconButton>
                </Tooltip>
              )}
              {canDeleteCase && (
                <Tooltip title="Eliminar caso permanentemente" arrow>
                  <IconButton onClick={() => onDelete(detail)} size="small" sx={{ color: 'error.main', mr: 0.5 }}>
                    <Trash2 size={18} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
          <Tooltip title="Cerrar panel de detalles" arrow>
            <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
              <X size={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Status chips row */}
      {detail && (
        <Stack direction="row" spacing={1} sx={{ px: 3, py: 1.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0, flexWrap: 'wrap', gap: 1 }}>
          <StatusChip status={detail.status} />
          <PriorityChip priority={detail.priority} />
          <Chip label={t(caseTypeLabels, detail.type)} size="small" sx={{ bgcolor: 'action.hover', color: 'text.primary' }} />
          {detail.tags.map((tag) => (
            <Chip key={tag.uuid} label={tag.name} size="small" sx={{ bgcolor: tag.color, color: '#fff', fontWeight: 600 }} />
          ))}
        </Stack>
      )}

      {/* Tabs */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 44 }}>
          <Tab label="Detalles" sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }} />
          <Tab label={`Comentarios ${detail ? `(${detail.comments.length})` : ''}`} sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }} icon={<MessageSquare size={14} />} iconPosition="start" />
          <Tab label="Historial" sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }} icon={<Clock size={14} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {loading && !detail ? (
          <Stack spacing={2}>
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="text" height={28} />)}
          </Stack>
        ) : detail ? (
          <>
            {/* Tab 0 – Details */}
            {tab === 0 && (
              <Stack spacing={3}>
                {detail.description && (
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 3.5,
                      border: '1px solid',
                      borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 30, 40, 0.4)' : 'rgba(255, 255, 255, 0.75)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    }}
                  >
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.5 }}>
                      <Box sx={{ p: 0.75, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12), borderRadius: 1.5, color: 'primary.main', display: 'flex' }}>
                        <FileText size={16} />
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Descripción del Caso
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'text.primary', pl: 0.5, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 13.5 }}>
                      {detail.description}
                    </Typography>
                  </Box>
                )}

                <Stack direction="column" spacing={2.5}>
                  {/* Cliente Card */}
                  <Box
                    sx={{
                      flex: 1,
                      p: 2.5,
                      borderRadius: 3.5,
                      border: '1px solid',
                      borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 30, 40, 0.4)' : 'rgba(255, 255, 255, 0.75)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
                        <Box sx={{ p: 0.75, bgcolor: (theme) => alpha(theme.palette.success.main, 0.12), borderRadius: 1.5, color: 'success.main', display: 'flex' }}>
                          <User size={16} />
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                          Cliente
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: 'success.main', fontSize: 15, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                          {detail.client.displayName[0]?.toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {detail.client.displayName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                            Cliente Asegurado
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                    <Stack spacing={1} sx={{ mt: 'auto', pt: 1, borderTop: '1px solid', borderColor: 'divider', minWidth: 0 }}>
                      {detail.client.email && (
                        <Tooltip title="Enviar correo electrónico" arrow>
                          <Button
                            variant="text"
                            size="small"
                            component="a"
                            href={`mailto:${detail.client.email}`}
                            startIcon={<Mail size={14} />}
                            sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'text.secondary', py: 0.5, fontSize: 12, '&:hover': { color: 'primary.main' }, minWidth: 0, width: '100%' }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', width: '100%', textAlign: 'left' }}>
                              {detail.client.email}
                            </span>
                          </Button>
                        </Tooltip>
                      )}
                      {detail.client.phone && (
                        <Tooltip title="Llamar al cliente" arrow>
                          <Button
                            variant="text"
                            size="small"
                            component="a"
                            href={`tel:${detail.client.phone}`}
                            startIcon={<Phone size={14} />}
                            sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'text.secondary', py: 0.5, fontSize: 12, '&:hover': { color: 'primary.main' }, minWidth: 0, width: '100%' }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', width: '100%', textAlign: 'left' }}>
                              {detail.client.phone}
                            </span>
                          </Button>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>

                  {/* Responsable Card */}
                  <Box
                    sx={{
                      flex: 1,
                      p: 2.5,
                      borderRadius: 3.5,
                      border: '1px solid',
                      borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 30, 40, 0.4)' : 'rgba(255, 255, 255, 0.75)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
                        <Box sx={{ p: 0.75, bgcolor: (theme) => alpha(theme.palette.warning.main, 0.12), borderRadius: 1.5, color: 'warning.main', display: 'flex' }}>
                          <ShieldCheck size={16} />
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                          Responsable
                        </Typography>
                      </Stack>
                      {detail.assignedUser ? (
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                          <Avatar sx={{ width: 40, height: 40, bgcolor: 'warning.main', fontSize: 15, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                            {initials(detail.assignedUser.firstName, detail.assignedUser.lastName)}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {detail.assignedUser.firstName} {detail.assignedUser.lastName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                              Agente Asignado
                            </Typography>
                          </Box>
                        </Stack>
                      ) : (
                        <Box sx={{ py: 1.5, textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                            Sin asignar
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    {detail.assignedUser && (
                      <Stack spacing={1} sx={{ mt: 'auto', pt: 1, borderTop: '1px solid', borderColor: 'divider', minWidth: 0 }}>
                        <Tooltip title="Contactar responsable" arrow>
                          <Button
                            variant="text"
                            size="small"
                            component="a"
                            href={`mailto:${detail.assignedUser.email}`}
                            startIcon={<Mail size={14} />}
                            sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'text.secondary', py: 0.5, fontSize: 12, '&:hover': { color: 'primary.main' }, minWidth: 0, width: '100%' }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', width: '100%', textAlign: 'left' }}>
                              {detail.assignedUser.email}
                            </span>
                          </Button>
                        </Tooltip>
                      </Stack>
                    )}
                  </Box>
                </Stack>

                {/* Póliza Card */}
                {detail.policy ? (
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 3.5,
                      border: '1px solid',
                      borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 30, 40, 0.4)' : 'rgba(255, 255, 255, 0.75)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                      <Box sx={{ p: 1.25, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12), borderRadius: 2.5, color: 'primary.main', display: 'flex' }}>
                        <ClipboardCheck size={20} />
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
                          Póliza Asociada
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.25 }}>
                          {detail.policy.policyNumber}
                        </Typography>
                      </Box>
                    </Stack>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setPolicyDialogOpen(true)}
                      startIcon={<Eye size={14} />}
                      sx={{
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 2.5,
                        py: 1,
                        fontSize: 12.5,
                        boxShadow: '0 4px 10px rgba(7, 89, 133, 0.15)',
                      }}
                    >
                      Ver Póliza
                    </Button>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 3.5,
                      border: '1px dashed',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1.5,
                    }}
                  >
                    <AlertCircle size={18} style={{ opacity: 0.5 }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      Este caso no tiene una póliza asociada.
                    </Typography>
                  </Box>
                )}

                {/* Timeline info row */}
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3.5,
                    border: '1px solid',
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 30, 40, 0.4)' : 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  }}
                >
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2.5 }}>
                    <Box sx={{ p: 0.75, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08), borderRadius: 1.5, color: 'text.primary', display: 'flex' }}>
                      <Calendar size={16} />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Línea de Tiempo del Caso
                    </Typography>
                  </Stack>
                  <Stack spacing={1.75}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>Creado</Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 700 }}>{formatDate(detail.createdAt)}</Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>Última actualización</Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 700 }}>{formatDate(detail.updatedAt)}</Typography>
                    </Stack>
                    {detail.dueAt && (
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>Fecha límite</Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: new Date(detail.dueAt) < new Date() && (detail.status !== 'Closed' && detail.status !== 'closed') ? 'error.main' : 'text.primary',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          {formatDate(detail.dueAt)}
                          {new Date(detail.dueAt) < new Date() && (detail.status !== 'Closed' && detail.status !== 'closed') && (
                            <Chip label="Vencido" size="small" color="error" sx={{ height: 16, fontSize: 9, fontWeight: 800 }} />
                          )}
                        </Typography>
                      </Stack>
                    )}
                    {detail.closedAt && (
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>Fecha de cierre</Typography>
                        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>{formatDate(detail.closedAt)}</Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              </Stack>
            )}

            {/* Tab 1 – Comments */}
            {tab === 1 && (
              <Stack spacing={3.5}>
                {/* Composer card */}
                <Box
                  component="form"
                  onSubmit={handleCommentSubmit}
                  noValidate
                  sx={{
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3.5,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease-in-out',
                    '&:focus-within': {
                      borderColor: newCommentInternal ? 'warning.main' : 'primary.main',
                      boxShadow: newCommentInternal ? '0 4px 16px rgba(217, 119, 6, 0.08)' : '0 4px 16px rgba(7, 89, 133, 0.08)'
                    }
                  }}
                >
                  <TextField
                    placeholder="Escribe un comentario o nota sobre este caso..."
                    multiline
                    rows={3}
                    value={newCommentBody}
                    onChange={(e) => setNewCommentBody(e.target.value)}
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        p: 2,
                        '& fieldset': { border: 'none' },
                        '&:hover fieldset': { border: 'none' },
                        '&.Mui-focused fieldset': { border: 'none' }
                      }
                    }}
                  />
                  <Divider />
                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      px: 2,
                      py: 1.25,
                      bgcolor: (theme) => alpha(theme.palette.text.primary, 0.01)
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newCommentInternal}
                          onChange={(e) => setNewCommentInternal(e.target.checked)}
                          size="small"
                          sx={{
                            color: 'warning.main',
                            '&.Mui-checked': {
                              color: 'warning.main'
                            }
                          }}
                        />
                      }
                      label={
                        <Typography variant="caption" sx={{ fontWeight: 600, color: newCommentInternal ? 'warning.main' : 'text.secondary' }}>
                          Nota interna (Privado)
                        </Typography>
                      }
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isSubmittingComment || !newCommentBody.trim()}
                      startIcon={isSubmittingComment ? <CircularProgress size={14} color="inherit" /> : <Send size={13} />}
                      sx={{
                        borderRadius: 2,
                        px: 3,
                        py: 0.75,
                        fontSize: 13,
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: newCommentInternal ? 'warning.main' : 'primary.main',
                        '&:hover': {
                          bgcolor: newCommentInternal ? 'warning.dark' : 'primary.dark'
                        }
                      }}
                    >
                      {isSubmittingComment ? 'Guardando…' : 'Comentar'}
                    </Button>
                  </Stack>
                </Box>

                {/* Timeline thread list */}
                <Stack spacing={3} sx={{ position: 'relative', pl: 1 }}>
                  {detail.comments.length > 1 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 14,
                        top: 24,
                        bottom: 24,
                        width: 2,
                        bgcolor: 'divider',
                        zIndex: 0
                      }}
                    />
                  )}
                  {detail.comments.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <MessageSquare size={40} style={{ opacity: 0.3, margin: '0 auto' }} strokeWidth={1} />
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>Sin comentarios todavía.</Typography>
                    </Box>
                  ) : (
                    <AnimatePresence initial={false}>
                      {[...detail.comments]
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((comment) => {
                          const isInternal = comment.internalOnly;
                          return (
                            <motion.div
                              key={comment.uuid}
                              initial={{ opacity: 0, y: 15, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -15, scale: 0.98 }}
                              transition={{ duration: 0.25, ease: 'easeOut' }}
                              style={{ width: '100%' }}
                            >
                              <Stack
                                direction="row"
                                spacing={2}
                                sx={{ position: 'relative', zIndex: 1, alignItems: 'flex-start' }}
                              >
                                <Avatar
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    bgcolor: isInternal ? 'warning.main' : 'primary.main',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                    mt: 0.5,
                                    border: '2px solid',
                                    borderColor: 'background.paper',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  {initials(comment.author.firstName, comment.author.lastName)}
                                </Avatar>
                                <Box
                                  sx={{
                                    flexGrow: 1,
                                    bgcolor: isInternal ? (theme) => alpha(theme.palette.warning.main, 0.05) : 'background.paper',
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: isInternal ? (theme) => alpha(theme.palette.warning.main, 0.3) : 'divider',
                                    p: 2,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                      boxShadow: '0 3px 10px rgba(0,0,0,0.02)',
                                      borderColor: isInternal ? 'warning.main' : 'primary.main'
                                    }
                                  }}
                                >
                                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: 13.5 }}>
                                        {comment.author.firstName} {comment.author.lastName}
                                      </Typography>
                                      {isInternal && (
                                        <Chip
                                          label="Nota Interna"
                                          size="small"
                                          sx={{
                                            height: 18,
                                            fontSize: 9,
                                            bgcolor: (theme) => alpha(theme.palette.warning.main, 0.12),
                                            color: 'warning.main',
                                            border: '1px solid',
                                            borderColor: (theme) => alpha(theme.palette.warning.main, 0.25),
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5
                                          }}
                                        />
                                      )}
                                    </Stack>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                                      {formatDate(comment.createdAt)}
                                    </Typography>
                                  </Stack>
                                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontSize: 13 }}>
                                    {comment.body}
                                  </Typography>
                                </Box>
                              </Stack>
                            </motion.div>
                          )
                        })}
                    </AnimatePresence>
                  )}
                </Stack>
              </Stack>
            )}

            {/* Tab 2 – Audit history */}
            {tab === 2 && (() => {
              const renderAuditDiff = (beforeStr: string | null | undefined, afterStr: string | null | undefined) => {
                if (!beforeStr && !afterStr) return null

                let beforeObj: Record<string, any> = {}
                let afterObj: Record<string, any> = {}

                try {
                  if (beforeStr) {
                    beforeObj = typeof beforeStr === 'string' ? JSON.parse(beforeStr) : beforeStr
                  }
                  if (afterStr) {
                    afterObj = typeof afterStr === 'string' ? JSON.parse(afterStr) : afterStr
                  }
                } catch (e) {
                  return (
                    <Box sx={{ mt: 0.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      {beforeStr && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Antes: {beforeStr}
                        </Typography>
                      )}
                      {afterStr && (
                        <Typography variant="caption" sx={{ color: 'text.primary', display: 'block' }}>
                          Después: {afterStr}
                        </Typography>
                      )}
                    </Box>
                  )
                }

                const fieldLabels: Record<string, string> = {
                  title: 'Título',
                  description: 'Descripción',
                  status: 'Estado',
                  priority: 'Prioridad',
                  type: 'Tipo',
                  dueAt: 'Fecha Límite',
                  clientUuid: 'Cliente',
                  client: 'Cliente',
                  policyUuid: 'Póliza',
                  policy: 'Póliza',
                  assignedUserUuid: 'Responsable Asignado',
                  assignedUser: 'Responsable Asignado',
                  tagUuids: 'Etiquetas',
                  tags: 'Etiquetas',
                  closedAt: 'Fecha de Cierre',
                  createdAt: 'Fecha de Creación',
                  deletedAt: 'Fecha de Eliminación',
                  caseNumber: 'Número de Caso',
                  version: 'Versión',
                }

                const renderDiffValue = (key: string, val: any) => {
                  if (val === null || val === undefined || val === '') return <Typography variant="body2" sx={{ color: 'text.secondary' }}>—</Typography>
                  
                  if (key === 'status') {
                    return <StatusChip status={val} />
                  }
                  if (key === 'priority') {
                    return <PriorityChip priority={val} />
                  }
                  if (key === 'type') {
                    return <Chip label={t(caseTypeLabels, val)} size="small" sx={{ bgcolor: 'action.hover', color: 'text.primary' }} />
                  }
                  if (key === 'dueAt' || key === 'closedAt') {
                    return <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(val)}</Typography>
                  }
                  if (key === 'clientUuid' || key === 'client') {
                    let displayName = 'Cliente Desconocido'
                    if (typeof val === 'object' && val !== null && 'displayName' in val) {
                      displayName = val.displayName
                    } else {
                      const c = (clients ?? []).find((item) => item.uuid === val)
                      if (c) displayName = c.displayName
                    }
                    return (
                      <Chip
                        avatar={<Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: '10px' }}>{displayName[0]?.toUpperCase()}</Avatar>}
                        label={displayName}
                        size="small"
                        variant="outlined"
                      />
                    )
                  }
                  if (key === 'policyUuid' || key === 'policy') {
                    let policyNumber = 'Póliza Desconocida'
                    if (typeof val === 'object' && val !== null && 'policyNumber' in val) {
                      policyNumber = val.policyNumber
                    } else {
                      const p = (policies ?? []).find((item) => item.uuid === val)
                      if (p) policyNumber = p.policyNumber
                    }
                    return (
                      <Chip
                        label={policyNumber}
                        size="small"
                        variant="outlined"
                        color="secondary"
                      />
                    )
                  }
                  if (key === 'assignedUserUuid' || key === 'assignedUser') {
                    let fullName = 'No Asignado'
                    let initialsStr = '?'
                    if (typeof val === 'object' && val !== null && 'firstName' in val) {
                      fullName = `${val.firstName} ${val.lastName}`
                      initialsStr = `${val.firstName?.[0] ?? ''}${val.lastName?.[0] ?? ''}`.toUpperCase()
                    } else {
                      const u = (users ?? []).find((item) => item.uuid === val)
                      if (u) {
                        fullName = `${u.firstName} ${u.lastName}`
                        initialsStr = `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase()
                      }
                    }
                    return (
                      <Chip
                        avatar={<Avatar sx={{ bgcolor: 'info.main', color: 'info.contrastText', fontSize: '10px' }}>{initialsStr}</Avatar>}
                        label={fullName}
                        size="small"
                        variant="outlined"
                      />
                    )
                  }
                  if (key === 'tagUuids' || key === 'tags') {
                    const tagArray = Array.isArray(val) ? val : []
                    if (tagArray.length === 0) return <Typography variant="body2" sx={{ color: 'text.secondary' }}>—</Typography>
                    return (
                      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {tagArray.map((item, idx) => {
                          let name = String(item)
                          let colorStr = '#075985'
                          if (typeof item === 'object' && item !== null && 'name' in item) {
                            name = item.name
                            colorStr = item.color || colorStr
                          } else {
                            const tag = (tags ?? []).find((t) => t.uuid === item)
                            if (tag) {
                              name = tag.name
                              colorStr = tag.color
                            }
                          }
                          return (
                            <Chip
                              key={idx}
                              label={name}
                              size="small"
                              sx={{ bgcolor: colorStr, color: '#fff', fontWeight: 600, fontSize: '0.7rem', height: 20 }}
                            />
                          )
                        })}
                      </Stack>
                    )
                  }
                  return <Typography variant="body2" sx={{ fontWeight: 600 }}>{String(val)}</Typography>
                }

                const keys = Object.keys(afterObj).filter((k) => {
                  if (k === 'uuid' || k === 'updatedAt' || k === 'createdAt' || k === 'deletedAt' || k === 'version') return false
                  const beforeVal = beforeObj[k]
                  const afterVal = afterObj[k]
                  const hasBefore = beforeVal !== null && beforeVal !== undefined && beforeVal !== ''
                  const hasAfter = afterVal !== null && afterVal !== undefined && afterVal !== ''
                  if (Array.isArray(beforeVal) && beforeVal.length === 0 && !hasAfter) return false
                  if (Array.isArray(afterVal) && afterVal.length === 0 && !hasBefore) return false
                  return hasBefore || hasAfter
                })

                if (keys.length === 0) return null

                return (
                  <Stack spacing={2} sx={{ mt: 1.5, p: 2, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    {keys.map((key) => {
                      const label = fieldLabels[key] ?? key
                      const isLongField = ['description', 'title', 'tags', 'tagUuids', 'client', 'clientUuid', 'assignedUser', 'assignedUserUuid', 'policy', 'policyUuid'].includes(key)
                      return (
                        <Box
                          key={key}
                          sx={{
                            display: 'flex',
                            flexDirection: isLongField ? 'column' : 'row',
                            alignItems: isLongField ? 'flex-start' : 'center',
                            justifyContent: 'space-between',
                            py: 1.5,
                            gap: 1.5,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 'none' }
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {label}
                          </Typography>
                          <Stack
                            direction="row"
                            sx={{
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              width: '100%',
                              justifyContent: isLongField ? 'flex-start' : 'flex-end',
                              gap: 1.5
                            }}
                          >
                            {beforeStr && beforeObj[key] !== undefined && beforeObj[key] !== null && beforeObj[key] !== '' && (
                              <>
                                <Box sx={{ opacity: 0.6 }}>
                                  {renderDiffValue(key, beforeObj[key])}
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 700 }}>
                                  →
                                </Typography>
                              </>
                            )}
                            <Box>
                              {renderDiffValue(key, afterObj[key])}
                            </Box>
                          </Stack>
                        </Box>
                      )
                    })}
                  </Stack>
                )
              }

              return (
                <Stack spacing={0}>
                  {detail.auditLogs.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Clock size={40} style={{ opacity: 0.3, margin: '0 auto' }} strokeWidth={1} />
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>Sin historial de cambios.</Typography>
                    </Box>
                  ) : (
                    (() => {
                      const sortedLogs = [...detail.auditLogs].sort(
                        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )
                      return sortedLogs.map((log, idx) => (
                        <Box key={log.uuid} sx={{ display: 'flex', gap: 2 }}>
                          {/* Timeline connector */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main', mt: 1, flexShrink: 0 }} />
                            {idx < sortedLogs.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', my: 0.5 }} />}
                          </Box>
                          <Box sx={{ pb: 2, flex: 1 }}>
                            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 12, fontWeight: 700 }}>
                                {log.actor ? initials(log.actor.firstName, log.actor.lastName) : 'H'}
                              </Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                                  {auditActionLabel(log.action)}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                  {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'Sistema'} · {formatDate(log.createdAt)}
                                </Typography>
                              </Box>
                            </Stack>
                            {renderAuditDiff(log.before, log.after)}
                          </Box>
                        </Box>
                      ))
                    })()
                  )}
                </Stack>
              )
            })()}
          </>
        ) : null}
      </Box>

      {/* Close Case Dialog */}
      <Dialog
        open={closeDialogOpen}
        onClose={() => !isSubmittingClose && setCloseDialogOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 3, maxWidth: 450, width: '100%' } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Cerrar Caso</DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'divider' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Por favor ingresa un comentario con la razón de cierre del caso. Esto se guardará en el historial de comentarios del caso.
            </Typography>
            <TextField
              label="Razón de cierre *"
              multiline
              rows={3}
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              fullWidth
              autoFocus
              placeholder="Ej. Se resolvió el reclamo y se notificó al cliente."
            />
            {!hasSupervisorPrivileges && (
              <>
                <TextField
                  select
                  label="Supervisor *"
                  value={supervisorEmail}
                  onChange={(event) => setSupervisorEmail(event.target.value)}
                  fullWidth
                  helperText="Requiere autorización de un usuario con jerarquía superior."
                >
                  {supervisorUsers.map((user) => (
                    <MenuItem key={user.uuid} value={user.email}>
                      {user.firstName} {user.lastName} ({user.email})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Contraseña del supervisor *"
                  type={showSupervisorPassword ? 'text' : 'password'}
                  value={supervisorPassword}
                  onChange={(event) => setSupervisorPassword(event.target.value)}
                  fullWidth
                  autoComplete="current-password"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowSupervisorPassword(!showSupervisorPassword)}
                            edge="end"
                          >
                            {showSupervisorPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setCloseDialogOpen(false)} disabled={isSubmittingClose} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={isSubmittingClose || !closeReason.trim() || (!hasSupervisorPrivileges && (!supervisorEmail || !supervisorPassword))}
            onClick={handleCloseCaseSubmit}
            startIcon={isSubmittingClose ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isSubmittingClose ? 'Cerrando…' : 'Cerrar Caso'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Policy Dialog */}
      <Dialog
        open={policyDialogOpen}
        onClose={() => setPolicyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, px: 3.5, pt: 3.5, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 2, color: 'primary.main', display: 'flex', alignItems: 'center' }}>
              <ClipboardCheck size={24} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.5, display: 'block', textTransform: 'uppercase' }}>
                Detalles de Póliza
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {fullPolicy ? fullPolicy.policyNumber : detail?.policy?.policyNumber}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => setPolicyDialogOpen(false)} size="small" sx={{ color: 'text.secondary' }}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3.5, py: 2 }}>
          {fullPolicy ? (
            <Stack spacing={3} sx={{ mt: 1.5 }}>
              {/* Status & Provider Header Card */}
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>Aseguradora</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{fullPolicy.provider?.name ?? '—'}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600, mb: 0.5 }}>Estado</Typography>
                  <Chip
                    label={t(policyStatusLabels, fullPolicy.status)}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: fullPolicy.status.toLowerCase() === 'active' || fullPolicy.status.toLowerCase() === 'vigente' ? 'success.main' :
                               fullPolicy.status.toLowerCase() === 'draft' || fullPolicy.status.toLowerCase() === 'borrador' ? 'warning.main' :
                               fullPolicy.status.toLowerCase() === 'expired' || fullPolicy.status.toLowerCase() === 'vencida' ? 'error.main' : 'action.disabledBackground',
                      color: fullPolicy.status.toLowerCase() === 'active' || fullPolicy.status.toLowerCase() === 'vigente' ? 'success.contrastText' :
                             fullPolicy.status.toLowerCase() === 'draft' || fullPolicy.status.toLowerCase() === 'borrador' ? 'warning.contrastText' :
                             fullPolicy.status.toLowerCase() === 'expired' || fullPolicy.status.toLowerCase() === 'vencida' ? 'error.contrastText' : 'text.secondary'
                    }}
                  />
                </Box>
              </Stack>

              {/* Grid de Datos */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>Plan / Producto</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>{fullPolicy.product?.name ?? '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>Cliente Titular</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>{fullPolicy.client?.displayName ?? '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>Moneda</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>{fullPolicy.currency}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>Prima Anual</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main', mt: 0.5 }}>
                    {fullPolicy.premiumAmount != null
                      ? `${fullPolicy.currency === 'GTQ' ? 'Q' : '$'}${Number(fullPolicy.premiumAmount).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>Suma Asegurada</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                    {fullPolicy.insuredAmount != null
                      ? `${fullPolicy.currency === 'GTQ' ? 'Q' : '$'}${Number(fullPolicy.insuredAmount).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>Vigencia</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                    {dayjs(fullPolicy.startDate).format('DD/MM/YYYY')} - {dayjs(fullPolicy.endDate).format('DD/MM/YYYY')}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="span" sx={{ display: 'inline-flex', color: 'primary.main' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                  </Box>
                  Información Financiera y de Pago
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2.5 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>Método de Pago</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      {fullPolicy.paymentMethod === 'card' && (
                        <>
                          {fullPolicy.cardBrand === 'visa' && (
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <span style={{ fontSize: 11, background: '#0ea5e9', color: '#fff', padding: '1px 4px', borderRadius: 2, fontWeight: 900 }}>VISA</span>
                              {fullPolicy.cardLastFour ? `•••• ${fullPolicy.cardLastFour}` : ''}
                            </Typography>
                          )}
                          {fullPolicy.cardBrand === 'mastercard' && (
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#f97316', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <span style={{ fontSize: 11, background: '#f97316', color: '#fff', padding: '1px 4px', borderRadius: 2, fontWeight: 900 }}>MC</span>
                              {fullPolicy.cardLastFour ? `•••• ${fullPolicy.cardLastFour}` : ''}
                            </Typography>
                          )}
                          {fullPolicy.cardBrand === 'amex' && (
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <span style={{ fontSize: 11, background: '#06b6d4', color: '#fff', padding: '1px 4px', borderRadius: 2, fontWeight: 900 }}>AMEX</span>
                              {fullPolicy.cardLastFour ? `•••• ${fullPolicy.cardLastFour}` : ''}
                            </Typography>
                          )}
                          {!['visa', 'mastercard', 'amex'].includes(fullPolicy.cardBrand || '') && (
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              Tarjeta {fullPolicy.cardLastFour ? `•••• ${fullPolicy.cardLastFour}` : ''}
                            </Typography>
                          )}
                        </>
                      )}
                      {fullPolicy.paymentMethod === 'transfer' && (
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          Transferencia Bancaria
                        </Typography>
                      )}
                      {fullPolicy.paymentMethod === 'cash' && (
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          Efectivo
                        </Typography>
                      )}
                      {!fullPolicy.paymentMethod && (
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', fontStyle: 'italic' }}>
                          No especificado
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>Periodicidad de Cobro</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                      {fullPolicy.billingFrequency === 'single' && 'Pago Único'}
                      {fullPolicy.billingFrequency === 'monthly' && 'Mensual'}
                      {fullPolicy.billingFrequency === 'quarterly' && 'Trimestral'}
                      {fullPolicy.billingFrequency === 'semi_annually' && 'Semestral'}
                      {fullPolicy.billingFrequency === 'annually' && 'Anual'}
                      {!fullPolicy.billingFrequency && '—'}
                    </Typography>
                  </Box>

                  {fullPolicy.billingFrequency && fullPolicy.billingFrequency !== 'single' && (
                    <>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>Cuotas Totales</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                          {fullPolicy.billingInstallments ?? '—'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>Monto por Cuota</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main', mt: 0.5 }}>
                          {fullPolicy.installmentAmount != null
                            ? `${fullPolicy.currency === 'GTQ' ? 'Q' : '$'}${Number(fullPolicy.installmentAmount).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>

              {/* Notes */}
              {fullPolicy.notes && (
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600, mb: 0.5 }}>Notas / Observaciones</Typography>
                  <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {fullPolicy.notes}
                  </Typography>
                </Box>
              )}
            </Stack>
          ) : (
            <Stack sx={{ py: 6, alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={40} style={{ opacity: 0.3 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
                No se encontraron detalles ampliados para la póliza asociada.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setPolicyDialogOpen(false)} variant="contained" fullWidth sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  )
}

// ─── Cases Main Page ─────────────────────────────────────

export function CasesMaintenancePage() {
  const { id } = useParams()
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
  const { data: paginated, error, loading, refetch } = useApiQuery(
    'cases-all',
    () => fetchCases()
  )
  const cases = paginated?.items ?? []
  const totalCount = paginated?.total ?? 0

  const canViewCases = usePermission('view_cases')
  const canCreateCase = usePermission('create_case')
  const canEditCase = usePermission('edit_case')
  const canDeleteCase = usePermission('delete_case')
  const permissionsLoading = usePermissionLoading()
  const { data: clientsData } = useApiQuery('clients-for-select', fetchClients)
  const clients = clientsData?.items ?? []
  const { data: policiesData } = useApiQuery('policies-for-select', fetchPolicies)
  const policies = policiesData?.items ?? []
  const { data: users } = useApiQuery('users-for-select', fetchUsers)
  const { data: tagsData } = useApiQuery('tags-for-select', fetchTags)
  const tags = tagsData?.items ?? []

  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>(() => createEmptyGridSelectionModel())
  const [drawerCaseId, setDrawerCaseId] = useState<string | null>(null)

  useEffect(() => {
    setDrawerCaseId(id ?? null)
  }, [id])

  useEffect(() => {
    return subscribeAppEvent('records:changed', (event) => {
      if (!event.entity || event.entity === 'case') {
        refetch()
      }
    })
  }, [refetch])


  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedCase, setSelectedCase] = useState<CaseRaw | CaseDetail | null>(null)
  const selectedIds = useMemo(
    () => getSelectedGridIds(rowSelectionModel, (cases ?? []).map((supportCase) => supportCase.uuid)),
    [cases, rowSelectionModel],
  )
  const selectedCount = selectedIds.length

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  // Flag to skip the policy-clear effect during programmatic form resets
  const isResettingRef = useRef(false)

  const { control, handleSubmit, reset, watch, setValue, getValues, formState: { errors, isSubmitting } } = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'Pending',
      priority: 'Medium',
      type: 'GeneralSupport',
      dueAt: '',
      clientId: '',
      policyId: '',
      assignedUserId: '',
      tagUuids: [],
    },
  })

  const openCreate = () => {
    setDialogMode('create')
    isResettingRef.current = true
    reset({
      title: '',
      description: '',
      status: 'Pending',
      selectedCase: null,
      priority: 'Medium',
      type: 'GeneralSupport',
      dueAt: '',
      clientId: '',
      policyId: '',
      assignedUserId: '',
      tagUuids: [],
    } as any)
    setDialogOpen(true)
  }

  useEffect(() => {
    const handleSherpaAction = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.type === 'open-case' && customEvent.detail?.uuid) {
        setDrawerCaseId(customEvent.detail.uuid)
      } else if (customEvent.detail?.type === 'create-case') {
        openCreate()
      }
    }
    window.addEventListener('sherpa-action', handleSherpaAction)
    return () => window.removeEventListener('sherpa-action', handleSherpaAction)
  }, [])

  const openEdit = (c: CaseRaw | CaseDetail) => {
    setSelectedCase(c)
    setAnchorEl(null)
    setDialogMode('edit')
    isResettingRef.current = true
    reset({
      title: c.title,
      description: c.description ?? '',
      status: c.status as any,
      priority: c.priority as any,
      type: c.type as any,
      dueAt: (c as any).dueAt ? new Date((c as any).dueAt).toISOString().split('T')[0] : '',
      clientId: c.clientUuid || (c as any).client?.uuid || '',
      policyId: (c as any).policy?.uuid ?? (c as any).policyUuid ?? '',
      assignedUserId: (c as any).assignedUser?.uuid ?? (c as any).assignedUserUuid ?? '',
      tagUuids: (c as any).tags ? (c as any).tags.map((t: any) => t.uuid) : [],
    })
    setDialogOpen(true)
  }

  const openDelete = (c: CaseRaw | CaseDetail) => {
    setSelectedCase(c)
    setAnchorEl(null)
    setDeleteDialogOpen(true)
  }

  const onSubmit = async (data: any) => {
    try {
      const input = normalizeCaseInput(data)
      if (dialogMode === 'create') {
        await createCase(input)
        toast.success('Caso de soporte creado exitosamente')
      } else {
        if (!selectedCase) return
        await updateCase({ uuid: selectedCase.uuid, ...input })
        toast.success('Caso de soporte actualizado')
      }
      setDialogOpen(false)
      refetch()
    } catch (err: any) {
      toast.error(friendlyError(err, 'Error al guardar el caso'))
    }
  }

  const handleDelete = async () => {
    if (!selectedCase) return
    setIsDeleting(true)
    try {
      await removeCase(selectedCase.uuid)
      toast.success('Caso eliminado exitosamente')
      setDeleteDialogOpen(false)
      setDrawerCaseId(null)
      refetch()
    } catch (err: any) {
      toast.error(friendlyError(err, 'Error al eliminar el caso'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setIsDeleting(true)
    try {
      await Promise.all(selectedIds.map((uuid) => removeCase(uuid)))
      toast.success(`${selectedIds.length} casos eliminados`)
      setBulkDeleteDialogOpen(false)
      setRowSelectionModel(createEmptyGridSelectionModel())
      if (drawerCaseId && selectedIds.includes(drawerCaseId)) {
        setDrawerCaseId(null)
      }
      refetch()
    } catch (err: any) {
      toast.error(friendlyError(err, 'Error al eliminar los casos seleccionados'))
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: GridColDef[] = [
    { field: 'caseNumber', headerName: 'Nº Caso', width: 140 },
    { field: 'title', headerName: 'Título', flex: 1, minWidth: 200 },
    { field: 'client', headerName: 'Cliente', flex: 1, minWidth: 160, valueGetter: (_v, row: CaseRaw) => row.client?.displayName ?? '—' },
    {
      field: 'type',
      headerName: 'Tipo',
      width: 160,
      type: 'singleSelect',
      valueOptions: Object.entries(caseTypeLabels).map(([value, label]) => ({ value, label })),
      valueFormatter: (value) => t(caseTypeLabels, value as string),
    },
    {
      field: 'priority', headerName: 'Prioridad', width: 130, type: 'singleSelect',
      valueOptions: Object.entries(casePriorityLabels).map(([value, label]) => ({ value, label })),
      renderCell: (params) => <PriorityChip priority={params.row.priority} />,
    },
    {
      field: 'status', headerName: 'Estado', width: 170, type: 'singleSelect',
      valueOptions: Object.entries(caseStatusLabels).map(([value, label]) => ({ value, label })),
      renderCell: (params) => <StatusChip status={params.row.status} />,
    },
    {
      field: 'tags',
      headerName: 'Etiquetas',
      flex: 0.75,
      minWidth: 220,
      sortable: false,
      renderCell: (params) => {
        const tags: { uuid: string; name: string; color: string }[] = params.row.tags ?? []
        if (!tags.length) return <span style={{ color: 'var(--mui-palette-text-disabled)' }}>—</span>
        const visibleTags = tags.slice(0, 2)
        const hiddenCount = tags.length - visibleTags.length
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.55, alignItems: 'center', py: 0.5, minWidth: 0, maxWidth: '100%' }}>
            {visibleTags.map((tag) => (
              <Chip
                key={tag.uuid}
                size="small"
                label={tag.name}
                sx={{
                  height: 22,
                  maxWidth: 130,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  bgcolor: `${tag.color}28`,
                  color: tag.color,
                  border: `1px solid ${tag.color}55`,
                }}
              />
            ))}
            {hiddenCount > 0 && (
              <Chip
                size="small"
                label={`+${hiddenCount}`}
                sx={{
                  height: 22,
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  bgcolor: 'action.selected',
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            )}
          </Box>
        )
      },
    },
    ...((canEditCase || canDeleteCase) ? [{
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: (params: any) => (
        <IconButton size="small" onClick={(e) => {
          e.stopPropagation()
          setAnchorEl(e.currentTarget)
          setSelectedCase(params.row)
        }} sx={{ color: 'text.secondary' }}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    }] : []),
  ]

  const selectedClient = (selectedCase as any)?.client as ClientRaw | null | undefined
  const selectedPolicy = (selectedCase as any)?.policy as PolicyRaw | null | undefined
  const selectedAssignedUser = (selectedCase as any)?.assignedUser as UserRaw | null | undefined
  const formClientId = watch('clientId')

  const filteredPolicies = useMemo(() => {
    const list = policies ?? []
    if (!formClientId) return []
    return list.filter((p) => p.clientUuid === formClientId || p.client?.uuid === formClientId)
  }, [policies, formClientId])



  // Clear policyId only when the CLIENT changes and the current policy no longer belongs to it.
  // This effect must NOT depend on formPolicyId — otherwise every policy selection re-triggers it.
  useEffect(() => {
    if (isResettingRef.current) {
      isResettingRef.current = false
      return
    }
    const currentPolicyId = getValues('policyId')
    if (formClientId && currentPolicyId) {
      const matchingPolicy = policies?.find((p) => p.uuid === currentPolicyId)
      if (matchingPolicy && matchingPolicy.clientUuid !== formClientId && matchingPolicy.client?.uuid !== formClientId) {
        setValue('policyId', '')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formClientId, policies])

  const clientOptions = withSelectedOption(clients, selectedClient)
  const policyOptions = withSelectedOption(filteredPolicies, selectedPolicy)
  const userOptions = withSelectedOption(users, selectedAssignedUser)

  if (permissionsLoading) {
    return <MaintenanceSkeleton layout="table" />
  }

  if (!canViewCases) {
    return (
      <Alert severity="error" sx={{ mt: 4, borderRadius: 2 }}>
        Acceso denegado. No tiene permisos para ver los casos.
      </Alert>
    )
  }

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} className="flex-wrap gap-4">
        <Box sx={{ flexGrow: 1 }}>
          <PageHeader title="Casos" description="Reclamos, renovaciones, endosos y seguimiento operativo." actionLabel="" icon={ClipboardCheck} />
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>No se pudo cargar la información de casos.</Alert>}

      <ResponsiveDataGrid
        rows={cases}
        rowCount={totalCount}
        paginationMode="client"
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        checkboxSelection={canDeleteCase}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={setRowSelectionModel}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={(params, event) => {
          const target = event.target as HTMLElement
          if (
            target.closest('.MuiDataGrid-cellCheckbox') ||
            target.closest('.MuiCheckbox-root') ||
            target.getAttribute('type') === 'checkbox'
          ) {
            return
          }
          setDrawerCaseId(params.row.uuid)
        }}
        localeText={esESGrid}
        sx={{ cursor: 'pointer', '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' } }}
      />

      {/* Row context menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { elevation: 0, sx: { borderRadius: 3, minWidth: 140, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } } }}>
        {canEditCase && <MenuItem onClick={() => { if (selectedCase) openEdit(selectedCase) }} sx={{ color: 'text.primary' }}>
          <Edit2 size={16} className="mr-2" style={{ opacity: 0.7 }} /> Editar
        </MenuItem>}
        {canDeleteCase && <MenuItem onClick={() => { if (selectedCase) openDelete(selectedCase) }} sx={{ color: 'error.main' }}>
          <Trash2 size={16} className="mr-2" /> Eliminar
        </MenuItem>}
      </Menu>

      {/* Case Details Drawer */}
      <CaseDetailDrawer
        caseUuid={drawerCaseId}
        open={Boolean(drawerCaseId)}
        onClose={() => setDrawerCaseId(null)}
        onEdit={(c) => { setDrawerCaseId(null); openEdit(c) }}
        onDelete={(c) => { setDrawerCaseId(null); openDelete(c) }}
        onRefresh={refetch}
        clients={clients}
        policies={policies}
        users={users}
        tags={tags}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => !isSubmitting && setDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogTitle sx={{ fontWeight: 700, color: 'text.primary' }}>
            {dialogMode === 'create' ? 'Nuevo Caso de Seguimiento' : 'Editar Caso'}
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'divider' }}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Controller name="title" control={control} render={({ field }) => (
                <TextField {...field} type="text" value={field.value ?? ''} label="Título del Caso *" fullWidth error={!!errors.title} helperText={errors.title?.message?.toString() ?? ' '} />
              )} />

              <Controller name="description" control={control} render={({ field }) => (
                <TextField {...field} value={field.value ?? ''} label="Descripción" multiline rows={3} fullWidth error={!!errors.description} helperText={errors.description?.message?.toString() ?? ' '} />
              )} />

              <Stack direction="row" spacing={2}>
                <Controller name="type" control={control} render={({ field }) => (
                  <ResponsiveSelect
                    {...field}
                    label="Tipo *"
                    error={!!errors.type}
                    helperText={errors.type?.message ?? ' '}
                    options={[
                      { value: 'Claim', label: 'Reclamo' },
                      { value: 'Renewal', label: 'Renovación' },
                      { value: 'Endorsement', label: 'Endoso' },
                      { value: 'Payment', label: 'Pago' },
                      { value: 'Documentation', label: 'Documentación' },
                      { value: 'GeneralSupport', label: 'Soporte General' }
                    ]}
                  />
                )} />
                <Controller name="priority" control={control} render={({ field }) => (
                  <ResponsiveSelect
                    {...field}
                    label="Prioridad *"
                    error={!!errors.priority}
                    helperText={errors.priority?.message ?? ' '}
                    options={[
                      { value: 'Low', label: 'Baja' },
                      { value: 'Medium', label: 'Media' },
                      { value: 'High', label: 'Alta' },
                      { value: 'Urgent', label: 'Urgente' }
                    ]}
                  />
                )} />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Controller name="status" control={control} render={({ field }) => (
                  <ResponsiveSelect
                    {...field}
                    label="Estado *"
                    error={!!errors.status}
                    helperText={errors.status?.message ?? ' '}
                    options={[
                      { value: 'Pending', label: 'Pendiente' },
                      { value: 'InProgress', label: 'En Progreso' },
                      { value: 'WaitingForClient', label: 'Esperando Cliente' },
                      { value: 'WaitingForProvider', label: 'Esperando Proveedor' },
                      { value: 'Closed', label: 'Cerrado' },
                      { value: 'Cancelled', label: 'Cancelado' }
                    ]}
                  />
                )} />
                <Controller
                  name="dueAt"
                  control={control}
                  render={({ field: { onChange, value, ...restField } }) => (
                    <DatePicker
                      {...restField}
                      label="Fecha Límite"
                      value={value ? dayjs(value) : null}
                      onChange={(newValue) => {
                        onChange(newValue ? newValue.toISOString() : '')
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.dueAt,
                          helperText: errors.dueAt?.message?.toString() ?? ' ',
                        },
                      }}
                    />
                  )}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Controller name="clientId" control={control} render={({ field }) => (
                  <ResponsiveAutocomplete
                    options={clientOptions}
                    getOptionLabel={(option: ClientRaw) => option.displayName}
                    value={clientOptions.find((c) => c.uuid === field.value) ?? null}
                    onChange={(_, newValue) => field.onChange(newValue?.uuid ?? '')}
                    isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                    noOptionsText="Sin resultados"
                    label="Cliente *"
                    error={!!errors.clientId}
                    helperText={errors.clientId?.message?.toString() ?? ' '}
                  />
                )} />
                <Controller name="policyId" control={control} render={({ field }) => (
                  <ResponsiveAutocomplete
                    options={policyOptions}
                    getOptionLabel={(option: PolicyRaw) => option.policyNumber}
                    value={policyOptions.find((p) => p.uuid === field.value) ?? null}
                    onChange={(_, newValue) => field.onChange(newValue?.uuid ?? '')}
                    isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                    noOptionsText={formClientId ? "Sin resultados" : "Selecciona un cliente primero"}
                    disabled={!formClientId}
                    label="Póliza Asociada"
                    error={!!errors.policyId}
                    helperText={errors.policyId?.message?.toString() ?? ' '}
                  />
                )} />
              </Stack>

              <Controller name="assignedUserId" control={control} render={({ field }) => (
                <ResponsiveAutocomplete
                  options={userOptions}
                  getOptionLabel={(option: UserRaw) => `${option.firstName} ${option.lastName} (${option.email})`}
                  getOptionSubtitle={(option: UserRaw) => option.email}
                  value={userOptions.find((u) => u.uuid === field.value) ?? null}
                  onChange={(_, newValue) => field.onChange(newValue?.uuid ?? '')}
                  isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                  noOptionsText="Sin resultados"
                  label="Responsable Asignado"
                  error={!!errors.assignedUserId}
                  helperText={errors.assignedUserId?.message?.toString() ?? ' '}
                  renderOption={(props: React.HTMLAttributes<HTMLLIElement> & { key: React.Key }, option: UserRaw) => {
                    const { key, ...optionProps } = props;
                    const initials = `${option.firstName?.[0] ?? ''}${option.lastName?.[0] ?? ''}`.toUpperCase()
                    return (
                      <li key={key} {...optionProps}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', fontWeight: 600, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                              {option.firstName} {option.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.email}
                            </Typography>
                          </Box>
                        </Box>
                      </li>
                    );
                  }}
                />
              )} />

               <Controller name="tagUuids" control={control} render={({ field }) => (
                <Autocomplete
                  multiple
                  disablePortal={false}
                  slotProps={{ paper: { sx: { borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider' } } }}
                  options={tags ?? []}
                  getOptionLabel={(option: TagRaw) => option.name}
                  value={(tags ?? []).filter((t) => (field.value ?? []).includes(t.uuid))}
                  onChange={(_: any, newValue: TagRaw[]) => {
                    field.onChange(newValue.map((v: TagRaw) => v.uuid))
                  }}
                  isOptionEqualToValue={(option: TagRaw, value: TagRaw) => option.uuid === value.uuid}
                  noOptionsText="Sin resultados"
                  fullWidth
                  renderInput={(params: any) => (
                    <TextField {...params} type="text" label="Etiquetas" error={!!errors.tagUuids} helperText={errors.tagUuids?.message ?? ' '} />
                  )}
                  renderValue={(tagValue: TagRaw[], getItemProps: any) =>
                    tagValue.map((option: TagRaw, index: number) => {
                      const { key, ...tagProps } = getItemProps({ index });
                      return (
                        <Chip
                          key={key}
                          label={option.name}
                          size="small"
                          sx={{ bgcolor: option.color ?? 'grey.300', color: '#fff', fontWeight: 600 }}
                          {...tagProps}
                        />
                      );
                    })
                  }
                  renderOption={(props: React.HTMLAttributes<HTMLLIElement> & { key: React.Key }, option: TagRaw) => {
                    const { key, ...optionProps } = props;
                    return (
                      <li key={key} {...optionProps}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: option.color }} />
                          <span>{option.name}</span>
                        </Box>
                      </li>
                    );
                  }}
                />
              )} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={isSubmitting} sx={{ color: 'text.secondary' }}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => !isDeleting && setDeleteDialogOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirmar eliminación</DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'divider' }}>
          <Typography>
            ¿Eliminar el caso de soporte <strong>{selectedCase?.caseNumber}</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            disabled={isDeleting}
            onClick={handleDelete}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={16} />}
          >
            {isDeleting ? 'Eliminando…' : 'Sí, eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkDeleteDialogOpen} onClose={() => !isDeleting && setBulkDeleteDialogOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3, maxWidth: 420 } } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 size={20} color="var(--mui-palette-error-main)" /> Eliminar casos
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary', mt: 1 }}>
            ¿Eliminar <strong>{selectedCount}</strong> casos seleccionados? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setBulkDeleteDialogOpen(false)} disabled={isDeleting} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            disabled={isDeleting}
            onClick={handleBulkDelete}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={16} />}
          >
            {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {(canCreateCase || (canDeleteCase && selectedCount > 0)) && (
        <MaintenanceFab
          label={selectedCount > 0 ? `Eliminar ${selectedCount} casos` : 'Nuevo caso'}
          onClick={selectedCount > 0 ? () => setBulkDeleteDialogOpen(true) : openCreate}
          icon={selectedCount > 0 ? <Trash2 size={24} /> : undefined}
          color={selectedCount > 0 ? 'error' : 'primary'}
        />
      )}
    </Stack>
  )
}
