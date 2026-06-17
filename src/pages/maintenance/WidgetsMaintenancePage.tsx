import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { Edit2, MoreVertical, Plus, Blocks, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { createWidget, fetchWidgets, removeWidget, updateWidget } from '../../api/maintenanceApi'
import type { WidgetRaw } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { usePermission, usePermissionLoading } from '../../hooks/usePermission'
import { MaintenanceSkeleton } from '../../components/MaintenanceSkeleton'
import { WidgetIconPreview } from '../../components/WidgetIconPreview'

const categories = ['Métricas', 'Operación', 'Análisis', 'Seguridad']
const presentationTypes = [
  'Scatter Chart',
  'Pie Chart',
  'Bars Chart',
  'Sparkline',
  'Gauge',
  'DataGrid',
  'Metric',
  'Shortcuts',
  'List'
]

const widgetSchema = z.object({
  slug: z
    .string()
    .min(1, 'El slug único es requerido')
    .max(60, 'El slug no puede exceder los 60 caracteres')
    .regex(/^[a-zA-Z0-9]+$/, 'El slug solo puede contener letras y números (sin espacios o caracteres especiales)'),
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(80, 'El título no puede exceder los 80 caracteres'),
  description: z
    .string()
    .min(1, 'La descripción es requerida')
    .max(300, 'La descripción no puede exceder los 300 caracteres'),
  icon: z
    .string()
    .min(1, 'El ícono es requerido')
    .max(60),
  category: z
    .string()
    .min(1, 'La categoría es requerida')
    .max(60),
  presentationType: z
    .string()
    .min(1, 'El tipo de presentación es requerido')
    .max(60),
  defaultLayout: z
    .string()
    .refine((val) => {
      try {
        const parsed = JSON.parse(val)
        return (
          typeof parsed === 'object' &&
          parsed !== null &&
          'w' in parsed &&
          'h' in parsed
        )
      } catch {
        return false
      }
    }, 'Debe ser un formato JSON válido que defina el diseño, ej: {"x":0,"y":0,"w":3,"h":2,"minW":2,"minH":2}'),
  enabled: z.boolean().default(true),
})

type WidgetFormData = z.infer<typeof widgetSchema>

export function WidgetsMaintenancePage() {
  const { data: widgets, error, loading, refetch } = useApiQuery('widgets', fetchWidgets)
  const canViewWidgets = usePermission('view_widgets')
  const canManageWidgets = usePermission('manage_widgets')
  const permissionsLoading = usePermissionLoading()
  const [page, setPage] = useState(1)
  const pageSize = 8
  const allWidgets = widgets ?? []
  const totalPages = Math.ceil(allWidgets.length / pageSize)
  const paginated = allWidgets.slice((page - 1) * pageSize, page * pageSize)

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<WidgetRaw | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WidgetFormData>({
    resolver: zodResolver(widgetSchema) as any,
    defaultValues: {
      slug: '',
      title: '',
      description: '',
      icon: 'Blocks',
      category: 'Métricas',
      presentationType: 'Metric',
      defaultLayout: '{"x":0,"y":0,"w":3,"h":2,"minW":2,"minH":2}',
      enabled: true,
    },
  })

  const openCreate = () => {
    setDialogMode('create')
    reset({
      slug: '',
      title: '',
      description: '',
      icon: 'Blocks',
      category: 'Métricas',
      presentationType: 'Metric',
      defaultLayout: '{"x":0,"y":0,"w":3,"h":2,"minW":2,"minH":2}',
      enabled: true,
    })
    setDialogOpen(true)
  }

  const openEdit = () => {
    if (!selected) return
    setDialogMode('edit')
    reset({
      slug: selected.slug,
      title: selected.title,
      description: selected.description,
      icon: selected.icon,
      category: selected.category,
      presentationType: selected.presentationType,
      defaultLayout: selected.defaultLayout,
      enabled: selected.enabled,
    })
    setDialogOpen(true)
    setAnchorEl(null)
  }

  const openDelete = () => {
    if (!selected) return
    setDeleteDialogOpen(true)
    setAnchorEl(null)
  }

  const onSubmit = async (data: WidgetFormData) => {
    try {
      if (dialogMode === 'create') {
        await createWidget(data)
        toast.success('Widget creado exitosamente')
      } else if (selected) {
        await updateWidget({ uuid: selected.uuid, ...data })
        toast.success('Widget actualizado exitosamente')
      }
      setDialogOpen(false)
      refetch()
    } catch {
      toast.error('Error al guardar el widget')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setIsDeleting(true)
    try {
      await removeWidget(selected.uuid)
      toast.success('Widget eliminado exitosamente')
      setDeleteDialogOpen(false)
      refetch()
    } catch {
      toast.error('Error al eliminar el widget')
    } finally {
      setIsDeleting(false)
    }
  }

  if (permissionsLoading) {
    return <MaintenanceSkeleton layout="grid" />
  }

  if (!canViewWidgets) {
    return (
      <Alert severity="error" sx={{ mt: 4, borderRadius: 2 }}>
        Acceso denegado. No tiene permisos para ver o administrar los widgets.
      </Alert>
    )
  }

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} className="flex-wrap gap-4">
        <Box sx={{ flexGrow: 1 }}>
          <PageHeader
            title="Widgets del Sistema"
            description="Configura el catálogo global de componentes dinámicos para los tableros de control."
            actionLabel=""
            icon={Blocks}
          />
        </Box>
        {canManageWidgets && (
          <Button
            variant="contained"
            startIcon={<Plus size={20} />}
            onClick={openCreate}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
            }}
          >
            Nuevo Widget
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>No se pudo cargar la lista de widgets.</Alert>}

      {!loading && allWidgets.length === 0 && !error ? (
        <Box sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 6, textAlign: 'center' }}>
          <Blocks size={48} style={{ margin: '0 auto', opacity: 0.3 }} strokeWidth={1} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.primary' }}>Sin widgets registrados</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Crea tu primer widget dinámico para los tableros.</Typography>
        </Box>
      ) : null}

      <Box className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  height: 280,
                  borderRadius: 4,
                  bgcolor: 'background.paper',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            ))
          : paginated.map((widget) => (
              <Box
                key={widget.uuid}
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px -10px rgba(0,0,0,0.12)',
                    borderColor: 'primary.main',
                  },
                }}
              >
                {/* SVG Preview of style */}
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                  <WidgetIconPreview type={widget.presentationType} size={72} />
                </Box>

                <Box sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {widget.category}
                    </span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      widget.enabled
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                    }`}>
                      {widget.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </Stack>

                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                    {widget.title}
                  </Typography>

                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5, minHeight: 36, overflow: 'hidden' }}>
                    {widget.description}
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Slug ID:</span>
                      <code className="text-slate-600 dark:text-slate-300 font-mono">{widget.slug}</code>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Formato:</span>
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">{widget.presentationType}</span>
                    </div>
                  </Box>
                </Box>

                {canManageWidgets && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      setAnchorEl(e.currentTarget)
                      setSelected(widget)
                    }}
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      color: 'text.secondary',
                    }}
                  >
                    <MoreVertical size={18} />
                  </IconButton>
                )}
              </Box>
            ))}
      </Box>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" shape="rounded" />
        </Box>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              borderRadius: 3,
              minWidth: 140,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            },
          },
        }}
      >
        <MenuItem onClick={openEdit} sx={{ color: 'text.primary' }}>
          <Edit2 size={16} className="mr-2" style={{ opacity: 0.7 }} /> Editar
        </MenuItem>
        <MenuItem onClick={openDelete} sx={{ color: 'error.main' }}>
          <Trash2 size={16} className="mr-2" /> Eliminar
        </MenuItem>
      </Menu>

      <Dialog
        open={dialogOpen}
        onClose={() => !isSubmitting && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <form onSubmit={handleSubmit(onSubmit as any)}>
          <DialogTitle sx={{ fontWeight: 700, color: 'text.primary' }}>
            {dialogMode === 'create' ? 'Crear Widget en Base de Datos' : 'Editar Configuración del Widget'}
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'divider', py: 3 }}>
            <Stack spacing={3}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="slug"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Slug ID único"
                      fullWidth
                      required
                      disabled={dialogMode === 'edit'}
                      error={!!errors.slug}
                      helperText={errors.slug?.message || 'Identificador de backend (ej: clientsMetric)'}
                    />
                  )}
                />
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Título"
                      fullWidth
                      required
                      error={!!errors.title}
                      helperText={errors.title?.message || 'Nombre visible del widget'}
                    />
                  )}
                />
              </div>

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descripción"
                    fullWidth
                    required
                    multiline
                    rows={2}
                    error={!!errors.description}
                    helperText={errors.description?.message || 'Explica el propósito de este widget'}
                  />
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormControl fullWidth error={!!errors.category}>
                  <InputLabel id="category-select-label">Categoría</InputLabel>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        labelId="category-select-label"
                        label="Categoría"
                      >
                        {categories.map((cat) => (
                          <MenuItem key={cat} value={cat}>
                            {cat}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                  {errors.category && <FormHelperText>{errors.category.message}</FormHelperText>}
                </FormControl>

                <FormControl fullWidth error={!!errors.presentationType}>
                  <InputLabel id="type-select-label">Formato</InputLabel>
                  <Controller
                    name="presentationType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        labelId="type-select-label"
                        label="Formato"
                      >
                        {presentationTypes.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                  {errors.presentationType && <FormHelperText>{errors.presentationType.message}</FormHelperText>}
                </FormControl>

                <Controller
                  name="icon"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Ícono de Lucide"
                      fullWidth
                      required
                      error={!!errors.icon}
                      helperText={errors.icon?.message || 'Ej: UsersRound, ShieldCheck'}
                    />
                  )}
                />
              </div>

              <Controller
                name="defaultLayout"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Diseño predeterminado (JSON)"
                    fullWidth
                    required
                    multiline
                    rows={3}
                    error={!!errors.defaultLayout}
                    helperText={errors.defaultLayout?.message || 'Diseño de cuadrícula: {"x":0,"y":0,"w":3,"h":2,"minW":2,"minH":2}'}
                    slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: '12px' } } }}
                  />
                )}
              />

              <Controller
                name="enabled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={field.onChange} />}
                    label="Widget Habilitado y Visible en el Catálogo"
                  />
                )}
              />
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
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 3, maxWidth: 400 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 size={20} color="var(--mui-palette-error-main)" /> Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary', mt: 1 }}>
            ¿Estás seguro de que deseas eliminar permanentemente el widget <strong>{selected?.title}</strong> del catálogo de la base de datos?
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
            {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
