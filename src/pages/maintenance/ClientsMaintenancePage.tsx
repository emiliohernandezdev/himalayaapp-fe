import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { Edit2, MoreVertical, Plus, Trash2, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { createClient, fetchClients, removeClient, updateClient } from '../../api/maintenanceApi'
import type { ClientRaw } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { clientStatusLabels, clientTypeLabels, esESGrid, t } from '../../utils/enumLabels'

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
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<ClientRaw | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
    { field: 'type', headerName: 'Tipo', width: 150, valueGetter: (_v, row) => t(clientTypeLabels, row.type) },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180, valueGetter: (_v, row) => row.email ?? '—' },
    { field: 'phone', headerName: 'Teléfono', width: 140, valueGetter: (_v, row) => row.phone ?? '—' },
    { field: 'taxId', headerName: 'NIT / DPI', width: 140, valueGetter: (_v, row) => row.taxId ?? '—' },
    {
      field: 'status', headerName: 'Estado', width: 130,
      renderCell: (params) => (
        <Chip label={t(clientStatusLabels, params.row.status)} size="small" sx={{
          fontWeight: 600,
          bgcolor: params.row.status === 'Active' ? 'success.main' : params.row.status === 'Prospect' ? 'warning.main' : 'action.disabledBackground',
          color: params.row.status === 'Active' ? 'success.contrastText' : params.row.status === 'Prospect' ? 'warning.contrastText' : 'text.secondary',
        }} />
      ),
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
          <PageHeader title="Clientes" description="Personas, empresas, contactos y datos fiscales." actionLabel="" icon={UsersRound} />
        </Box>
        <Button variant="contained" startIcon={<Plus size={20} />} onClick={openCreate}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' }}>
          Nuevo cliente
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>No se pudo cargar la información de clientes.</Alert>}

      <Box sx={{ height: 600, width: '100%', bgcolor: 'background.paper', borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
        <DataGrid
          rows={clients ?? []}
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

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { elevation: 0, sx: { borderRadius: 3, minWidth: 140, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } } }}>
        <MenuItem onClick={openEdit} sx={{ color: 'text.primary' }}><Edit2 size={16} className="mr-2" style={{ opacity: 0.7 }} /> Editar</MenuItem>
        <MenuItem onClick={openDelete} sx={{ color: 'error.main' }}><Trash2 size={16} className="mr-2" /> Eliminar</MenuItem>
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
    </Stack>
  )
}
