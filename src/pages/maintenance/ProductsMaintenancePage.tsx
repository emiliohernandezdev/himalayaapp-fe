import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, TextField, Typography } from '@mui/material'
import type { GridColDef, GridRowSelectionModel } from '@mui/x-data-grid'
import { Edit2, MoreVertical, PackageCheck, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { createProduct, fetchProducts, fetchProviders, removeProduct, updateProduct } from '../../api/maintenanceApi'
import type { ProductRaw, ProviderRaw } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { ResponsiveDataGrid } from '../../components/ResponsiveDataGrid'
import { usePermission, usePermissionLoading } from '../../hooks/usePermission'
import { esESGrid, productCategoryLabels, productStatusLabels, t } from '../../utils/enumLabels'
import { MaintenanceSkeleton } from '../../components/MaintenanceSkeleton'
import { MaintenanceFab } from '../../components/MaintenanceFab'
import { createEmptyGridSelectionModel, getSelectedGridIds } from '../../utils/gridSelection'

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (val === '' ? undefined : val), schema) as z.ZodType<z.infer<T> | undefined, any, any>

const productSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido (mínimo 2 caracteres)'),
  providerUuid: z.string().min(1, 'Debes seleccionar un proveedor'),
  category: z.enum(['Insurance', 'SuretyBond', 'Assistance']),
  status: z.enum(['Active', 'Inactive', 'Draft']),
  lineOfBusiness: emptyToUndefined(z.string().optional()),
  description: emptyToUndefined(z.string().optional()),
})

type ProductFormData = z.infer<typeof productSchema>

export function ProductsMaintenancePage() {
  const { data: products, error, loading, refetch } = useApiQuery('products', fetchProducts)
  const canViewProducts = usePermission('view_products')
  const canManageProducts = usePermission('manage_products')
  const { data: providers } = useApiQuery('providers-for-select', fetchProviders)
  const permissionsLoading = usePermissionLoading()
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>(() => createEmptyGridSelectionModel())

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<ProductRaw | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const selectedIds = useMemo(
    () => getSelectedGridIds(rowSelectionModel, (products ?? []).map((product) => product.uuid)),
    [products, rowSelectionModel],
  )
  const selectedCount = selectedIds.length

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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setIsDeleting(true)
    try {
      await Promise.all(selectedIds.map((uuid) => removeProduct(uuid)))
      toast.success(`${selectedIds.length} productos eliminados`)
      setBulkDeleteDialogOpen(false)
      setRowSelectionModel(createEmptyGridSelectionModel())
      refetch()
    } catch {
      toast.error('Error al eliminar los productos seleccionados')
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
      field: 'category', headerName: 'Categoría', width: 150, type: 'singleSelect',
      valueOptions: Object.entries(productCategoryLabels).map(([value, label]) => ({ value, label })),
      valueFormatter: (value) => t(productCategoryLabels, value as string),
    },
    {
      field: 'status', headerName: 'Estado', width: 130, type: 'singleSelect',
      valueOptions: Object.entries(productStatusLabels).map(([value, label]) => ({ value, label })),
      renderCell: (params) => {
        const isOptActive = params.row.status === 'Active' || params.row.status === 'active'
        const isOptDraft = params.row.status === 'Draft' || params.row.status === 'draft'
        return (
          <Chip
            label={t(productStatusLabels, params.row.status)}
            size="small"
            sx={{
              fontWeight: 600,
              bgcolor: isOptActive ? 'success.main' : isOptDraft ? 'warning.main' : 'action.disabledBackground',
              color: isOptActive ? 'success.contrastText' : isOptDraft ? 'warning.contrastText' : 'text.secondary',
            }}
          />
        )
      },
    },
    ...(canManageProducts ? [{
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: (params: any) => (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setSelected(params.row) }} sx={{ color: 'text.secondary' }}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    }] : []),
  ]

  if (permissionsLoading) {
    return <MaintenanceSkeleton layout="table" />
  }

  if (!canViewProducts) {
    return (
      <Alert severity="error" sx={{ mt: 4, borderRadius: 2 }}>
        Acceso denegado. No tiene permisos para ver los productos.
      </Alert>
    )
  }

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} className="flex-wrap gap-4">
        <Box sx={{ flexGrow: 1 }}>
          <PageHeader title="Productos" description="Productos de seguro asociados a proveedores y ramos." actionLabel="" icon={PackageCheck} />
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>No se pudo cargar la información de productos.</Alert>}

      <ResponsiveDataGrid
        height={580}
        rows={products ?? []}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        checkboxSelection={canManageProducts}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={setRowSelectionModel}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        localeText={esESGrid}
      />

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { elevation: 0, sx: { borderRadius: 3, minWidth: 140, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } } }}>
        {canManageProducts && <MenuItem onClick={openEdit} sx={{ color: 'text.primary' }}>
          <Edit2 size={16} className="mr-2" style={{ opacity: 0.7 }} /> Editar
        </MenuItem>}
        {canManageProducts && <MenuItem onClick={openDelete} sx={{ color: 'error.main' }}>
          <Trash2 size={16} className="mr-2" /> Eliminar
        </MenuItem>}
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
                  type="text"
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
                <TextField {...field} type="text" label="Línea de Negocio" fullWidth error={!!errors.lineOfBusiness} helperText={errors.lineOfBusiness?.message?.toString() ?? ' '} />
              )} />

              <Controller name="description" control={control} render={({ field }) => (
                <TextField {...field} label="Descripción" fullWidth multiline rows={3} error={!!errors.description} helperText={errors.description?.message?.toString() ?? ' '} />
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

      <Dialog open={bulkDeleteDialogOpen} onClose={() => !isDeleting && setBulkDeleteDialogOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3, maxWidth: 420 } } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Trash2 size={20} color="var(--mui-palette-error-main)" /> Eliminar productos
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary', mt: 1 }}>
            ¿Eliminar <strong>{selectedCount}</strong> productos seleccionados? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setBulkDeleteDialogOpen(false)} disabled={isDeleting} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
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

      {canManageProducts && (
        <MaintenanceFab
          label={selectedCount > 0 ? `Eliminar ${selectedCount} productos` : 'Nuevo producto'}
          onClick={selectedCount > 0 ? () => setBulkDeleteDialogOpen(true) : openCreate}
          icon={selectedCount > 0 ? <Trash2 size={24} /> : undefined}
          color={selectedCount > 0 ? 'error' : 'primary'}
        />
      )}
    </Stack>
  )
}
