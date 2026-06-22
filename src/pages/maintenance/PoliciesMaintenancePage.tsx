import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, Tab, Tabs, TextField, Tooltip, Typography, useTheme } from '@mui/material'
import type { GridColDef, GridRowSelectionModel } from '@mui/x-data-grid'
import { Edit2, FileText, MoreVertical, Trash2, CreditCard, ArrowRightLeft, Banknote } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import dayjs from 'dayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { createPolicy, fetchClients, fetchPolicies, fetchProducts, fetchProviders, removePolicy, updatePolicy } from '../../api/maintenanceApi'
import type { PolicyRaw, ClientRaw, ProviderRaw, ProductRaw } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { ResponsiveDataGrid } from '../../components/ResponsiveDataGrid'
import { usePermission, usePermissionLoading } from '../../hooks/usePermission'
import { esESGrid, policyStatusLabels, t } from '../../utils/enumLabels'
import { MaintenanceSkeleton } from '../../components/MaintenanceSkeleton'
import { MaintenanceFab } from '../../components/MaintenanceFab'
import { createEmptyGridSelectionModel, getSelectedGridIds } from '../../utils/gridSelection'
import { ResponsiveSelect } from '../../components/ResponsiveSelect'
import { ResponsiveAutocomplete } from '../../components/ResponsiveAutocomplete'

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (val === '' || val == null ? undefined : val), schema) as z.ZodType<z.infer<T> | undefined, any, any>

const policySchema = z.object({
  policyNumber: z.string().min(2, 'El número de póliza es requerido'),
  status: z.enum(['Active', 'Draft', 'Expired', 'Cancelled', 'PendingRenewal']),
  startDate: z.string().min(1, 'La fecha de inicio es requerida'),
  endDate: z.string().min(1, 'La fecha de vencimiento es requerida'),
  insuredAmount: emptyToUndefined(z.coerce.number().min(0, 'Debe ser mayor o igual a 0').optional()),
  premiumAmount: emptyToUndefined(z.coerce.number().min(0, 'Debe ser mayor o igual a 0').optional()),
  currency: z.string().min(1, 'Selecciona una moneda'),
  clientUuid: z.string().min(1, 'Selecciona un cliente'),
  providerUuid: z.string().min(1, 'Selecciona un proveedor'),
  productUuid: z.string().min(1, 'Selecciona un producto'),
  notes: emptyToUndefined(z.string().optional()),
  paymentMethod: emptyToUndefined(z.enum(['card', 'transfer', 'cash']).optional()),
  cardBrand: emptyToUndefined(z.enum(['visa', 'mastercard', 'amex', 'other']).optional()),
  cardLastFour: emptyToUndefined(z.string().optional()),
  billingFrequency: emptyToUndefined(z.enum(['single', 'monthly', 'quarterly', 'semi_annually', 'annually']).optional()),
  billingInstallments: emptyToUndefined(z.coerce.number().int().min(1, 'Debe ser al menos 1 cuota').optional()),
  installmentAmount: emptyToUndefined(z.coerce.number().min(0, 'Debe ser mayor o igual a 0').optional()),
}).refine((data) => {
  if (data.paymentMethod === 'card') {
    return !!data.cardBrand
  }
  return true
}, {
  message: 'Selecciona una franquicia',
  path: ['cardBrand'],
}).refine((data) => {
  if (data.paymentMethod === 'card') {
    return /^\d{4}$/.test(data.cardLastFour ?? '')
  }
  return true
}, {
  message: 'Debe tener 4 dígitos',
  path: ['cardLastFour'],
})

type PolicyFormData = z.infer<typeof policySchema>

function PaymentMethodBadge({
  method,
  brand,
  lastFour,
}: {
  method?: string | null
  brand?: string | null
  lastFour?: string | null
}) {
  const theme = useTheme()
  if (!method) return <Typography variant="body2" color="text.secondary">—</Typography>

  let tooltipTitle = ''
  let content: React.ReactElement

  if (method === 'card') {
    const brandName = brand ? (brand.toLowerCase() === 'amex' ? 'AMEX' : brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase()) : 'Tarjeta'
    tooltipTitle = `Tarjeta de Crédito / Débito: ${brandName}${lastFour ? ` (•••• ${lastFour})` : ''}`

    const getBrandIcon = () => {
      if (!brand) return <CreditCard size={14} />
      const b = brand.toLowerCase()
      if (b === 'visa') {
        return <img src="/cards/visa.svg" alt="Visa" style={{ height: 18, width: 'auto', display: 'inline-block', verticalAlign: 'middle', filter: theme.palette.mode === 'dark' ? 'brightness(0) invert(1)' : 'none' }} />
      }
      if (b === 'mastercard') {
        return <img src="/cards/mastercard.svg" alt="Mastercard" style={{ height: 22, width: 'auto', display: 'inline-block', verticalAlign: 'middle' }} />
      }
      if (b === 'amex') {
        return <img src="/cards/amex.svg" alt="American Express" style={{ height: 18, width: 'auto', display: 'inline-block', verticalAlign: 'middle' }} />
      }
      return <CreditCard size={14} />
    }

    content = (
      <Box sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        border: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        px: 1.5,
        py: 0.5,
        borderRadius: 2,
        height: 28,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {getBrandIcon()}
        </Box>
        {lastFour && (
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.primary', fontSize: '0.85rem' }}>
            •••• {lastFour}
          </Typography>
        )}
      </Box>
    )
  } else {
    tooltipTitle = method === 'transfer' ? 'Transferencia Bancaria' : 'Pago en Efectivo'
    
    const getMethodIcon = () => {
      switch (method) {
        case 'transfer':
          return <ArrowRightLeft size={14} />
        case 'cash':
          return <Banknote size={14} />
        default:
          return null
      }
    }

    const getMethodLabel = () => {
      switch (method) {
        case 'transfer':
          return 'Transferencia'
        case 'cash':
          return 'Efectivo'
        default:
          return method
      }
    }

    const getBadgeColors = () => {
      if (method === 'transfer') {
        return {
          bg: theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(14, 165, 233, 0.08)',
          border: theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.15)',
          text: theme.palette.mode === 'dark' ? '#38bdf8' : '#0369a1',
        }
      }
      return {
        bg: theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)',
        border: theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
        text: theme.palette.mode === 'dark' ? '#4ade80' : '#15803d',
      }
    }

    const colors = getBadgeColors()

    content = (
      <Box sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: colors.bg,
        border: '1px solid',
        borderColor: colors.border,
        px: 1.5,
        py: 0.5,
        borderRadius: 2,
        height: 28,
        color: colors.text,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {getMethodIcon()}
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
          {getMethodLabel()}
        </Typography>
      </Box>
    )
  }

  return (
    <Tooltip title={tooltipTitle} arrow enterDelay={300}>
      {content}
    </Tooltip>
  )
}

export function PoliciesMaintenancePage() {
  const { data: policies, error, loading, refetch } = useApiQuery('policies', fetchPolicies)
  const canViewPolicies = usePermission('view_policies')
  const canManagePolicies = usePermission('manage_policies')
  const { data: clients } = useApiQuery('clients-for-select', fetchClients)
  const { data: providers } = useApiQuery('providers-for-select', fetchProviders)
  const { data: products } = useApiQuery('products-for-select', fetchProducts)
  const permissionsLoading = usePermissionLoading()

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>(() => createEmptyGridSelectionModel())
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<PolicyRaw | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<number>(0)

  const nearExpiringCount = useMemo(() => {
    const now = dayjs()
    return (policies ?? []).filter((p) => {
      if (!p.endDate) return false
      const end = dayjs(p.endDate)
      const daysDiff = end.diff(now, 'day')
      return (p.status === 'Active' || p.status === 'PendingRenewal') && daysDiff >= 0 && daysDiff <= 30
    }).length
  }, [policies])

  const expiredCount = useMemo(() => {
    const now = dayjs()
    return (policies ?? []).filter((p) => {
      if (p.status === 'Expired') return true
      if (!p.endDate) return false
      return dayjs(p.endDate).isBefore(now, 'day')
    }).length
  }, [policies])

  const filteredPolicies = useMemo(() => {
    let list = policies ?? []
    if (activeTab === 1) {
      const now = dayjs()
      list = list.filter((p) => {
        if (!p.endDate) return false
        const end = dayjs(p.endDate)
        const daysDiff = end.diff(now, 'day')
        return (p.status === 'Active' || p.status === 'PendingRenewal') && daysDiff >= 0 && daysDiff <= 30
      })
    } else if (activeTab === 2) {
      const now = dayjs()
      list = list.filter((p) => {
        if (p.status === 'Expired') return true
        if (!p.endDate) return false
        return dayjs(p.endDate).isBefore(now, 'day')
      })
    }
    return list
  }, [policies, activeTab])
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const selectedIds = useMemo(
    () => getSelectedGridIds(rowSelectionModel, (policies ?? []).map((policy) => policy.uuid)),
    [policies, rowSelectionModel],
  )
  const selectedCount = selectedIds.length

  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<PolicyFormData>({
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
      paymentMethod: '',
      cardBrand: '',
      cardLastFour: '',
      billingFrequency: '',
      billingInstallments: undefined,
      installmentAmount: undefined,
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
      paymentMethod: '',
      cardBrand: '',
      cardLastFour: '',
      billingFrequency: '',
      billingInstallments: undefined,
      installmentAmount: undefined,
    })
    setDialogOpen(true)
  }

  useEffect(() => {
    const handleSherpaAction = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.type === 'create-policy') {
        openCreate()
      }
    }
    window.addEventListener('sherpa-action', handleSherpaAction)
    return () => window.removeEventListener('sherpa-action', handleSherpaAction)
  }, [reset])

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
      paymentMethod: selected.paymentMethod ?? '',
      cardBrand: selected.cardBrand ?? '',
      cardLastFour: selected.cardLastFour ?? '',
      billingFrequency: selected.billingFrequency ?? '',
      billingInstallments: selected.billingInstallments ? Number(selected.billingInstallments) : undefined,
      installmentAmount: selected.installmentAmount ? Number(selected.installmentAmount) : undefined,
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setIsDeleting(true)
    try {
      await Promise.all(selectedIds.map((uuid) => removePolicy(uuid)))
      toast.success(`${selectedIds.length} pólizas eliminadas`)
      setBulkDeleteDialogOpen(false)
      setRowSelectionModel(createEmptyGridSelectionModel())
      refetch()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar las pólizas seleccionadas')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    const s = String(status || '').toLowerCase()
    switch (s) {
      case 'active':
      case 'vigente':
      case 'active_policy':
        return { bgcolor: 'success.main', color: 'success.contrastText' }
      case 'pendingrenewal':
      case 'pending_renewal':
      case 'draft':
      case 'borrador':
        return { bgcolor: 'warning.main', color: 'warning.contrastText' }
      case 'expired':
      case 'cancelled':
      case 'cancelada':
      case 'vencida':
        return { bgcolor: 'error.main', color: 'error.contrastText' }
      default:
        return { bgcolor: 'action.disabledBackground', color: 'text.secondary' }
    }
  }

  const columns: GridColDef[] = [
    { field: 'policyNumber', headerName: 'Nº Póliza', width: 160 },
    { field: 'client', headerName: 'Cliente', flex: 1, minWidth: 180, valueGetter: (_v, row) => row.client?.displayName ?? '—' },
    { field: 'product', headerName: 'Producto', flex: 1, minWidth: 150, valueGetter: (_v, row) => row.product?.name ?? '—' },
    { field: 'provider', headerName: 'Proveedor', width: 160, valueGetter: (_v, row) => row.provider?.name ?? '—' },
    {
      field: 'startDate',
      headerName: 'Inicio',
      width: 120,
      type: 'date',
      valueGetter: (value) => value ? new Date(value as string) : null,
      valueFormatter: (value) => value ? new Date(value as Date).toLocaleDateString('es-GT') : '—',
    },
    {
      field: 'endDate',
      headerName: 'Vencimiento',
      width: 120,
      type: 'date',
      valueGetter: (value) => value ? new Date(value as string) : null,
      valueFormatter: (value) => value ? new Date(value as Date).toLocaleDateString('es-GT') : '—',
    },
    { field: 'currency', headerName: 'Moneda', width: 80 },
    {
      field: 'premiumAmount', headerName: 'Prima', width: 140, type: 'number',
      renderCell: (params) => {
        if (params.row.premiumAmount == null) return '—'
        const currency = params.row.currency ?? 'USD'
        let symbol = '$'
        if (currency === 'GTQ') symbol = 'Q'
        else if (currency === 'EUR') symbol = '€'
        else if (currency !== 'USD') symbol = `${currency} `
        return (
          <span style={{ fontWeight: 600 }}>
            {symbol}{Number(params.row.premiumAmount).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )
      }
    },
    {
      field: 'paymentMethod',
      headerName: 'Método de Pago',
      width: 200,
      renderCell: (params) => (
        <PaymentMethodBadge
          method={params.row.paymentMethod}
          brand={params.row.cardBrand}
          lastFour={params.row.cardLastFour}
        />
      ),
    },
    {
      field: 'status', headerName: 'Estado', width: 170, type: 'singleSelect',
      valueOptions: Object.entries(policyStatusLabels).map(([value, label]) => ({ value, label })),
      renderCell: (params) => {
        const colors = getStatusColor(params.row.status)
        return <Chip label={t(policyStatusLabels, params.row.status)} size="small" sx={{ fontWeight: 600, ...colors }} />
      },
    },
    ...(canManagePolicies ? [{
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: (params: any) => (
        <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); setSelected(params.row) }} sx={{ color: 'text.secondary' }}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    }] : []),
  ]

  const selectedProviderUuid = watch('providerUuid')
  const selectedProductUuid = watch('productUuid')
  const watchedPaymentMethod = watch('paymentMethod')
  const watchedBillingFrequency = watch('billingFrequency')

  const productOptions = useMemo(
    () => (products ?? []).filter((product) => !selectedProviderUuid || product.providerUuid === selectedProviderUuid),
    [products, selectedProviderUuid],
  )

  useEffect(() => {
    if (!selectedProductUuid) return
    const selectedProduct = (products ?? []).find((product) => product.uuid === selectedProductUuid)
    if (selectedProduct && selectedProviderUuid && selectedProduct.providerUuid !== selectedProviderUuid) {
      setValue('productUuid', '', { shouldValidate: true })
    }
  }, [products, selectedProductUuid, selectedProviderUuid, setValue])

  if (permissionsLoading) {
    return <MaintenanceSkeleton layout="table" />
  }

  if (!canViewPolicies) {
    return (
      <Alert severity="error" sx={{ mt: 4, borderRadius: 2 }}>
        Acceso denegado. No tiene permisos para ver las pólizas.
      </Alert>
    )
  }

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} className="flex-wrap gap-4">
        <Box sx={{ flexGrow: 1 }}>
          <PageHeader title="Pólizas" description="Contratos, vigencias, documentos y renovaciones." actionLabel="" icon={FileText} />
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>No se pudo cargar la información de pólizas.</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label={`Todas (${policies?.length ?? 0})`} />
          <Tab 
            label={`Próximas a vencer (${nearExpiringCount})`} 
            sx={{ 
              color: nearExpiringCount > 0 ? 'warning.main' : 'inherit',
              '&.Mui-selected': { color: 'warning.main', fontWeight: 'bold' }
            }} 
          />
          <Tab 
            label={`Vencidas / Expiradas (${expiredCount})`} 
            sx={{ 
              color: expiredCount > 0 ? 'error.main' : 'inherit',
              '&.Mui-selected': { color: 'error.main', fontWeight: 'bold' }
            }} 
          />
        </Tabs>
      </Box>

      <ResponsiveDataGrid
        rows={filteredPolicies}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        checkboxSelection={canManagePolicies}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={setRowSelectionModel}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        localeText={esESGrid}
      />

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { elevation: 0, sx: { borderRadius: 3, minWidth: 140, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } } }}>
        {canManagePolicies && <MenuItem onClick={openEdit} sx={{ color: 'text.primary' }}>
          <Edit2 size={16} className="mr-2" style={{ opacity: 0.7 }} /> Editar
        </MenuItem>}
        {canManagePolicies && <MenuItem onClick={openDelete} sx={{ color: 'error.main' }}>
          <Trash2 size={16} className="mr-2" /> Eliminar
        </MenuItem>}
      </Menu>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onClose={() => !isSubmitting && setDialogOpen(false)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogTitle sx={{ fontWeight: 700, color: 'text.primary' }}>
            {dialogMode === 'create' ? 'Nueva Póliza' : 'Editar Póliza'}
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'divider' }}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller name="policyNumber" control={control} render={({ field }) => (
                  <TextField {...field} type="text" label="Número de Póliza *" fullWidth error={!!errors.policyNumber} helperText={errors.policyNumber?.message ?? ' '} />
                )} />
                <Controller name="status" control={control} render={({ field }) => (
                  <ResponsiveSelect
                    {...field}
                    label="Estado *"
                    error={!!errors.status}
                    helperText={errors.status?.message ?? ' '}
                    options={[
                      { value: 'Draft', label: 'Borrador' },
                      { value: 'Active', label: 'Vigente' },
                      { value: 'PendingRenewal', label: 'Pendiente Renovación' },
                      { value: 'Expired', label: 'Vencida' },
                      { value: 'Cancelled', label: 'Cancelada' }
                    ]}
                  />
                )} />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller name="clientUuid" control={control} render={({ field }) => (
                  <ResponsiveAutocomplete
                    options={clients ?? []}
                    getOptionLabel={(option: ClientRaw) => option.displayName}
                    value={(clients ?? []).find((client) => client.uuid === field.value) ?? null}
                    onChange={(_, newValue) => field.onChange(newValue?.uuid ?? '')}
                    isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                    noOptionsText="Sin resultados"
                    label="Cliente *"
                    error={!!errors.clientUuid}
                    helperText={errors.clientUuid?.message ?? ' '}
                  />
                )} />
                <Controller name="providerUuid" control={control} render={({ field }) => (
                  <ResponsiveAutocomplete
                    options={providers ?? []}
                    getOptionLabel={(option: ProviderRaw) => option.name}
                    value={(providers ?? []).find((provider) => provider.uuid === field.value) ?? null}
                    onChange={(_, newValue) => {
                      field.onChange(newValue?.uuid ?? '')
                      setValue('productUuid', '', { shouldValidate: true })
                    }}
                    isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                    noOptionsText="Sin resultados"
                    label="Proveedor *"
                    error={!!errors.providerUuid}
                    helperText={errors.providerUuid?.message ?? ' '}
                  />
                )} />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller name="productUuid" control={control} render={({ field }) => (
                  <ResponsiveAutocomplete
                    options={productOptions}
                    getOptionLabel={(option: ProductRaw) => option.name}
                    value={productOptions.find((product) => product.uuid === field.value) ?? null}
                    onChange={(_, newValue) => field.onChange(newValue?.uuid ?? '')}
                    isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                    noOptionsText={selectedProviderUuid ? 'Sin productos para este proveedor' : 'Selecciona un proveedor primero'}
                    disabled={!selectedProviderUuid}
                    label="Producto *"
                    error={!!errors.productUuid}
                    helperText={errors.productUuid?.message ?? ' '}
                  />
                )} />
                <Controller name="currency" control={control} render={({ field }) => (
                  <ResponsiveSelect
                    {...field}
                    label="Moneda *"
                    error={!!errors.currency}
                    helperText={errors.currency?.message ?? ' '}
                    options={[
                      { value: 'GTQ', label: 'Quetzales (GTQ)' },
                      { value: 'USD', label: 'Dólares (USD)' }
                    ]}
                  />
                )} />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller name="insuredAmount" control={control} render={({ field }) => (
                  <TextField {...field} value={field.value ?? ''} type="number" label="Suma Asegurada" fullWidth error={!!errors.insuredAmount} helperText={(errors.insuredAmount as any)?.message ?? ' '} />
                )} />
                <Controller name="premiumAmount" control={control} render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    type="number"
                    label="Prima Anual"
                    fullWidth
                    error={!!errors.premiumAmount}
                    helperText={(errors.premiumAmount as any)?.message ?? ' '}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : ''
                      field.onChange(val)
                      // Recalculate installment amount on premium amount change
                      const freq = watch('billingFrequency')
                      const insts = watch('billingInstallments')
                      if (val && freq && freq !== 'single' && insts) {
                        setValue('installmentAmount', Number((Number(val) / Number(insts)).toFixed(2)))
                      }
                    }}
                  />
                )} />
              </Stack>

               <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller name="billingFrequency" control={control} render={({ field }) => (
                  <ResponsiveSelect
                    {...field}
                    label="Periodicidad de Cobro"
                    error={!!errors.billingFrequency}
                    helperText={errors.billingFrequency?.message?.toString() ?? ' '}
                    onChange={(val) => {
                      field.onChange(val)
                      // Auto-populate default installments based on frequency
                      if (val === 'single') {
                        setValue('billingInstallments', 1)
                        setValue('installmentAmount', watch('premiumAmount') ? Number(watch('premiumAmount')) : undefined)
                      } else if (val === 'monthly') {
                        setValue('billingInstallments', 12)
                      } else if (val === 'quarterly') {
                        setValue('billingInstallments', 4)
                      } else if (val === 'semi_annually') {
                        setValue('billingInstallments', 2)
                      } else if (val === 'annually') {
                        setValue('billingInstallments', 1)
                      } else {
                        setValue('billingInstallments', undefined)
                        setValue('installmentAmount', undefined)
                      }
                      
                      // Auto-calculate suggested installment amount
                      const premium = watch('premiumAmount')
                      if (premium && val && val !== 'single') {
                        let insts = 1
                        if (val === 'monthly') insts = 12
                        else if (val === 'quarterly') insts = 4
                        else if (val === 'semi_annually') insts = 2
                        setValue('installmentAmount', Number((Number(premium) / insts).toFixed(2)))
                      }
                    }}
                    options={[
                      { value: '', label: 'Ninguna' },
                      { value: 'single', label: 'Pago Único' },
                      { value: 'monthly', label: 'Mensual' },
                      { value: 'quarterly', label: 'Trimestral' },
                      { value: 'semi_annually', label: 'Semestral' },
                      { value: 'annually', label: 'Anual' }
                    ]}
                  />
                )} />
              </Stack>
 
               {watchedBillingFrequency && watchedBillingFrequency !== 'single' && (
                 <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                   <Controller name="billingInstallments" control={control} render={({ field }) => (
                     <TextField
                       {...field}
                       value={field.value ?? ''}
                       type="number"
                       label="Número de Cuotas *"
                       fullWidth
                       error={!!errors.billingInstallments}
                       helperText={errors.billingInstallments?.message?.toString() ?? ' '}
                       onChange={(e) => {
                         const val = e.target.value ? Number(e.target.value) : undefined
                         field.onChange(val)
                         const premium = watch('premiumAmount')
                         if (premium && val) {
                           setValue('installmentAmount', Number((Number(premium) / val).toFixed(2)))
                         }
                       }}
                     />
                   )} />
                   <Controller name="installmentAmount" control={control} render={({ field }) => (
                     <TextField
                       {...field}
                       value={field.value ?? ''}
                       type="number"
                       label="Monto por Cuota *"
                       fullWidth
                       error={!!errors.installmentAmount}
                       helperText={errors.installmentAmount?.message?.toString() ?? ' '}
                     />
                   )} />
                 </Stack>
               )}
 
               <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                 <Controller name="paymentMethod" control={control} render={({ field }) => (
                   <ResponsiveSelect
                     {...field}
                     label="Método de Pago"
                     error={!!errors.paymentMethod}
                     helperText={errors.paymentMethod?.message?.toString() ?? ' '}
                     onChange={(val) => {
                       field.onChange(val)
                       if (val !== 'card') {
                         setValue('cardBrand', '')
                         setValue('cardLastFour', '')
                       }
                     }}
                     options={[
                       { value: '', label: 'Ninguno' },
                       { value: 'card', label: 'Tarjeta de Crédito/Débito', icon: <CreditCard size={18} /> },
                       { value: 'transfer', label: 'Transferencia Bancaria', icon: <ArrowRightLeft size={18} /> },
                       { value: 'cash', label: 'Efectivo', icon: <Banknote size={18} /> }
                     ]}
                   />
                 )} />
               </Stack>
 
               {watchedPaymentMethod === 'card' && (
                 <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                   <Controller name="cardBrand" control={control} render={({ field }) => (
                     <ResponsiveSelect
                       {...field}
                       label="Franquicia *"
                       error={!!errors.cardBrand}
                       helperText={errors.cardBrand?.message?.toString() ?? ' '}
                       options={[
                         { value: '', label: 'Selecciona...' },
                         { value: 'visa', label: 'Visa', icon: <img src="/cards/visa.svg" alt="Visa" style={{ height: 16, width: 'auto' }} /> },
                         { value: 'mastercard', label: 'Mastercard', icon: <img src="/cards/mastercard.svg" alt="Mastercard" style={{ height: 22, width: 'auto' }} /> },
                         { value: 'amex', label: 'American Express (AMEX)', icon: <img src="/cards/amex.svg" alt="American Express" style={{ height: 16, width: 'auto' }} /> },
                         { value: 'other', label: 'Otra', icon: <CreditCard size={16} /> }
                       ]}
                     />
                   )} />
                   <Controller name="cardLastFour" control={control} render={({ field }) => (
                     <TextField
                       {...field}
                       type="text"
                       label="Últimos 4 dígitos *"
                       fullWidth
                       placeholder="1234"
                       slotProps={{ htmlInput: { maxLength: 4 } }}
                       error={!!errors.cardLastFour}
                       helperText={errors.cardLastFour?.message?.toString() ?? ' '}
                     />
                   )} />
                 </Stack>
               )}

              <Controller name="notes" control={control} render={({ field }) => (
                <TextField {...field} value={field.value ?? ''} label="Notas / Observaciones" multiline rows={3} fullWidth error={!!errors.notes} helperText={(errors.notes as any)?.message ?? ' '} />
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

      <Dialog open={bulkDeleteDialogOpen} onClose={() => !isDeleting && setBulkDeleteDialogOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3, maxWidth: 420 } } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 size={20} color="var(--mui-palette-error-main)" /> Eliminar pólizas
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary', mt: 1 }}>
            ¿Eliminar <strong>{selectedCount}</strong> pólizas seleccionadas? Esta acción no se puede deshacer.
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

      {canManagePolicies && (
        <MaintenanceFab
          label={selectedCount > 0 ? `Eliminar ${selectedCount} pólizas` : 'Nueva póliza'}
          onClick={selectedCount > 0 ? () => setBulkDeleteDialogOpen(true) : openCreate}
          icon={selectedCount > 0 ? <Trash2 size={24} /> : undefined}
          color={selectedCount > 0 ? 'error' : 'primary'}
        />
      )}
    </Stack>
  )
}
