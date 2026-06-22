import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, TextField, Typography, alpha } from '@mui/material'
import type { GridColDef, GridRowSelectionModel } from '@mui/x-data-grid'
import { Edit2, MoreVertical, Trash2, UsersRound, Shield, FileText, Calendar, Building2, CreditCard } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { createClient, fetchClients, removeClient, updateClient, fetchPolicies } from '../../api/maintenanceApi'
import type { ClientRaw, PolicyRaw } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { ResponsiveDataGrid } from '../../components/ResponsiveDataGrid'
import { usePermission, usePermissionLoading } from '../../hooks/usePermission'
import { clientStatusLabels, clientTypeLabels, esESGrid, t } from '../../utils/enumLabels'
import { MaintenanceSkeleton } from '../../components/MaintenanceSkeleton'
import { MaintenanceFab } from '../../components/MaintenanceFab'
import { createEmptyGridSelectionModel, getSelectedGridIds } from '../../utils/gridSelection'

const clientSchema = z.object({
  displayName: z.string().trim().min(2, 'El nombre completo / razón social es requerido (mínimo 2 caracteres)'),
  type: z.enum(['Individual', 'Company']),
  status: z.enum(['Active', 'Inactive', 'Prospect']),
  taxId: z.string().trim().min(1, 'El NIT / DPI es requerido'),
  email: z.string().trim().min(1, 'El correo electrónico es requerido').email('Ingresa un correo electrónico válido'),
  phone: z.string().trim().min(8, 'El teléfono es requerido (mínimo 8 dígitos)'),
  address: z.string().trim().min(1, 'La dirección es requerida'),
  city: z.string().trim().min(1, 'La ciudad es requerida'),
  department: z.string().trim().min(1, 'El departamento es requerido'),
})

type ClientFormData = z.infer<typeof clientSchema>

export function ClientsMaintenancePage() {
  const { data: clients, error, loading, refetch } = useApiQuery('clients', fetchClients)
  const canViewClients = usePermission('view_clients')
  const canManageClients = usePermission('manage_clients')
  const permissionsLoading = usePermissionLoading()
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>(() => createEmptyGridSelectionModel())

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<ClientRaw | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { data: policies } = useApiQuery('policies-for-clients-related', fetchPolicies)
  const [policiesDialogOpen, setPoliciesDialogOpen] = useState(false)

  const clientPolicies = useMemo<PolicyRaw[]>(() => {
    if (!selected) return []
    return (policies ?? []).filter((p) => p.clientUuid === selected.uuid || p.client?.uuid === selected.uuid)
  }, [policies, selected])
  const selectedIds = useMemo(
    () => getSelectedGridIds(rowSelectionModel, (clients ?? []).map((client) => client.uuid)),
    [clients, rowSelectionModel],
  )
  const selectedCount = selectedIds.length

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { displayName: '', type: 'Individual', status: 'Active', taxId: '', email: '', phone: '', address: '', city: '', department: '' }
  })

  const openCreate = () => {
    setDialogMode('create')
    reset({ displayName: '', type: 'Individual', status: 'Active', taxId: '', email: '', phone: '', address: '', city: '', department: '' })
    setDialogOpen(true)
  }

  useEffect(() => {
    const handleSherpaAction = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.type === 'create-client') {
        openCreate()
      }
    }
    window.addEventListener('sherpa-action', handleSherpaAction)
    return () => window.removeEventListener('sherpa-action', handleSherpaAction)
  }, [reset])

  const openEdit = () => {
    if (!selected) return
    setDialogMode('edit')
    reset({
      displayName: selected.displayName,
      type: selected.type as ClientFormData['type'],
      status: selected.status as ClientFormData['status'],
      taxId: selected.taxId ?? '',
      email: selected.email ?? '',
      phone: selected.phone ?? '',
      address: selected.address ?? '',
      city: selected.city ?? '',
      department: selected.department ?? '',
    })
    setDialogOpen(true)
    setAnchorEl(null)
  }

  const openDelete = () => {
    if (!selected) return
    setDeleteDialogOpen(true)
    setAnchorEl(null)
  }

  const onSubmit = async (data: any) => {
    try {
      if (dialogMode === 'create') {
        await createClient(data)
        toast.success('Cliente creado exitosamente')
      } else if (selected) {
        await updateClient({ uuid: selected.uuid, ...data })
        toast.success('Cliente actualizado')
      }
      setDialogOpen(false)
      refetch()
    } catch {
      toast.error('Error al guardar el cliente')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setIsDeleting(true)
    try {
      await removeClient(selected.uuid)
      toast.success('Cliente eliminado')
      setDeleteDialogOpen(false)
      refetch()
    } catch {
      toast.error('Error al eliminar el cliente')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setIsDeleting(true)
    try {
      await Promise.all(selectedIds.map((uuid) => removeClient(uuid)))
      toast.success(`${selectedIds.length} clientes eliminados`)
      setBulkDeleteDialogOpen(false)
      setRowSelectionModel(createEmptyGridSelectionModel())
      refetch()
    } catch {
      toast.error('Error al eliminar los clientes seleccionados')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: GridColDef[] = [
    { field: 'displayName', headerName: 'Nombre', flex: 1, minWidth: 200 },
    {
      field: 'type',
      headerName: 'Tipo',
      width: 150,
      type: 'singleSelect',
      valueOptions: Object.entries(clientTypeLabels).map(([value, label]) => ({ value, label })),
      valueFormatter: (value) => t(clientTypeLabels, value as string),
    },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180, valueGetter: (_v, row) => row.email ?? '—' },
    { field: 'phone', headerName: 'Teléfono', width: 140, valueGetter: (_v, row) => row.phone ?? '—' },
    { field: 'taxId', headerName: 'NIT / DPI', width: 140, valueGetter: (_v, row) => row.taxId ?? '—' },
    {
      field: 'policiesCount',
      headerName: 'Pólizas',
      width: 120,
      renderCell: (params) => {
        const count = (policies ?? []).filter((p) => p.clientUuid === params.row.uuid || p.client?.uuid === params.row.uuid).length
        return (
          <Button
            size="small"
            variant="text"
            onClick={() => { setSelected(params.row); setPoliciesDialogOpen(true) }}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            {count} {count === 1 ? 'póliza' : 'pólizas'}
          </Button>
        )
      }
    },
    {
      field: 'status', headerName: 'Estado', width: 130, type: 'singleSelect',
      valueOptions: Object.entries(clientStatusLabels).map(([value, label]) => ({ value, label })),
      renderCell: (params) => {
        const isOptActive = params.row.status === 'Active' || params.row.status === 'active'
        const isOptProspect = params.row.status === 'Prospect' || params.row.status === 'prospect'
        return (
          <Chip label={t(clientStatusLabels, params.row.status)} size="small" sx={{
            fontWeight: 600,
            bgcolor: isOptActive ? 'success.main' : isOptProspect ? 'warning.main' : 'action.disabledBackground',
            color: isOptActive ? 'success.contrastText' : isOptProspect ? 'warning.contrastText' : 'text.secondary',
          }} />
        )
      },
    },
    ...(canManageClients ? [{
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: (params: any) => (
        <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); setSelected(params.row) }} sx={{ color: 'text.secondary' }}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    }] : []),
  ]

  if (permissionsLoading) {
    return <MaintenanceSkeleton layout="table" />
  }

  if (!canViewClients) {
    return (
      <Alert severity="error" sx={{ mt: 4, borderRadius: 2 }}>
        Acceso denegado. No tiene permisos para ver los clientes.
      </Alert>
    )
  }

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} className="flex-wrap gap-4">
        <Box sx={{ flexGrow: 1 }}>
          <PageHeader title="Clientes" description="Personas, empresas, contactos y datos fiscales." actionLabel="" icon={UsersRound} />
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>No se pudo cargar la información de clientes.</Alert>}

      <ResponsiveDataGrid
        rows={clients ?? []}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        checkboxSelection={canManageClients}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={setRowSelectionModel}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        localeText={esESGrid}
      />

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { elevation: 0, sx: { borderRadius: 3, minWidth: 140, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } } }}>
        <MenuItem onClick={() => { setPoliciesDialogOpen(true); setAnchorEl(null) }} sx={{ color: 'primary.main' }}>
          <Shield size={16} className="mr-2" style={{ opacity: 0.7 }} /> Ver Pólizas
        </MenuItem>
        {canManageClients && <MenuItem onClick={openEdit} sx={{ color: 'text.primary' }}><Edit2 size={16} className="mr-2" style={{ opacity: 0.7 }} /> Editar</MenuItem>}
        {canManageClients && <MenuItem onClick={openDelete} sx={{ color: 'error.main' }}><Trash2 size={16} className="mr-2" /> Eliminar</MenuItem>}
      </Menu>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onClose={() => !isSubmitting && setDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogTitle sx={{ fontWeight: 700, color: 'text.primary' }}>
            {dialogMode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'divider' }}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Controller name="displayName" control={control} render={({ field }) => (
                <TextField {...field} type="text" label="Nombre Completo / Razón Social *" fullWidth error={!!errors.displayName} helperText={errors.displayName?.message ?? ' '} />
              )} />
              <Stack direction="row" spacing={2}>
                <Controller name="type" control={control} render={({ field }) => (
                  <TextField {...field} select label="Tipo *" fullWidth error={!!errors.type} helperText={errors.type?.message ?? ' '}>
                    <MenuItem value="Individual">Persona Física</MenuItem>
                    <MenuItem value="Company">Empresa</MenuItem>
                  </TextField>
                )} />
                <Controller name="status" control={control} render={({ field }) => (
                  <TextField {...field} select label="Estado *" fullWidth error={!!errors.status} helperText={errors.status?.message ?? ' '}>
                    <MenuItem value="Active">Activo</MenuItem>
                    <MenuItem value="Inactive">Inactivo</MenuItem>
                    <MenuItem value="Prospect">Prospecto</MenuItem>
                  </TextField>
                )} />
              </Stack>
              <Controller name="taxId" control={control} render={({ field }) => (
                <TextField {...field} type="text" label="NIT / DPI *" fullWidth error={!!errors.taxId} helperText={errors.taxId?.message ?? ' '} />
              )} />
              <Stack direction="row" spacing={2}>
                <Controller name="email" control={control} render={({ field }) => (
                  <TextField {...field} type="email" label="Email *" fullWidth error={!!errors.email} helperText={errors.email?.message ?? ' '} />
                )} />
                <Controller name="phone" control={control} render={({ field }) => (
                  <TextField {...field} type="tel" label="Teléfono *" fullWidth error={!!errors.phone} helperText={errors.phone?.message ?? ' '} />
                )} />
              </Stack>
              <Controller name="address" control={control} render={({ field }) => (
                <TextField {...field} type="text" label="Dirección *" fullWidth error={!!errors.address} helperText={errors.address?.message ?? ' '} />
              )} />
              <Stack direction="row" spacing={2}>
                <Controller name="city" control={control} render={({ field }) => (
                  <TextField {...field} type="text" label="Ciudad *" fullWidth error={!!errors.city} helperText={errors.city?.message ?? ' '} />
                )} />
                <Controller name="department" control={control} render={({ field }) => (
                  <TextField {...field} type="text" label="Departamento *" fullWidth error={!!errors.department} helperText={errors.department?.message ?? ' '} />
                )} />
              </Stack>
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

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3, maxWidth: 400 } } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 size={20} color="var(--mui-palette-error-main)" /> Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary', mt: 1 }}>
            ¿Eliminar al cliente <strong>{selected?.displayName}</strong>?
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
          <Trash2 size={20} color="var(--mui-palette-error-main)" /> Eliminar clientes
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary', mt: 1 }}>
            ¿Eliminar <strong>{selectedCount}</strong> clientes seleccionados? Esta acción no se puede deshacer.
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

      {/* Policies Dialog */}
      <Dialog open={policiesDialogOpen} onClose={() => setPoliciesDialogOpen(false)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3, backgroundImage: 'none' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5, pt: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 2.5, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
            <Shield size={22} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Pólizas Contratadas</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>Cliente: {selected?.displayName}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 3 }}>
          {clientPolicies.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <FileText size={48} style={{ opacity: 0.2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }} color="text.secondary">Sin pólizas registradas</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>Este cliente no posee pólizas contratadas actualmente en el sistema.</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2.5,
                maxHeight: '60vh',
                overflowY: 'auto',
                pr: { xs: 0.5, sm: 1 },
                py: 0.5,
                // Custom scrollbar
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': { bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.15), borderRadius: 3 }
              }}
            >
              {clientPolicies.map((policy) => {
                const start = policy.startDate ? new Date(policy.startDate).toLocaleDateString('es-GT') : '—'
                const end = policy.endDate ? new Date(policy.endDate).toLocaleDateString('es-GT') : '—'
                
                const currency = policy.currency ?? 'USD'
                let symbol = '$'
                if (currency === 'GTQ') symbol = 'Q'
                else if (currency === 'EUR') symbol = '€'
                else if (currency !== 'USD') symbol = `${currency} `
                const formattedPremium = policy.premiumAmount != null
                  ? `${symbol}${Number(policy.premiumAmount).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
                  : '—'

                let statusLabel = policy.status
                let statusColor: any = 'default'
                if (policy.status === 'Active' || policy.status === 'active') { statusLabel = 'Vigente'; statusColor = 'success' }
                else if (policy.status === 'PendingRenewal') { statusLabel = 'Pendiente Renovación'; statusColor = 'warning' }
                else if (policy.status === 'Expired') { statusLabel = 'Vencida'; statusColor = 'error' }
                else if (policy.status === 'Cancelled') { statusLabel = 'Cancelada'; statusColor = 'error' }
                else if (policy.status === 'Draft') { statusLabel = 'Borrador'; statusColor = 'default' }

                return (
                  <Box
                    key={policy.uuid}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderLeft: '4px solid',
                      borderLeftColor: `${statusColor}.main`,
                      bgcolor: 'background.paper',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        borderColor: 'divider',
                        borderLeftColor: `${statusColor}.main`,
                        transform: 'translateY(-2px)',
                        boxShadow: (theme) => theme.palette.mode === 'light'
                          ? '0 12px 20px -8px rgba(15, 23, 42, 0.08)'
                          : '0 12px 20px -8px rgba(0, 0, 0, 0.4)',
                      }
                    }}
                  >
                    {/* Header: Policy Number & Status */}
                    <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
                          Nº Póliza
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.01em' }}>
                          {policy.policyNumber}
                        </Typography>
                      </Box>
                      <Chip
                        label={statusLabel}
                        size="small"
                        color={statusColor}
                        sx={{ fontWeight: 700, fontSize: '0.75rem', borderRadius: 1.5 }}
                      />
                    </Box>

                    <Stack spacing={1.5} sx={{ pt: 2, borderTop: '1px solid', borderColor: (theme) => alpha(theme.palette.divider, 0.5) }}>
                      {/* Product Name */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 1, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06), color: 'primary.main', flexShrink: 0 }}>
                          <FileText size={14} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>Producto</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {policy.product?.name ?? '—'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Provider Name */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 1, bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.06), color: 'secondary.main', flexShrink: 0 }}>
                          <Building2 size={14} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>Aseguradora</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {policy.provider?.name ?? '—'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Row for dates & cost */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 2, pt: 1 }}>
                        {/* Dates */}
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Vigencia</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Calendar size={13} style={{ opacity: 0.6 }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                              {start} al {end}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Cost */}
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Prima Anual</Typography>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <CreditCard size={13} style={{ opacity: 0.6 }} />
                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                              {formattedPremium}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Stack>
                  </Box>
                )
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: (theme) => theme.palette.mode === 'light' ? '#fdfdfd' : 'transparent' }}>
          <Button onClick={() => setPoliciesDialogOpen(false)} variant="outlined" sx={{ minWidth: 100, borderRadius: 2 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {canManageClients && (
        <MaintenanceFab
          label={selectedCount > 0 ? `Eliminar ${selectedCount} clientes` : 'Nuevo cliente'}
          onClick={selectedCount > 0 ? () => setBulkDeleteDialogOpen(true) : openCreate}
          icon={selectedCount > 0 ? <Trash2 size={24} /> : undefined}
          color={selectedCount > 0 ? 'error' : 'primary'}
        />
      )}
    </Stack>
  )
}
