import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { Edit2, FileText, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import dayjs from 'dayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { createPolicy, fetchClients, fetchPolicies, fetchProducts, fetchProviders, removePolicy, updatePolicy } from '../../api/maintenanceApi'
import type { PolicyRaw, ClientRaw, ProviderRaw, ProductRaw } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { esESGrid, policyStatusLabels, t } from '../../utils/enumLabels'

const policySchema = z.object({
  policyNumber: z.string().min(2, 'El número de póliza es requerido'),
  status: z.enum(['Active', 'Draft', 'Expired', 'Cancelled', 'PendingRenewal']),
  startDate: z.string().min(1, 'La fecha de inicio es requerida'),
  endDate: z.string().min(1, 'La fecha de vencimiento es requerida'),
  insuredAmount: z.any().optional(),
  premiumAmount: z.any().optional(),
  currency: z.string().min(1, 'Selecciona una moneda'),
  clientUuid: z.string().min(1, 'Selecciona un cliente'),
  providerUuid: z.string().min(1, 'Selecciona un proveedor'),
  productUuid: z.string().min(1, 'Selecciona un producto'),
  notes: z.string().optional(),
})

type PolicyFormData = z.infer<typeof policySchema>

export function PoliciesMaintenancePage() {
  const { data: policies, error, loading, refetch } = useApiQuery('policies', fetchPolicies)
  const { data: clients } = useApiQuery('clients-for-select', fetchClients)
  const { data: providers } = useApiQuery('providers-for-select', fetchProviders)
  const { data: products } = useApiQuery('products-for-select', fetchProducts)

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<PolicyRaw | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PolicyFormData>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      policyNumber: '',
      status: 'Draft',
      startDate: '',
      endDate: '',
      insuredAmount: undefined,
      premiumAmount: undefined,
      currency: 'GTQ',
      clientUuid: '',
      providerUuid: '',
      productUuid: '',
      notes: '',
    },
  })

  const openCreate = () => {
    setDialogMode('create')
    reset({
      policyNumber: '',
      status: 'Draft',
      startDate: '',
      endDate: '',
      insuredAmount: undefined,
      premiumAmount: undefined,
      currency: 'GTQ',
      clientUuid: '',
      providerUuid: '',
      productUuid: '',
      notes: '',
    })
    setDialogOpen(true)
  }

  const openEdit = () => {
    if (!selected) return
    setAnchorEl(null)
    setDialogMode('edit')
    reset({
      policyNumber: selected.policyNumber,
      status: selected.status as any,
      startDate: selected.startDate,
      endDate: selected.endDate,
      insuredAmount: selected.insuredAmount ? Number(selected.insuredAmount) : undefined,
      premiumAmount: selected.premiumAmount ? Number(selected.premiumAmount) : undefined,
      currency: selected.currency,
      clientUuid: selected.client?.uuid ?? '',
      providerUuid: selected.provider?.uuid ?? '',
      productUuid: selected.product?.uuid ?? '',
      notes: selected.notes ?? '',
    })
    setDialogOpen(true)
  }

  const openDelete = () => {
    setAnchorEl(null)
    setDeleteDialogOpen(true)
  }

  const onSubmit = async (data: any) => {
    try {
      if (dialogMode === 'create') {
        await createPolicy(data)
        toast.success('Póliza creada exitosamente')
      } else {
        if (!selected) return
        await updatePolicy({ uuid: selected.uuid, ...data })
        toast.success('Póliza actualizada exitosamente')
      }
      setDialogOpen(false)
      refetch()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la póliza')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setIsDeleting(true)
    try {
      await removePolicy(selected.uuid)
      toast.success('Póliza eliminada exitosamente')
      setDeleteDialogOpen(false)
      refetch()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar la póliza')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return { bgcolor: 'success.main', color: 'success.contrastText' }
      case 'PendingRenewal': return { bgcolor: 'warning.main', color: 'warning.contrastText' }
      case 'Expired': case 'Cancelled': return { bgcolor: 'error.main', color: 'error.contrastText' }
      default: return { bgcolor: 'action.disabledBackground', color: 'text.secondary' }
    }
  }

  const columns: GridColDef[] = [
    { field: 'policyNumber', headerName: 'Nº Póliza', width: 160 },
    { field: 'client', headerName: 'Cliente', flex: 1, minWidth: 180, valueGetter: (_v, row) => row.client?.displayName ?? '—' },
    { field: 'product', headerName: 'Producto', flex: 1, minWidth: 150, valueGetter: (_v, row) => row.product?.name ?? '—' },
    { field: 'provider', headerName: 'Proveedor', width: 160, valueGetter: (_v, row) => row.provider?.name ?? '—' },
    { field: 'startDate', headerName: 'Inicio', width: 120 },
    { field: 'endDate', headerName: 'Vencimiento', width: 120 },
    { field: 'currency', headerName: 'Moneda', width: 80 },
    {
      field: 'premiumAmount', headerName: 'Prima', width: 120, type: 'number',
      valueFormatter: (value) => value != null ? `$${Number(value).toLocaleString()}` : '—',
    },
    {
      field: 'status', headerName: 'Estado', width: 170,
      renderCell: (params) => {
        const colors = getStatusColor(params.row.status)
        return <Chip label={t(policyStatusLabels, params.row.status)} size="small" sx={{ fontWeight: 600, ...colors }} />
      },
    },
    {
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); setSelected(params.row) }} sx={{ color: 'text.secondary' }}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ]

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} className="flex-wrap gap-4">
        <Box sx={{ flexGrow: 1 }}>
          <PageHeader title="Pólizas" description="Contratos, vigencias, documentos y renovaciones." actionLabel="" icon={FileText} />
        </Box>
        <Button variant="contained" startIcon={<Plus size={20} />} onClick={openCreate}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' }}>
          Nueva póliza
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>No se pudo cargar la información de pólizas.</Alert>}

      <Box sx={{ height: 600, width: '100%', bgcolor: 'background.paper', borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
        <DataGrid
          rows={policies ?? []}
          columns={columns}
          getRowId={(row) => row.uuid}
          loading={loading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          localeText={esESGrid}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, color: 'text.secondary' },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary' },
            '& .MuiDataGrid-footerContainer': { borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' },
          }}
        />
      </Box>

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { elevation: 0, sx: { borderRadius: 3, minWidth: 140, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } } }}>
        <MenuItem onClick={openEdit} sx={{ color: 'text.primary' }}>
          <Edit2 size={16} className="mr-2" style={{ opacity: 0.7 }} /> Editar
        </MenuItem>
        <MenuItem onClick={openDelete} sx={{ color: 'error.main' }}>
          <Trash2 size={16} className="mr-2" /> Eliminar
        </MenuItem>
      </Menu>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onClose={() => !isSubmitting && setDialogOpen(false)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogTitle sx={{ fontWeight: 700, color: 'text.primary' }}>
            {dialogMode === 'create' ? 'Nueva Póliza' : 'Editar Póliza'}
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'divider' }}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={2}>
                <Controller name="policyNumber" control={control} render={({ field }) => (
                  <TextField {...field} label="Número de Póliza *" fullWidth error={!!errors.policyNumber} helperText={errors.policyNumber?.message ?? ' '} />
                )} />
                <Controller name="status" control={control} render={({ field }) => (
                  <TextField {...field} select label="Estado *" fullWidth error={!!errors.status} helperText={errors.status?.message ?? ' '}>
                    <MenuItem value="Draft">Borrador</MenuItem>
                    <MenuItem value="Active">Vigente</MenuItem>
                    <MenuItem value="PendingRenewal">Pendiente Renovación</MenuItem>
                    <MenuItem value="Expired">Vencida</MenuItem>
                    <MenuItem value="Cancelled">Cancelada</MenuItem>
                  </TextField>
                )} />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Controller name="clientUuid" control={control} render={({ field }) => (
                  <TextField {...field} select label="Cliente *" fullWidth error={!!errors.clientUuid} helperText={errors.clientUuid?.message ?? ' '}>
                    <MenuItem value="" disabled>Selecciona un cliente</MenuItem>
                    {(clients ?? []).map((c: ClientRaw) => (
                      <MenuItem key={c.uuid} value={c.uuid}>{c.displayName}</MenuItem>
                    ))}
                  </TextField>
                )} />
                <Controller name="providerUuid" control={control} render={({ field }) => (
                  <TextField {...field} select label="Proveedor *" fullWidth error={!!errors.providerUuid} helperText={errors.providerUuid?.message ?? ' '}>
                    <MenuItem value="" disabled>Selecciona un proveedor</MenuItem>
                    {(providers ?? []).map((p: ProviderRaw) => (
                      <MenuItem key={p.uuid} value={p.uuid}>{p.name}</MenuItem>
                    ))}
                  </TextField>
                )} />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Controller name="productUuid" control={control} render={({ field }) => (
                  <TextField {...field} select label="Producto *" fullWidth error={!!errors.productUuid} helperText={errors.productUuid?.message ?? ' '}>
                    <MenuItem value="" disabled>Selecciona un producto</MenuItem>
                    {(products ?? []).map((prod: ProductRaw) => (
                      <MenuItem key={prod.uuid} value={prod.uuid}>{prod.name}</MenuItem>
                    ))}
                  </TextField>
                )} />
                <Controller name="currency" control={control} render={({ field }) => (
                  <TextField {...field} select label="Moneda *" fullWidth error={!!errors.currency} helperText={errors.currency?.message ?? ' '}>
                    <MenuItem value="GTQ">Quetzales (GTQ)</MenuItem>
                    <MenuItem value="USD">Dólares (USD)</MenuItem>
                  </TextField>
                )} />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field: { onChange, value, ...restField } }) => (
                    <DatePicker
                      {...restField}
                      label="Fecha de Inicio *"
                      value={value ? dayjs(value) : null}
                      onChange={(newValue) => {
                        onChange(newValue ? newValue.toISOString() : '')
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.startDate,
                          helperText: (errors.startDate as any)?.message ?? ' ',
                        },
                      }}
                    />
                  )}
                />
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field: { onChange, value, ...restField } }) => (
                    <DatePicker
                      {...restField}
                      label="Fecha de Vencimiento *"
                      value={value ? dayjs(value) : null}
                      onChange={(newValue) => {
                        onChange(newValue ? newValue.toISOString() : '')
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.endDate,
                          helperText: (errors.endDate as any)?.message ?? ' ',
                        },
                      }}
                    />
                  )}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Controller name="insuredAmount" control={control} render={({ field }) => (
                  <TextField {...field} type="number" label="Suma Asegurada" fullWidth error={!!errors.insuredAmount} helperText={(errors.insuredAmount as any)?.message ?? ' '} />
                )} />
                <Controller name="premiumAmount" control={control} render={({ field }) => (
                  <TextField {...field} type="number" label="Prima Anual" fullWidth error={!!errors.premiumAmount} helperText={(errors.premiumAmount as any)?.message ?? ' '} />
                )} />
              </Stack>

              <Controller name="notes" control={control} render={({ field }) => (
                <TextField {...field} label="Notas / Observaciones" multiline rows={3} fullWidth error={!!errors.notes} helperText={(errors.notes as any)?.message ?? ' '} />
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
            ¿Eliminar la póliza <strong>{selected?.policyNumber}</strong>? Esta acción no se puede deshacer.
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
