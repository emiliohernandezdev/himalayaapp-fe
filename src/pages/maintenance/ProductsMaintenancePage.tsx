import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { Edit2, MoreVertical, PackageCheck, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { createProduct, fetchProducts, fetchProviders, removeProduct, updateProduct } from '../../api/maintenanceApi'
import type { ProductRaw, ProviderRaw } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { esESGrid, productCategoryLabels, productStatusLabels, t } from '../../utils/enumLabels'

const productSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido (mínimo 2 caracteres)'),
  providerUuid: z.string().min(1, 'Debes seleccionar un proveedor'),
  category: z.enum(['Insurance', 'SuretyBond', 'Assistance']),
  status: z.enum(['Active', 'Inactive', 'Draft']),
  lineOfBusiness: z.string().optional(),
  description: z.string().optional(),
})

type ProductFormData = z.infer<typeof productSchema>

export function ProductsMaintenancePage() {
  const { data: products, error, loading, refetch } = useApiQuery('products', fetchProducts)
  const { data: providers } = useApiQuery('providers-for-select', fetchProviders)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<ProductRaw | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', category: 'Insurance', status: 'Active', lineOfBusiness: '', description: '', providerUuid: '' }
  })

  const openCreate = () => {
    setDialogMode('create')
    reset({ name: '', category: 'Insurance', status: 'Active', lineOfBusiness: '', description: '', providerUuid: '' })
    setDialogOpen(true)
  }

  const openEdit = () => {
    if (!selected) return
    setDialogMode('edit')
    reset({
      name: selected.name,
      category: selected.category as ProductFormData['category'],
      status: selected.status as ProductFormData['status'],
      lineOfBusiness: selected.lineOfBusiness ?? '',
      description: selected.description ?? '',
      providerUuid: selected.providerUuid,
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
        await createProduct(data)
        toast.success('Producto creado exitosamente')
      } else if (selected) {
        await updateProduct({ uuid: selected.uuid, ...data })
        toast.success('Producto actualizado exitosamente')
      }
      setDialogOpen(false)
      refetch()
    } catch {
      toast.error('Error al guardar el producto')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setIsDeleting(true)
    try {
      await removeProduct(selected.uuid)
      toast.success('Producto eliminado')
      setDeleteDialogOpen(false)
      refetch()
    } catch {
      toast.error('Error al eliminar el producto')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nombre', flex: 1, minWidth: 200 },
    {
      field: 'provider', headerName: 'Proveedor', flex: 1, minWidth: 150,
      valueGetter: (_value, row) => row.provider?.name ?? '(sin proveedor)',
    },
    {
      field: 'category', headerName: 'Categoría', width: 150,
      valueGetter: (_value, row) => t(productCategoryLabels, row.category),
    },
    {
      field: 'status', headerName: 'Estado', width: 130,
      renderCell: (params) => (
        <Chip
          label={t(productStatusLabels, params.row.status)}
          size="small"
          sx={{
            fontWeight: 600,
            bgcolor: params.row.status === 'Active' ? 'success.main' : params.row.status === 'Draft' ? 'warning.main' : 'action.disabledBackground',
            color: params.row.status === 'Active' ? 'success.contrastText' : params.row.status === 'Draft' ? 'warning.contrastText' : 'text.secondary',
          }}
        />
      ),
    },
    {
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setSelected(params.row) }} sx={{ color: 'text.secondary' }}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ]

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} className="flex-wrap gap-4">
        <Box sx={{ flexGrow: 1 }}>
          <PageHeader title="Productos" description="Productos de seguro asociados a proveedores y ramos." actionLabel="" icon={PackageCheck} />
        </Box>
        <Button variant="contained" startIcon={<Plus size={20} />} onClick={openCreate}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' }}>
          Nuevo producto
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>No se pudo cargar la información de productos.</Alert>}

      <Box sx={{ height: 580, width: '100%', bgcolor: 'background.paper', borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
        <DataGrid
          rows={products ?? []}
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

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { elevation: 0, sx: { borderRadius: 3, minWidth: 140, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } } }}>
        <MenuItem onClick={openEdit} sx={{ color: 'text.primary' }}>
          <Edit2 size={16} className="mr-2" style={{ opacity: 0.7 }} /> Editar
        </MenuItem>
        <MenuItem onClick={openDelete} sx={{ color: 'error.main' }}>
          <Trash2 size={16} className="mr-2" /> Eliminar
        </MenuItem>
      </Menu>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => !isSubmitting && setDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogTitle sx={{ fontWeight: 700, color: 'text.primary' }}>
            {dialogMode === 'create' ? 'Nuevo Producto' : 'Editar Producto'}
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'divider' }}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Controller name="name" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  label="Nombre del Producto *"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message ?? ' '}
                />
              )} />

              <Controller name="providerUuid" control={control} render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Proveedor *"
                  fullWidth
                  error={!!errors.providerUuid}
                  helperText={errors.providerUuid?.message ?? ' '}
                >
                  <MenuItem value="" disabled>Selecciona un proveedor</MenuItem>
                  {(providers ?? []).map((p: ProviderRaw) => (
                    <MenuItem key={p.uuid} value={p.uuid}>{p.name}</MenuItem>
                  ))}
                </TextField>
              )} />

              <Stack direction="row" spacing={2}>
                <Controller name="category" control={control} render={({ field }) => (
                  <TextField {...field} select label="Categoría *" fullWidth error={!!errors.category} helperText={errors.category?.message ?? ' '}>
                    <MenuItem value="Insurance">Seguros</MenuItem>
                    <MenuItem value="SuretyBond">Fianzas</MenuItem>
                    <MenuItem value="Assistance">Asistencias</MenuItem>
                  </TextField>
                )} />

                <Controller name="status" control={control} render={({ field }) => (
                  <TextField {...field} select label="Estado" fullWidth helperText=" ">
                    <MenuItem value="Active">Activo</MenuItem>
                    <MenuItem value="Inactive">Inactivo</MenuItem>
                    <MenuItem value="Draft">Borrador</MenuItem>
                  </TextField>
                )} />
              </Stack>

              <Controller name="lineOfBusiness" control={control} render={({ field }) => (
                <TextField {...field} label="Línea de Negocio" fullWidth helperText=" " />
              )} />

              <Controller name="description" control={control} render={({ field }) => (
                <TextField {...field} label="Descripción" fullWidth multiline rows={3} helperText=" " />
              )} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={isSubmitting} sx={{ color: 'text.secondary' }}>
              Cancelar
            </Button>
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
      <Dialog open={deleteDialogOpen} onClose={() => !isDeleting && setDeleteDialogOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3, maxWidth: 420 } } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Trash2 size={20} color="var(--mui-palette-error-main)" /> Eliminar Producto
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary', mt: 1 }}>
            ¿Eliminar el producto <strong>{selected?.name}</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
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
