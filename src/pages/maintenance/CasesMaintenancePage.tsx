import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Autocomplete, Avatar, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControlLabel, IconButton, Menu, MenuItem, Select, InputLabel, FormControl, Skeleton, Stack, Tab, Tabs, TextField, Typography, OutlinedInput, alpha } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { ClipboardCheck, Clock, Edit2, MessageSquare, MoreVertical, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import dayjs from 'dayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { addCommentApi, createCase, fetchCaseDetail, fetchCases, fetchClients, fetchPolicies, fetchUsers, fetchTags, removeCase, updateCase } from '../../api/maintenanceApi'
import type { CaseDetail, CaseRaw, ClientRaw, PolicyRaw, UserRaw, TagRaw } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { casePriorityLabels, caseStatusLabels, caseTypeLabels, esESGrid, t } from '../../utils/enumLabels'

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

function StatusChip({ status }: { status: string }) {
  const color: Record<string, { bgcolor: string; color: string }> = {
    Pending: { bgcolor: 'warning.main', color: 'warning.contrastText' },
    InProgress: { bgcolor: 'info.main', color: 'info.contrastText' },
    Closed: { bgcolor: 'success.main', color: 'success.contrastText' },
    Cancelled: { bgcolor: 'error.main', color: 'error.contrastText' },
    WaitingForClient: { bgcolor: 'warning.light', color: 'warning.contrastText' },
    WaitingForProvider: { bgcolor: 'warning.dark', color: 'warning.contrastText' },
  }
  const c = color[status] ?? { bgcolor: 'action.disabledBackground', color: 'text.secondary' }
  return <Chip label={t(caseStatusLabels, status)} size="small" sx={{ fontWeight: 600, ...c }} />
}

function PriorityChip({ priority }: { priority: string }) {
  const color: Record<string, { bgcolor: string; color: string }> = {
    Urgent: { bgcolor: 'error.main', color: 'error.contrastText' },
    High: { bgcolor: 'warning.main', color: 'warning.contrastText' },
    Medium: { bgcolor: 'info.main', color: 'info.contrastText' },
    Low: { bgcolor: 'action.disabledBackground', color: 'text.secondary' },
  }
  const c = color[priority] ?? { bgcolor: 'action.disabledBackground', color: 'text.secondary' }
  return <Chip label={t(casePriorityLabels, priority)} size="small" sx={{ fontWeight: 600, ...c }} />
}

const caseSchema = z.object({
  title: z.string().min(2, 'El título es requerido'),
  description: z.string().optional(),
  status: z.enum(['Pending', 'InProgress', 'WaitingForClient', 'WaitingForProvider', 'Closed', 'Cancelled']),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  type: z.enum(['Claim', 'Renewal', 'Endorsement', 'Payment', 'Documentation', 'GeneralSupport']),
  dueAt: z.string().optional().or(z.literal('')),
  clientId: z.string().min(1, 'Selecciona un cliente'),
  policyId: z.string().optional().or(z.literal('')),
  assignedUserId: z.string().optional().or(z.literal('')),
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

  // Closing case states
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [isSubmittingClose, setIsSubmittingClose] = useState(false)

  const { data: detail, loading, refetch } = useApiQuery(
    caseUuid ? `case-${caseUuid}` : '__none__',
    () => (caseUuid ? fetchCaseDetail(caseUuid) : Promise.resolve(null as unknown as CaseDetail)),
  )

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
    setIsSubmittingClose(true)
    try {
      await addCommentApi(caseUuid, `Razón de cierre: ${closeReason}`, false)
      await updateCase({ uuid: caseUuid, status: 'Closed' })
      toast.success('Caso cerrado exitosamente')
      setCloseReason('')
      setCloseDialogOpen(false)
      refetch()
      onRefresh()
    } catch (err: any) {
      toast.error(friendlyError(err, 'Error al cerrar el caso'))
    } finally {
      setIsSubmittingClose(false)
    }
  }

  const [isActivating, setIsActivating] = useState(false)

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
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 1 }}>
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
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => setCloseDialogOpen(true)}
                  sx={{ mr: 1, textTransform: 'none', fontWeight: 600, height: 28 }}
                >
                  Cerrar
                </Button>
              )}
              {detail.status === 'Pending' && (
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  disabled={isActivating}
                  onClick={handleActivateCaseClick}
                  startIcon={isActivating ? <CircularProgress size={14} color="inherit" /> : undefined}
                  sx={{ mr: 1, textTransform: 'none', fontWeight: 600, height: 28 }}
                >
                  {isActivating ? 'Abriendo…' : 'Abrir'}
                </Button>
              )}
              {(detail.status === 'Closed' || detail.status === 'Cancelled') && (
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  disabled={isActivating}
                  onClick={handleActivateCaseClick}
                  startIcon={isActivating ? <CircularProgress size={14} color="inherit" /> : undefined}
                  sx={{ mr: 1, textTransform: 'none', fontWeight: 600, height: 28 }}
                >
                  {isActivating ? 'Activando…' : 'Re-activar'}
                </Button>
              )}
              <IconButton onClick={() => onEdit(detail)} size="small" sx={{ color: 'text.secondary' }}>
                <Edit2 size={18} />
              </IconButton>
              <IconButton onClick={() => onDelete(detail)} size="small" sx={{ color: 'error.main' }}>
                <Trash2 size={18} />
              </IconButton>
            </>
          )}
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <X size={20} />
          </IconButton>
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
        {loading ? (
          <Stack spacing={2}>
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="text" height={28} />)}
          </Stack>
        ) : detail ? (
          <>
            {/* Tab 0 – Details */}
            {tab === 0 && (
              <Stack spacing={3}>
                {detail.description && (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Descripción</Typography>
                    <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.5 }}>{detail.description}</Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Cliente</Typography>
                  <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600, mt: 0.5 }}>{detail.client.displayName}</Typography>
                  {detail.client.email && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{detail.client.email}</Typography>}
                  {detail.client.phone && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{detail.client.phone}</Typography>}
                </Box>
                {detail.policy && (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Póliza</Typography>
                    <Typography variant="body1" sx={{ color: 'text.primary', mt: 0.5 }}>{detail.policy.policyNumber}</Typography>
                  </Box>
                )}
                {detail.assignedUser && (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Responsable</Typography>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 0.5 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>
                        {initials(detail.assignedUser.firstName, detail.assignedUser.lastName)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.2 }}>
                          {detail.assignedUser.firstName} {detail.assignedUser.lastName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{detail.assignedUser.email}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                )}
                <Divider />
                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Creado</Typography>
                    <Typography variant="caption" sx={{ color: 'text.primary' }}>{formatDate(detail.createdAt)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Última actualización</Typography>
                    <Typography variant="caption" sx={{ color: 'text.primary' }}>{formatDate(detail.updatedAt)}</Typography>
                  </Stack>
                  {detail.dueAt && (
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Vence</Typography>
                      <Typography variant="caption" sx={{ color: new Date(detail.dueAt) < new Date() ? 'error.main' : 'text.primary' }}>
                        {formatDate(detail.dueAt)}
                      </Typography>
                    </Stack>
                  )}
                  {detail.closedAt && (
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Cerrado</Typography>
                      <Typography variant="caption" sx={{ color: 'text.primary' }}>{formatDate(detail.closedAt)}</Typography>
                    </Stack>
                  )}
                </Stack>
              </Stack>
            )}

            {/* Tab 1 – Comments */}
            {tab === 1 && (
              <Stack spacing={3}>
                <Box component="form" onSubmit={handleCommentSubmit} noValidate sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                  <Stack spacing={2}>
                    <TextField
                      label="Nuevo comentario *"
                      placeholder="Escribe una actualización o nota..."
                      multiline
                      rows={2}
                      value={newCommentBody}
                      onChange={(e) => setNewCommentBody(e.target.value)}
                      fullWidth
                    />
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={newCommentInternal}
                            onChange={(e) => setNewCommentInternal(e.target.checked)}
                          />
                        }
                        label="Nota interna"
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmittingComment || !newCommentBody.trim()}
                        startIcon={isSubmittingComment ? <CircularProgress size={16} color="inherit" /> : undefined}
                      >
                        {isSubmittingComment ? 'Guardando…' : 'Comentar'}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>

                <Stack spacing={2}>
                  {detail.comments.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <MessageSquare size={40} style={{ opacity: 0.3, margin: '0 auto' }} strokeWidth={1} />
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>Sin comentarios todavía.</Typography>
                    </Box>
                  ) : (
                    detail.comments.map((comment) => (
                      <Box
                        key={comment.uuid}
                        sx={{
                          bgcolor: (theme) => comment.internalOnly ? alpha(theme.palette.warning.main, 0.08) : 'background.paper',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: (theme) => comment.internalOnly ? alpha(theme.palette.warning.main, 0.4) : 'divider',
                          p: 2,
                          transition: 'all 0.2s',
                        }}
                      >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, flexShrink: 0 }}>
                            {initials(comment.author.firstName, comment.author.lastName)}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                {comment.author.firstName} {comment.author.lastName}
                                {comment.internalOnly && (
                                  <Chip
                                    label="Interno"
                                    size="small"
                                    sx={{
                                      ml: 1,
                                      height: 16,
                                      fontSize: 10,
                                      bgcolor: (theme) => alpha(theme.palette.warning.main, 0.16),
                                      color: 'warning.main',
                                      border: '1px solid',
                                      borderColor: (theme) => alpha(theme.palette.warning.main, 0.3),
                                      fontWeight: 800,
                                    }}
                                  />
                                )}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{formatDate(comment.createdAt)}</Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.5 }}>{comment.body}</Typography>
                          </Box>
                        </Stack>
                      </Box>
                    ))
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
                  policyUuid: 'Póliza',
                  assignedUserUuid: 'Responsable Asignado',
                  tagUuids: 'Etiquetas',
                  closedAt: 'Fecha de Cierre',
                }

                const formatValue = (key: string, val: any) => {
                  if (val === null || val === undefined || val === '') return '—'
                  if (key === 'status') return t(caseStatusLabels, val)
                  if (key === 'priority') return t(casePriorityLabels, val)
                  if (key === 'type') return t(caseTypeLabels, val)
                  if (key === 'dueAt' || key === 'closedAt') return formatDate(val)
                  if (key === 'clientUuid') {
                    const c = (clients ?? []).find((item) => item.uuid === val)
                    return c ? c.displayName : 'Cliente Desconocido'
                  }
                  if (key === 'policyUuid') {
                    const p = (policies ?? []).find((item) => item.uuid === val)
                    return p ? p.policyNumber : 'Póliza Desconocida'
                  }
                  if (key === 'assignedUserUuid') {
                    const u = (users ?? []).find((item) => item.uuid === val)
                    return u ? `${u.firstName} ${u.lastName}` : 'No Asignado'
                  }
                  if (key === 'tagUuids') {
                    if (Array.isArray(val)) {
                      const names = val.map((uuid) => {
                        const tag = (tags ?? []).find((t) => t.uuid === uuid)
                        return tag ? tag.name : uuid
                      })
                      return names.length > 0 ? names.join(', ') : 'Sin etiquetas'
                    }
                  }
                  return String(val)
                }

                const keys = Object.keys(afterObj).filter((k) => k !== 'uuid' && k !== 'updatedAt')
                if (keys.length === 0) return null

                return (
                  <Stack spacing={0.75} sx={{ mt: 1, p: 1.25, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    {keys.map((key) => {
                      const label = fieldLabels[key] ?? key
                      const beforeVal = formatValue(key, beforeObj[key])
                      const afterVal = formatValue(key, afterObj[key])

                      return (
                        <Box key={key} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {label}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            {beforeStr && (
                              <>
                                <Typography variant="body2" sx={{ color: 'text.secondary', textDecoration: 'line-through', fontSize: '0.78rem' }}>
                                  {beforeVal}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                  →
                                </Typography>
                              </>
                            )}
                            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.78rem' }}>
                              {afterVal}
                            </Typography>
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
                    detail.auditLogs.map((log, idx) => (
                      <Box key={log.uuid} sx={{ display: 'flex', gap: 2 }}>
                        {/* Timeline connector */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main', mt: 1, flexShrink: 0 }} />
                          {idx < detail.auditLogs.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', my: 0.5 }} />}
                        </Box>
                        <Box sx={{ pb: 2, flex: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {auditActionLabels[log.action] ?? log.action}
                          </Typography>
                          {log.actor && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                              por {log.actor.firstName} {log.actor.lastName}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            {formatDate(log.createdAt)}
                          </Typography>
                          {renderAuditDiff(log.before, log.after)}
                        </Box>
                      </Box>
                    ))
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
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setCloseDialogOpen(false)} disabled={isSubmittingClose} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={isSubmittingClose || !closeReason.trim()}
            onClick={handleCloseCaseSubmit}
            startIcon={isSubmittingClose ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isSubmittingClose ? 'Cerrando…' : 'Cerrar Caso'}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  )
}

// ─── Cases Main Page ─────────────────────────────────────

export function CasesMaintenancePage() {
  const { data: cases, error, loading, refetch } = useApiQuery('cases', fetchCases)
  const { data: clients } = useApiQuery('clients-for-select', fetchClients)
  const { data: policies } = useApiQuery('policies-for-select', fetchPolicies)
  const { data: users } = useApiQuery('users-for-select', fetchUsers)
  const { data: tags } = useApiQuery('tags-for-select', fetchTags)

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
  const [drawerCaseId, setDrawerCaseId] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedCase, setSelectedCase] = useState<CaseRaw | CaseDetail | null>(null)

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CaseFormData>({
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
    reset({
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
    })
    setDialogOpen(true)
  }

  const openEdit = (c: CaseRaw | CaseDetail) => {
    setSelectedCase(c)
    setAnchorEl(null)
    setDialogMode('edit')
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
      if (dialogMode === 'create') {
        const caseNumber = `CAS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
        await createCase({ ...data, caseNumber })
        toast.success('Caso de soporte creado exitosamente')
      } else {
        if (!selectedCase) return
        await updateCase({ uuid: selectedCase.uuid, ...data })
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

  const columns: GridColDef[] = [
    { field: 'caseNumber', headerName: 'Nº Caso', width: 140 },
    { field: 'title', headerName: 'Título', flex: 1, minWidth: 200 },
    { field: 'client', headerName: 'Cliente', flex: 1, minWidth: 160, valueGetter: (_v, row: CaseRaw) => row.client?.displayName ?? '—' },
    { field: 'type', headerName: 'Tipo', width: 160, valueGetter: (_v, row: CaseRaw) => t(caseTypeLabels, row.type) },
    {
      field: 'priority', headerName: 'Prioridad', width: 130,
      renderCell: (params) => <PriorityChip priority={params.row.priority} />,
    },
    {
      field: 'status', headerName: 'Estado', width: 170,
      renderCell: (params) => <StatusChip status={params.row.status} />,
    },
    {
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={(e) => {
          e.stopPropagation()
          setAnchorEl(e.currentTarget)
          setSelectedCase(params.row)
        }} sx={{ color: 'text.secondary' }}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ]

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} className="flex-wrap gap-4">
        <Box sx={{ flexGrow: 1 }}>
          <PageHeader title="Casos" description="Reclamos, renovaciones, endosos y seguimiento operativo." actionLabel="" icon={ClipboardCheck} />
        </Box>
        <Button variant="contained" startIcon={<Plus size={20} />} onClick={openCreate}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' }}>
          Nuevo caso
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>No se pudo cargar la información de casos.</Alert>}

      <Box sx={{ height: 600, width: '100%', bgcolor: 'background.paper', borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
        <DataGrid
          rows={cases ?? []}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          onRowClick={(params) => setDrawerCaseId(params.row.uuid)}
          localeText={esESGrid}
          sx={{
            border: 'none',
            cursor: 'pointer',
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, color: 'text.secondary' },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary' },
            '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
            '& .MuiDataGrid-footerContainer': { borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' },
          }}
        />
      </Box>

      {/* Row context menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { elevation: 0, sx: { borderRadius: 3, minWidth: 140, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } } }}>
        <MenuItem onClick={() => { if (selectedCase) openEdit(selectedCase) }} sx={{ color: 'text.primary' }}>
          <Edit2 size={16} className="mr-2" style={{ opacity: 0.7 }} /> Editar
        </MenuItem>
        <MenuItem onClick={() => { if (selectedCase) openDelete(selectedCase) }} sx={{ color: 'error.main' }}>
          <Trash2 size={16} className="mr-2" /> Eliminar
        </MenuItem>
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
                <TextField {...field} label="Título del Caso *" fullWidth error={!!errors.title} helperText={errors.title?.message ?? ' '} />
              )} />

              <Controller name="description" control={control} render={({ field }) => (
                <TextField {...field} label="Descripción" multiline rows={3} fullWidth error={!!errors.description} helperText={errors.description?.message ?? ' '} />
              )} />

              <Stack direction="row" spacing={2}>
                <Controller name="type" control={control} render={({ field }) => (
                  <TextField {...field} select label="Tipo *" fullWidth error={!!errors.type} helperText={errors.type?.message ?? ' '}>
                    <MenuItem value="Claim">Reclamo</MenuItem>
                    <MenuItem value="Renewal">Renovación</MenuItem>
                    <MenuItem value="Endorsement">Endoso</MenuItem>
                    <MenuItem value="Payment">Pago</MenuItem>
                    <MenuItem value="Documentation">Documentación</MenuItem>
                    <MenuItem value="GeneralSupport">Soporte General</MenuItem>
                  </TextField>
                )} />
                <Controller name="priority" control={control} render={({ field }) => (
                  <TextField {...field} select label="Prioridad *" fullWidth error={!!errors.priority} helperText={errors.priority?.message ?? ' '}>
                    <MenuItem value="Low">Baja</MenuItem>
                    <MenuItem value="Medium">Media</MenuItem>
                    <MenuItem value="High">Alta</MenuItem>
                    <MenuItem value="Urgent">Urgente</MenuItem>
                  </TextField>
                )} />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Controller name="status" control={control} render={({ field }) => (
                  <TextField {...field} select label="Estado *" fullWidth error={!!errors.status} helperText={errors.status?.message ?? ' '}>
                    <MenuItem value="Pending">Pendiente</MenuItem>
                    <MenuItem value="InProgress">En Progreso</MenuItem>
                    <MenuItem value="WaitingForClient">Esperando Cliente</MenuItem>
                    <MenuItem value="WaitingForProvider">Esperando Proveedor</MenuItem>
                    <MenuItem value="Closed">Cerrado</MenuItem>
                    <MenuItem value="Cancelled">Cancelado</MenuItem>
                  </TextField>
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
                          helperText: errors.dueAt?.message ?? ' ',
                        },
                      }}
                    />
                  )}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Controller name="clientId" control={control} render={({ field }) => (
                  <Autocomplete
                    options={clients ?? []}
                    getOptionLabel={(option: ClientRaw) => option.displayName}
                    value={(clients ?? []).find((c) => c.uuid === field.value) ?? null}
                    onChange={(_, newValue) => field.onChange(newValue?.uuid ?? '')}
                    isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                    noOptionsText="Sin resultados"
                    fullWidth
                    renderInput={(params) => (
                      <TextField {...params} label="Cliente *" error={!!errors.clientId} helperText={errors.clientId?.message ?? ' '} />
                    )}
                  />
                )} />
                <Controller name="policyId" control={control} render={({ field }) => (
                  <Autocomplete
                    options={policies ?? []}
                    getOptionLabel={(option: PolicyRaw) => option.policyNumber}
                    value={(policies ?? []).find((p) => p.uuid === field.value) ?? null}
                    onChange={(_, newValue) => field.onChange(newValue?.uuid ?? '')}
                    isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                    noOptionsText="Sin resultados"
                    fullWidth
                    renderInput={(params) => (
                      <TextField {...params} label="Póliza Asociada" error={!!errors.policyId} helperText={errors.policyId?.message ?? ' '} />
                    )}
                  />
                )} />
              </Stack>

              <Controller name="assignedUserId" control={control} render={({ field }) => (
                <Autocomplete
                  options={users ?? []}
                  getOptionLabel={(option: UserRaw) => `${option.firstName} ${option.lastName} (${option.email})`}
                  value={(users ?? []).find((u) => u.uuid === field.value) ?? null}
                  onChange={(_, newValue) => field.onChange(newValue?.uuid ?? '')}
                  isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                  noOptionsText="Sin resultados"
                  fullWidth
                  renderInput={(params) => (
                    <TextField {...params} label="Responsable Asignado" error={!!errors.assignedUserId} helperText={errors.assignedUserId?.message ?? ' '} />
                  )}
                />
              )} />

              <Controller name="tagUuids" control={control} render={({ field }) => (
                <FormControl fullWidth error={!!errors.tagUuids}>
                  <InputLabel id="tags-select-label">Etiquetas</InputLabel>
                  <Select
                    {...field}
                    labelId="tags-select-label"
                    multiple
                    input={<OutlinedInput label="Etiquetas" />}
                    renderValue={(selectedUuids) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selectedUuids as string[]).map((uuid) => {
                          const tag = (tags ?? []).find((t: TagRaw) => t.uuid === uuid)
                          return <Chip key={uuid} label={tag?.name ?? uuid} size="small" sx={{ bgcolor: tag?.color ?? 'grey.300', color: '#fff' }} />
                        })}
                      </Box>
                    )}
                  >
                    {(tags ?? []).map((t: TagRaw) => (
                      <MenuItem key={t.uuid} value={t.uuid}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: t.color, mr: 1 }} />
                        {t.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
    </Stack>
  )
}
