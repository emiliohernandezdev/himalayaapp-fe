import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material'
import type { GridColDef } from '@mui/x-data-grid'
import { Edit2, MoreVertical, Plus, Trash2, UsersRound, Shield, FileText } from 'lucide-react'
import { useState, useMemo } from 'react'
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

const clientSchema = z.object({
  displayName: z.string().min(2, 'Mínimo 2 caracteres'),
  type: z.enum(['Individual', 'Company']),
  status: z.enum(['Active', 'Inactive', 'Prospect']),
  taxId: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  department: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

export function ClientsMaintenancePage() {
  const { data: clients, error, loading, refetch } = useApiQuery('clients', fetchClients)
  const canViewClients = usePermission('view_clients')
  const canManageClients = usePermission('manage_clients')
  const permissionsLoading = usePermissionLoading()
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<ClientRaw | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { data: policies } = useApiQuery('policies-for-clients-related', fetchPolicies)
  const [policiesDialogOpen, setPoliciesDialogOpen] = useState(false)

  const clientPolicies = useMemo<PolicyRaw[]>(() => {
    if (!selected) return []
    return (policies ?? []).filter((p) => p.clientUuid === selected.uuid || p.client?.uuid === selected.uuid)
  }, [policies, selected])

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { displayName: '', type: 'Individual', status: 'Active', taxId: '', email: '', phone: '', address: '', city: '', department: '' }
  })

  const openCreate = () => {
    setDialogMode('create')
    reset({ displayName: '', type: 'Individual', status: 'Active', taxId: '', email: '', phone: '', address: '', city: '', department: '' })
    setDialogOpen(true)
  }

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
        {canManageClients && (
          <Button variant="contained" startIcon={<Plus size={20} />} onClick={openCreate}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' }}>
            Nuevo cliente
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>No se pudo cargar la información de clientes.</Alert>}

      <ResponsiveDataGrid
        rows={clients ?? []}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
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
                <TextField {...field} label="Nombre Completo / Razón Social *" fullWidth error={!!errors.displayName} helperText={errors.displayName?.message ?? ' '} />
              )} />
              <Stack direction="row" spacing={2}>
                <Controller name="type" control={control} render={({ field }) => (
                  <TextField {...field} select label="Tipo" fullWidth>
                    <MenuItem value="Individual">Persona Física</MenuItem>
                    <MenuItem value="Company">Empresa</MenuItem>
                  </TextField>
                )} />
                <Controller name="status" control={control} render={({ field }) => (
                  <TextField {...field} select label="Estado" fullWidth>
                    <MenuItem value="Active">Activo</MenuItem>
                    <MenuItem value="Inactive">Inactivo</MenuItem>
                    <MenuItem value="Prospect">Prospecto</MenuItem>
                  </TextField>
                )} />
              </Stack>
              <Controller name="taxId" control={control} render={({ field }) => (
                <TextField {...field} label="NIT / DPI" fullWidth />
              )} />
              <Stack direction="row" spacing={2}>
                <Controller name="email" control={control} render={({ field }) => (
                  <TextField {...field} label="Email" fullWidth error={!!errors.email} helperText={errors.email?.message ?? ' '} />
                )} />
                <Controller name="phone" control={control} render={({ field }) => (
                  <TextField {...field} label="Teléfono" fullWidth />
                )} />
              </Stack>
              <Controller name="address" control={control} render={({ field }) => (
                <TextField {...field} label="Dirección" fullWidth />
              )} />
              <Stack direction="row" spacing={2}>
                <Controller name="city" control={control} render={({ field }) => (
                  <TextField {...field} label="Ciudad" fullWidth />
                )} />
                <Controller name="department" control={control} render={({ field }) => (
                  <TextField {...field} label="Departamento" fullWidth />
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

      {/* Policies Dialog */}
      <Dialog open={policiesDialogOpen} onClose={() => setPoliciesDialogOpen(false)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Shield size={20} color="var(--mui-palette-primary-main)" />
          Pólizas contratadas — {selected?.displayName}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'divider' }}>
          {clientPolicies.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <FileText size={48} style={{ opacity: 0.3 }} />
              <Typography color="text.secondary">Este cliente no posee pólizas contratadas actualmente.</Typography>
            </Box>
          ) : (
            <ResponsiveDataGrid
              rows={clientPolicies}
              columns={[
                { field: 'policyNumber', headerName: 'Nº Póliza', width: 140 },
                { field: 'product', headerName: 'Producto', flex: 1, minWidth: 140, valueGetter: (_v, row) => row.product?.name ?? '—' },
                { field: 'provider', headerName: 'Proveedor', flex: 1, minWidth: 140, valueGetter: (_v, row) => row.provider?.name ?? '—' },
                {
                  field: 'dates',
                  headerName: 'Vigencia',
                  width: 200,
                  valueGetter: (_v, row) => {
                    const start = row.startDate ? new Date(row.startDate).toLocaleDateString('es-GT') : '—'
                    const end = row.endDate ? new Date(row.endDate).toLocaleDateString('es-GT') : '—'
                    return `${start} al ${end}`
                  }
                },
                {
                  field: 'premiumAmount',
                  headerName: 'Prima',
                  width: 130,
                  renderCell: (params) => {
                    if (params.row.premiumAmount == null) return '—'
                    const currency = params.row.currency ?? 'USD'
                    let symbol = '$'
                    if (currency === 'GTQ') symbol = 'Q'
                    else if (currency === 'EUR') symbol = '€'
                    else if (currency !== 'USD') symbol = `${currency} `
                    return `${symbol}${Number(params.row.premiumAmount).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
                  }
                },
                {
                  field: 'status',
                  headerName: 'Estado',
                  width: 120,
                  renderCell: (params) => {
                    let label = params.row.status
                    let color: any = 'default'
                    if (params.row.status === 'Active') { label = 'Vigente'; color = 'success' }
                    else if (params.row.status === 'PendingRenewal') { label = 'Pendiente Renovación'; color = 'warning' }
                    else if (params.row.status === 'Expired') { label = 'Vencida'; color = 'error' }
                    else if (params.row.status === 'Cancelled') { label = 'Cancelada'; color = 'error' }
                    else if (params.row.status === 'Draft') { label = 'Borrador'; color = 'default' }
                    return <Chip label={label} size="small" color={color} variant="outlined" sx={{ fontWeight: 600 }} />
                  }
                }
              ]}
              getRowId={(row) => row.uuid}
              paginationModel={{ page: 0, pageSize: 5 }}
              localeText={esESGrid}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setPoliciesDialogOpen(false)} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
