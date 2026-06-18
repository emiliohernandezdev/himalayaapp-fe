import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material'
import { Building2, Edit2, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { createProvider, fetchProviders, removeProvider, updateProvider } from '../../api/maintenanceApi'
import type { ProviderRaw } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { usePermission, usePermissionLoading } from '../../hooks/usePermission'
import { providerStatusLabels, providerTypeLabels, t } from '../../utils/enumLabels'
import { MaintenanceSkeleton } from '../../components/MaintenanceSkeleton'

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (val === '' ? undefined : val), schema) as z.ZodType<z.infer<T> | undefined, any, any>

const providerSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  contactName: emptyToUndefined(z.string().optional()),
  contactEmail: emptyToUndefined(z.string().email('Email inválido').optional()),
  contactPhone: emptyToUndefined(z.string().optional()),
  logo: emptyToUndefined(z.string().url('Debe ser una URL válida').optional()),
  address: emptyToUndefined(z.string().optional()),
  taxId: emptyToUndefined(z.string().optional()),
  type: z.enum(['InsuranceCompany', 'SuretyCompany', 'ServiceProvider']),
  status: z.enum(['Active', 'Inactive', 'UnderReview']),
})

type ProviderFormData = z.infer<typeof providerSchema>

export function ProvidersMaintenancePage() {
  const { data: records, error, loading, refetch } = useApiQuery('providers', fetchProviders)
  const canViewProviders = usePermission('view_providers')
  const canManageProviders = usePermission('manage_providers')
  const permissionsLoading = usePermissionLoading()

  const [page, setPage] = useState(1)
  const pageSize = 12
  const providers: ProviderRaw[] = records ?? []
  const totalPages = Math.ceil(providers.length / pageSize)
  const paginatedProviders = providers.slice((page - 1) * pageSize, page * pageSize)

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<ProviderRaw | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues: { name: '', contactName: '', contactEmail: '', contactPhone: '', logo: '', address: '', taxId: '', type: 'ServiceProvider', status: 'Active' }
  })

  const openCreate = () => {
    setDialogMode('create')
    reset({ name: '', contactName: '', contactEmail: '', contactPhone: '', logo: '', address: '', taxId: '', type: 'ServiceProvider', status: 'Active' })
    setDialogOpen(true)
  }

  const openEdit = () => {
    if (!selected) return
    setDialogMode('edit')
    reset({
      name: selected.name,
      contactName: selected.contactName ?? '',
      contactEmail: selected.contactEmail ?? '',
      contactPhone: selected.contactPhone ?? '',
      logo: selected.logo ?? '',
      address: selected.address ?? '',
      taxId: selected.taxId ?? '',
      type: selected.type as ProviderFormData['type'],
      status: selected.status as ProviderFormData['status'],
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
        await createProvider(data)
        toast.success('Proveedor creado exitosamente')
      } else if (selected) {
        await updateProvider({ uuid: selected.uuid, ...data })
        toast.success('Proveedor actualizado')
      }
      setDialogOpen(false)
      refetch()
    } catch {
      toast.error('Error al guardar el proveedor')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setIsDeleting(true)
    try {
      await removeProvider(selected.uuid)
      toast.success('Proveedor eliminado')
      setDeleteDialogOpen(false)
      refetch()
    } catch {
      toast.error('Error al eliminar el proveedor')
    } finally {
      setIsDeleting(false)
    }
  }

  if (permissionsLoading) {
    return <MaintenanceSkeleton layout="grid" />
  }

  if (!canViewProviders) {
    return (
      <Alert severity="error" sx={{ mt: 4, borderRadius: 2 }}>
        Acceso denegado. No tiene permisos para ver los proveedores.
      </Alert>
    )
  }

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} className="flex-wrap gap-4">
        <Box sx={{ flexGrow: 1 }}>
          <PageHeader title="Proveedores" description="Aseguradoras, afianzadoras y contactos comerciales." actionLabel="" icon={Building2} />
        </Box>
        {canManageProviders && (
          <Button variant="contained" color="primary" startIcon={<Plus size={20} />} onClick={openCreate}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' }}>
            Nuevo proveedor
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>No se pudo cargar la información de proveedores.</Alert>}

      {!loading && providers.length === 0 && !error && (
        <Box sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 6, textAlign: 'center' }}>
          <Building2 size={48} style={{ margin: '0 auto', opacity: 0.3 }} strokeWidth={1} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.primary' }}>Sin proveedores</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Comienza agregando tu primer proveedor al sistema.</Typography>
        </Box>
      )}

      <Box className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Box key={i} sx={{ height: 160, borderRadius: 3, bgcolor: 'background.paper', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            ))
          : paginatedProviders.map((provider) => (
              <Box key={provider.uuid} sx={{
                display: 'flex', flexDirection: 'column',
                bgcolor: 'background.paper', borderRadius: 3,
                border: '1px solid', borderColor: 'divider',
                p: 3, boxShadow: '0 4px 14px 0 rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' }
              }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {provider.logo
                      ? <img src={provider.logo} alt={provider.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      : <Building2 size={24} color="var(--mui-palette-primary-main)" />}
                  </Box>
                  {canManageProviders && (
                    <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); setSelected(provider) }} sx={{ color: 'text.secondary', mr: -1, mt: -1 }}>
                      <MoreVertical size={18} />
                    </IconButton>
                  )}
                </Stack>

                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2, mb: 0.5 }}>
                    {provider.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {t(providerTypeLabels, provider.type)}
                  </Typography>
                  {provider.contactName && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                      {provider.contactName}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={t(providerStatusLabels, provider.status)}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      bgcolor: provider.status === 'Active' ? 'success.main' : provider.status === 'UnderReview' ? 'warning.main' : 'action.disabledBackground',
                      color: provider.status === 'Active' ? 'success.contrastText' : provider.status === 'UnderReview' ? 'warning.contrastText' : 'text.secondary',
                    }}
                  />
                </Box>
              </Box>
            ))}
      </Box>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" shape="rounded" />
        </Box>
      )}

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
      <Dialog open={dialogOpen} onClose={() => !isSubmitting && setDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogTitle sx={{ fontWeight: 700, color: 'text.primary' }}>
            {dialogMode === 'create' ? 'Nuevo Proveedor' : 'Editar Proveedor'}
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'divider' }}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Controller name="name" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre del Proveedor *" fullWidth error={!!errors.name} helperText={errors.name?.message ?? ' '} />
              )} />
              <Stack direction="row" spacing={2}>
                <Controller name="type" control={control} render={({ field }) => (
                  <TextField {...field} select label="Tipo *" fullWidth error={!!errors.type} helperText={errors.type?.message ?? ' '}>
                    <MenuItem value="InsuranceCompany">Aseguradora</MenuItem>
                    <MenuItem value="SuretyCompany">Afianzadora</MenuItem>
                    <MenuItem value="ServiceProvider">Proveedor de Servicios</MenuItem>
                  </TextField>
                )} />
                <Controller name="status" control={control} render={({ field }) => (
                  <TextField {...field} select label="Estado" fullWidth>
                    <MenuItem value="Active">Activo</MenuItem>
                    <MenuItem value="Inactive">Inactivo</MenuItem>
                    <MenuItem value="UnderReview">En revisión</MenuItem>
                  </TextField>
                )} />
              </Stack>
              <Controller name="contactName" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre del Contacto" fullWidth error={!!errors.contactName} helperText={errors.contactName?.message?.toString() ?? ' '} />
              )} />
              <Stack direction="row" spacing={2}>
                <Controller name="contactEmail" control={control} render={({ field }) => (
                  <TextField {...field} label="Email de Contacto" fullWidth error={!!errors.contactEmail} helperText={errors.contactEmail?.message?.toString() ?? ' '} />
                )} />
                <Controller name="contactPhone" control={control} render={({ field }) => (
                  <TextField {...field} label="Teléfono" fullWidth error={!!errors.contactPhone} helperText={errors.contactPhone?.message?.toString() ?? ' '} />
                )} />
              </Stack>
              <Controller name="taxId" control={control} render={({ field }) => (
                <TextField {...field} label="NIT / RFC" fullWidth error={!!errors.taxId} helperText={errors.taxId?.message?.toString() ?? ' '} />
              )} />
              <Controller name="logo" control={control} render={({ field }) => (
                <TextField {...field} label="URL del Logo" fullWidth placeholder="https://..." error={!!errors.logo} helperText={errors.logo?.message?.toString() ?? ' '} />
              )} />
              <Controller name="address" control={control} render={({ field }) => (
                <TextField {...field} label="Dirección" fullWidth error={!!errors.address} helperText={errors.address?.message?.toString() ?? ' '} />
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

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !isSubmitting && setDeleteDialogOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3, maxWidth: 400 } } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 size={20} color="var(--mui-palette-error-main)" /> Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary', mt: 1 }}>
            ¿Eliminar al proveedor <strong>{selected?.name}</strong>? Esta acción no se puede deshacer.
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
