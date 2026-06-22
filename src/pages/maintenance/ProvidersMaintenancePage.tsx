import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material'
import { Building2, Edit2, Mail, MoreVertical, PackageCheck, Phone, Trash2, User, MapPin, ExternalLink, X, ShieldCheck, Layers, HeartHandshake, Package } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { createProvider, fetchProducts, fetchProviders, removeProvider, updateProvider } from '../../api/maintenanceApi'
import type { ProductRaw, ProviderRaw } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { usePermission, usePermissionLoading } from '../../hooks/usePermission'
import { providerStatusLabels, providerTypeLabels, productCategoryLabels, productStatusLabels, t } from '../../utils/enumLabels'
import { MaintenanceSkeleton } from '../../components/MaintenanceSkeleton'
import { MaintenanceFab } from '../../components/MaintenanceFab'
import { ResponsiveSelect } from '../../components/ResponsiveSelect'

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (val === '' ? undefined : val), schema) as z.ZodType<z.infer<T> | undefined, any, any>

const providerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre del proveedor es requerido (mínimo 2 caracteres)'),
  contactName: z.string().trim().min(2, 'El nombre de contacto es requerido (mínimo 2 caracteres)'),
  contactEmail: z.string().trim().min(1, 'El correo electrónico es requerido').email('Ingresa un correo electrónico válido'),
  contactPhone: z.string().trim().min(8, 'El teléfono es requerido (mínimo 8 dígitos)'),
  logo: emptyToUndefined(z.string().url('Debe ser una URL válida').optional()),
  address: z.string().trim().min(1, 'La dirección es requerida'),
  taxId: z.string().trim().min(1, 'El NIT / RFC es requerido'),
  type: z.enum(['InsuranceCompany', 'SuretyCompany', 'ServiceProvider']),
  status: z.enum(['Active', 'Inactive', 'UnderReview']),
})

type ProviderFormData = z.infer<typeof providerSchema>

const avatarColors = ['#075985', '#0f766e', '#7c3aed', '#be123c', '#b45309', '#047857', '#0369a1', '#475569']

function providerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PR'
}

function providerAvatarColor(name: string) {
  const sum = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return avatarColors[sum % avatarColors.length]
}

export function ProvidersMaintenancePage() {
  const [page, setPage] = useState(1)
  const pageSize = 12
  const { data: paginated, error, loading, refetch } = useApiQuery(
    `providers-${page}-${pageSize}`,
    () => fetchProviders(page, pageSize)
  )
  const { data: productsData } = useApiQuery('products-for-provider-detail', fetchProducts)
  const products = productsData?.items ?? []
  const canViewProviders = usePermission('view_providers')
  const canManageProviders = usePermission('manage_providers')
  const permissionsLoading = usePermissionLoading()

  const providers: ProviderRaw[] = paginated?.items ?? []
  const totalCount = paginated?.total ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const paginatedProviders = providers

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<ProviderRaw | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const selectedProducts = useMemo<ProductRaw[]>(
    () => selected ? (products ?? []).filter((product) => product.providerUuid === selected.uuid || product.provider?.uuid === selected.uuid) : [],
    [products, selected],
  )

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

  const openDetail = (provider: ProviderRaw) => {
    setSelected(provider)
    setDetailOpen(true)
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
              <Box key={i} sx={{ height: 160, borderRadius: 3, bgcolor: 'var(--himalaya-surface-soft)', border: '1px solid', borderColor: 'divider', animation: 'himalaya-skeleton-pulse 1.8s ease-in-out infinite' }} />
            ))
          : paginatedProviders.map((provider) => (
              <Box
                key={provider.uuid}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(provider)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openDetail(provider)
                  }
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  p: 3,
                  boxShadow: 'var(--himalaya-shadow)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  minHeight: 250,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--himalaya-primary) 8%, transparent), transparent 40%)',
                    pointerEvents: 'none',
                  },
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: 'primary.main',
                    boxShadow: (theme) => theme.palette.mode === 'light'
                      ? '0 20px 40px -10px rgba(7, 89, 133, 0.12)'
                      : '0 20px 40px -10px rgba(0, 0, 0, 0.5)',
                  },
                  '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 3 },
                }}
              >
                {/* Header: Logo, Status, Type, Actions */}
                <Stack direction="row" sx={{ position: 'relative', zIndex: 1, justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                  <Avatar
                    src={provider.logo || undefined}
                    alt={provider.name}
                    slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                    sx={{
                      width: 52,
                      height: 52,
                      fontWeight: 900,
                      fontSize: '0.95rem',
                      bgcolor: providerAvatarColor(provider.name),
                      color: '#fff',
                      border: '2px solid',
                      borderColor: 'background.paper',
                      boxShadow: '0 8px 20px rgba(15,23,42,0.12)',
                    }}
                  >
                    {providerInitials(provider.name)}
                  </Avatar>
                  
                  <Stack direction="column" spacing={0.75} sx={{ alignItems: 'flex-end' }}>
                    <Chip
                      label={t(providerStatusLabels, provider.status)}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        height: 22,
                        bgcolor: provider.status === 'Active' ? 'success.main' : provider.status === 'UnderReview' ? 'warning.main' : 'action.disabledBackground',
                        color: provider.status === 'Active' ? 'success.contrastText' : provider.status === 'UnderReview' ? 'warning.contrastText' : 'text.secondary',
                      }}
                    />
                    <Chip
                      label={t(providerTypeLabels, provider.type)}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 650,
                        fontSize: '0.7rem',
                        height: 20,
                        borderColor: 'divider',
                        color: 'text.secondary',
                      }}
                    />
                  </Stack>
                </Stack>

                {/* Body: Name */}
                <Box sx={{ position: 'relative', zIndex: 1, flexGrow: 1, mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.25, mb: 1, letterSpacing: '-0.015em' }}>
                    {provider.name}
                  </Typography>
                  {canManageProviders && (
                    <IconButton 
                      size="small" 
                      onClick={(e) => { 
                        e.stopPropagation()
                        setAnchorEl(e.currentTarget)
                        setSelected(provider)
                      }} 
                      sx={{ 
                        position: 'absolute', 
                        right: 0, 
                        top: 0, 
                        color: 'text.secondary',
                        bgcolor: 'action.hover',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '.MuiBox-root:hover &': { opacity: 1 } // Show on hover if possible
                      }}
                    >
                      <MoreVertical size={16} />
                    </IconButton>
                  )}
                </Box>

                {/* Footer: Contact Block (Clearly Identifiable) */}
                {provider.contactName && (
                  <Box sx={{
                    position: 'relative',
                    zIndex: 1,
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
                      Contacto Comercial
                    </Typography>
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <User size={13} className="text-slate-400 dark:text-slate-500" />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {provider.contactName}
                        </Typography>
                      </Stack>
                      {provider.contactEmail && (
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Mail size={12} className="text-slate-400 dark:text-slate-500" />
                          <Typography variant="caption" color="text.secondary" sx={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {provider.contactEmail}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                )}
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
        <MenuItem onClick={() => { setDetailOpen(true); setAnchorEl(null) }} sx={{ color: 'primary.main' }}>
          <PackageCheck size={16} className="mr-2" style={{ opacity: 0.7 }} /> Ver detalle
        </MenuItem>
        <MenuItem onClick={openEdit} sx={{ color: 'text.primary' }}>
          <Edit2 size={16} className="mr-2" style={{ opacity: 0.7 }} /> Editar
        </MenuItem>
        <MenuItem onClick={openDelete} sx={{ color: 'error.main' }}>
          <Trash2 size={16} className="mr-2" /> Eliminar
        </MenuItem>
      </Menu>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 24px 70px rgba(0,0,0,0.15)',
            }
          }
        }}
      >
        {/* Banner header */}
        <Box sx={{
          height: 120,
          background: 'linear-gradient(135deg, var(--himalaya-primary-dark) 0%, var(--himalaya-primary) 100%)',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          p: 3,
        }}>
          <IconButton 
            onClick={() => setDetailOpen(false)} 
            sx={{ 
              position: 'absolute', 
              top: 16, 
              right: 16, 
              color: '#fff', 
              bgcolor: 'rgba(255,255,255,0.15)', 
              '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } 
            }}
          >
            <X size={18} />
          </IconButton>
        </Box>

        <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, pb: 4, pt: 0, mt: -6, position: 'relative', zIndex: 1 }}>
          <Stack spacing={4}>
            {/* Header info */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: { xs: 'flex-start', sm: 'flex-end' }, mb: 2 }}>
              <Avatar
                src={selected?.logo || undefined}
                alt={selected?.name}
                sx={{
                  width: 96,
                  height: 96,
                  bgcolor: selected ? providerAvatarColor(selected.name) : 'primary.main',
                  color: '#fff',
                  fontSize: '2rem',
                  fontWeight: 900,
                  border: '5px solid',
                  borderColor: 'background.paper',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}
              >
                {selected ? providerInitials(selected.name) : 'PR'}
              </Avatar>

              <Box sx={{ flexGrow: 1, pb: 0.5 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                  <Chip
                    label={selected ? t(providerStatusLabels, selected.status) : ''}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: selected?.status === 'Active' ? 'success.main' : selected?.status === 'UnderReview' ? 'warning.main' : 'action.disabledBackground',
                      color: selected?.status === 'Active' ? 'success.contrastText' : selected?.status === 'UnderReview' ? 'warning.contrastText' : 'text.secondary',
                    }}
                  />
                  <Chip
                    label={selected ? t(providerTypeLabels, selected.type) : ''}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 650 }}
                  />
                </Stack>
                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.02em', color: 'text.primary', lineHeight: 1.15 }}>
                  {selected?.name}
                </Typography>
              </Box>
            </Stack>

            {/* Split Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '4.5fr 7.5fr' }, gap: 4 }}>
              
              {/* Left Column: Commercial & Contact Details */}
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary', mb: 2 }}>
                    Datos del Proveedor
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                        IDENTIFICACIÓN TRIBUTARIA (NIT/RFC)
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Building2 size={16} className="text-slate-400" />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {selected?.taxId ?? 'Sin registro'}
                        </Typography>
                      </Stack>
                    </Box>

                    {selected?.address && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                          DIRECCIÓN FISCAL
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                          <MapPin size={16} className="text-slate-400 mt-0.5" />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {selected.address}
                            </Typography>
                            <Button
                              component="a"
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                              startIcon={<ExternalLink size={12} />}
                              sx={{ p: 0, minWidth: 0, textTransform: 'none', fontWeight: 600, mt: 0.5 }}
                            >
                              Ver en mapa
                            </Button>
                          </Box>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Box>

                <Box sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary', mb: 2 }}>
                    Contacto Comercial
                  </Typography>
                  {selected?.contactName ? (
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <User size={18} className="text-slate-400" />
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                            NOMBRE
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {selected.contactName}
                          </Typography>
                        </Box>
                      </Stack>

                      {selected.contactEmail && (
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Mail size={18} className="text-slate-400" />
                          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                              CORREO ELECTRÓNICO
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {selected.contactEmail}
                            </Typography>
                            <Button
                              component="a"
                              href={`mailto:${selected.contactEmail}`}
                              size="small"
                              variant="outlined"
                              sx={{ mt: 1, textTransform: 'none', height: 26, fontSize: '0.75rem', borderRadius: 1.5 }}
                            >
                              Enviar correo
                            </Button>
                          </Box>
                        </Stack>
                      )}

                      {selected.contactPhone && (
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Phone size={18} className="text-slate-400" />
                          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                              TELÉFONO
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {selected.contactPhone}
                            </Typography>
                            <Button
                              component="a"
                              href={`tel:${selected.contactPhone}`}
                              size="small"
                              variant="outlined"
                              sx={{ mt: 1, textTransform: 'none', height: 26, fontSize: '0.75rem', borderRadius: 1.5 }}
                            >
                              Llamar
                            </Button>
                          </Box>
                        </Stack>
                      )}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Sin información de contacto.
                    </Typography>
                  )}
                </Box>
              </Stack>

              {/* Right Column: Products List */}
              <Box>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary' }}>
                    Productos Ofrecidos ({selectedProducts.length})
                  </Typography>
                </Stack>

                {selectedProducts.length === 0 ? (
                  <Box sx={{
                    py: 8,
                    px: 3,
                    textAlign: 'center',
                    borderRadius: 4,
                    border: '2px dashed',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5
                  }}>
                    <PackageCheck size={32} className="text-slate-300" />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Este proveedor no tiene productos asociados en el catálogo.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ maxHeight: { xs: 260, md: 380 }, overflowY: 'auto', pr: 1 }}>
                    <Stack spacing={1.5}>
                      {selectedProducts.map((product) => {
                        const c = product.category?.toLowerCase() || ''
                        let style = {
                          icon: <Package size={20} />,
                          gradient: 'linear-gradient(135deg, rgba(100, 116, 139, 0.12) 0%, rgba(100, 116, 139, 0.04) 100%)',
                          color: '#64748b',
                          softBg: 'rgba(100, 116, 139, 0.08)',
                        }
                        
                        if (c.includes('insur') || c.includes('segur')) {
                          style = {
                            icon: <ShieldCheck size={20} />,
                            gradient: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(2, 132, 199, 0.05) 100%)',
                            color: '#0284c7',
                            softBg: 'rgba(2, 132, 199, 0.08)',
                          }
                        } else if (c.includes('reinsur') || c.includes('resegur')) {
                          style = {
                            icon: <Layers size={20} />,
                            gradient: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0.05) 100%)',
                            color: '#7c3aed',
                            softBg: 'rgba(124, 58, 237, 0.08)',
                          }
                        } else if (c.includes('assist') || c.includes('asist')) {
                          style = {
                            icon: <HeartHandshake size={20} />,
                            gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(236, 72, 153, 0.05) 100%)',
                            color: '#db2777',
                            softBg: 'rgba(236, 72, 153, 0.08)',
                          }
                        }

                        return (
                          <Box
                            key={product.uuid}
                            sx={{
                              display: 'flex',
                              flexDirection: { xs: 'column', sm: 'row' },
                              alignItems: { xs: 'stretch', sm: 'center' },
                              justifyContent: 'space-between',
                              p: 2,
                              gap: 2,
                              borderRadius: 3,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.paper',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': {
                                borderColor: 'primary.main',
                                transform: 'translateY(-2px)',
                                boxShadow: (theme) => theme.palette.mode === 'dark'
                                  ? '0 8px 24px rgba(0, 0, 0, 0.3)'
                                  : '0 8px 20px rgba(0, 0, 0, 0.04)',
                              }
                            }}
                          >
                            {/* Left: Icon and Name */}
                            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 2.25,
                                  background: style.gradient,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: style.color,
                                  flexShrink: 0,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                }}
                              >
                                {style.icon}
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.25, lineHeight: 1.25 }}>
                                  {product.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>
                                  {product.lineOfBusiness || 'Catálogo general'}
                                </Typography>
                              </Box>
                            </Stack>

                            {/* Right: Badges */}
                            <Stack
                              direction="row"
                              spacing={1.5}
                              sx={{
                                alignItems: 'center',
                                justifyContent: { xs: 'space-between', sm: 'flex-end' },
                                flexShrink: 0,
                              }}
                            >
                              <Chip
                                size="small"
                                label={t(productCategoryLabels, product.category)}
                                sx={{
                                  fontWeight: 750,
                                  fontSize: '0.65rem',
                                  height: 20,
                                  bgcolor: style.softBg,
                                  color: style.color,
                                }}
                              />
                              
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  px: 1.25,
                                  py: 0.25,
                                  borderRadius: 99,
                                  bgcolor: product.status === 'Active' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(107, 114, 128, 0.08)',
                                  border: '1px solid',
                                  borderColor: product.status === 'Active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                                }}
                              >
                                <Box sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  bgcolor: product.status === 'Active' ? 'success.main' : 'text.disabled',
                                  boxShadow: product.status === 'Active' ? '0 0 8px rgba(34, 197, 94, 0.8)' : 'none',
                                }} />
                                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', color: product.status === 'Active' ? 'success.main' : 'text.secondary' }}>
                                  {t(productStatusLabels, product.status)}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        )
                      })}
                    </Stack>
                  </Box>
                )}
              </Box>

            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          {canManageProviders && (
            <Button variant="outlined" onClick={() => { setDetailOpen(false); openEdit() }} sx={{ borderRadius: 2 }}>
              Editar
            </Button>
          )}
          <Button variant="contained" onClick={() => setDetailOpen(false)} sx={{ borderRadius: 2, px: 3 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onClose={() => !isSubmitting && setDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogTitle sx={{ fontWeight: 700, color: 'text.primary' }}>
            {dialogMode === 'create' ? 'Nuevo Proveedor' : 'Editar Proveedor'}
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'divider' }}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Controller name="name" control={control} render={({ field }) => (
                <TextField {...field} type="text" label="Nombre del Proveedor *" fullWidth error={!!errors.name} helperText={errors.name?.message ?? ' '} />
              )} />
              <Stack direction="row" spacing={2}>
                <Controller name="type" control={control} render={({ field }) => (
                  <ResponsiveSelect
                    {...field}
                    label="Tipo *"
                    error={!!errors.type}
                    helperText={errors.type?.message ?? ' '}
                    options={[
                      { value: 'InsuranceCompany', label: 'Aseguradora' },
                      { value: 'SuretyCompany', label: 'Afianzadora' },
                      { value: 'ServiceProvider', label: 'Proveedor de Servicios' }
                    ]}
                  />
                )} />
                <Controller name="status" control={control} render={({ field }) => (
                  <ResponsiveSelect
                    {...field}
                    label="Estado *"
                    error={!!errors.status}
                    helperText={errors.status?.message ?? ' '}
                    options={[
                      { value: 'Active', label: 'Activo' },
                      { value: 'Inactive', label: 'Inactivo' },
                      { value: 'UnderReview', label: 'En revisión' }
                    ]}
                  />
                )} />
              </Stack>
              <Controller name="contactName" control={control} render={({ field }) => (
                <TextField {...field} type="text" label="Nombre del Contacto *" fullWidth error={!!errors.contactName} helperText={errors.contactName?.message ?? ' '} />
              )} />
              <Stack direction="row" spacing={2}>
                <Controller name="contactEmail" control={control} render={({ field }) => (
                  <TextField {...field} type="email" label="Email de Contacto *" fullWidth error={!!errors.contactEmail} helperText={errors.contactEmail?.message ?? ' '} />
                )} />
                <Controller name="contactPhone" control={control} render={({ field }) => (
                  <TextField {...field} type="tel" label="Teléfono *" fullWidth error={!!errors.contactPhone} helperText={errors.contactPhone?.message ?? ' '} />
                )} />
              </Stack>
              <Controller name="taxId" control={control} render={({ field }) => (
                <TextField {...field} type="text" label="NIT / RFC *" fullWidth error={!!errors.taxId} helperText={errors.taxId?.message ?? ' '} />
              )} />
              <Controller name="logo" control={control} render={({ field }) => (
                <TextField {...field} type="url" label="URL del Logo" fullWidth placeholder="https://..." error={!!errors.logo} helperText={errors.logo?.message?.toString() ?? ' '} />
              )} />
              <Controller name="address" control={control} render={({ field }) => (
                <TextField {...field} type="text" label="Dirección *" fullWidth error={!!errors.address} helperText={errors.address?.message ?? ' '} />
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

      {canManageProviders && (
        <MaintenanceFab label="Nuevo proveedor" onClick={openCreate} />
      )}
    </Stack>
  )
}
