import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material'
import { Edit2, MoreVertical, Plus, Tags, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { createTag, fetchTags, removeTag, updateTag } from '../../api/maintenanceApi'
import type { TagRaw } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'

const colorPresets = [
  '#075985',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#475569',
  '#111827',
  '#64748b',
]

const tagSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser un color hexadecimal válido (#RRGGBB)'),
  description: z.string().optional(),
})

type TagFormData = z.infer<typeof tagSchema>

export function TagsMaintenancePage() {
  const { data: tags, error, loading, refetch } = useApiQuery('tags', fetchTags)
  const [page, setPage] = useState(1)
  const pageSize = 12
  const allTags = tags ?? []
  const totalPages = Math.ceil(allTags.length / pageSize)
  const paginated = allTags.slice((page - 1) * pageSize, page * pageSize)

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<TagRaw | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: { name: '', color: '#075985', description: '' }
  })

  const openCreate = () => {
    setDialogMode('create')
    reset({ name: '', color: '#075985', description: '' })
    setDialogOpen(true)
  }

  const openEdit = () => {
    if (!selected) return
    setDialogMode('edit')
    reset({ name: selected.name, color: selected.color, description: selected.description ?? '' })
    setDialogOpen(true)
    setAnchorEl(null)
  }

  const openDelete = () => {
    if (!selected) return
    setDeleteDialogOpen(true)
    setAnchorEl(null)
  }

  const onSubmit = async (data: TagFormData) => {
    try {
      if (dialogMode === 'create') {
        await createTag(data)
        toast.success('Etiqueta creada exitosamente')
      } else if (selected) {
        await updateTag({ uuid: selected.uuid, ...data })
        toast.success('Etiqueta actualizada')
      }
      setDialogOpen(false)
      refetch()
    } catch {
      toast.error('Error al guardar la etiqueta')
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setIsDeleting(true)
    try {
      await removeTag(selected.uuid)
      toast.success('Etiqueta eliminada')
      setDeleteDialogOpen(false)
      refetch()
    } catch {
      toast.error('Error al eliminar la etiqueta')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} className="flex-wrap gap-4">
        <Box sx={{ flexGrow: 1 }}>
          <PageHeader title="Etiquetas" description="Clasificación visual para casos y seguimiento." actionLabel="" icon={Tags} />
        </Box>
        <Button variant="contained" startIcon={<Plus size={20} />} onClick={openCreate}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' }}>
          Nueva etiqueta
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>No se pudo cargar las etiquetas.</Alert>}

      {!loading && allTags.length === 0 && !error ? (
        <Box sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 6, textAlign: 'center' }}>
          <Tags size={48} style={{ margin: '0 auto', opacity: 0.3 }} strokeWidth={1} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.primary' }}>Sin etiquetas</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Crea tu primera etiqueta para clasificar casos.</Typography>
        </Box>
      ) : null}

      <Box className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Box key={i} sx={{ height: 100, borderRadius: 3, bgcolor: 'background.paper', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            ))
          : paginated.map((tag) => (
              <Box key={tag.uuid} sx={{
                bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 2.5,
                display: 'flex', alignItems: 'center', gap: 2,
                transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' }
              }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: tag.color, flexShrink: 0 }} />
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }} noWrap>{tag.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>{tag.description || tag.color}</Typography>
                </Box>
                <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); setSelected(tag) }} sx={{ color: 'text.secondary', flexShrink: 0 }}>
                  <MoreVertical size={16} />
                </IconButton>
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
        <MenuItem onClick={openEdit} sx={{ color: 'text.primary' }}><Edit2 size={16} className="mr-2" style={{ opacity: 0.7 }} /> Editar</MenuItem>
        <MenuItem onClick={openDelete} sx={{ color: 'error.main' }}><Trash2 size={16} className="mr-2" /> Eliminar</MenuItem>
      </Menu>

      <Dialog open={dialogOpen} onClose={() => !isSubmitting && setDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle sx={{ fontWeight: 700, color: 'text.primary' }}>
            {dialogMode === 'create' ? 'Nueva Etiqueta' : 'Editar Etiqueta'}
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: 'divider' }}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Controller name="name" control={control} render={({ field }) => (
                <TextField {...field} label="Nombre" fullWidth required error={!!errors.name} helperText={errors.name?.message} />
              )} />
              <Controller name="color" control={control} render={({ field }) => (
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Box
                      component="input"
                      type="color"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      aria-label="Color de etiqueta"
                      sx={{
                        width: 56,
                        height: 48,
                        p: 0.5,
                        bgcolor: 'transparent',
                        border: '1px solid',
                        borderColor: errors.color ? 'error.main' : 'divider',
                        borderRadius: 2,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: errors.color ? 'error.main' : 'text.secondary', display: 'block', mb: 0.75 }}>
                        Color
                      </Typography>
                      <Box sx={{ height: 32, borderRadius: 2, bgcolor: field.value, border: '1px solid', borderColor: 'divider' }} />
                      {errors.color?.message && (
                        <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
                          {errors.color.message}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1 }}>
                    {colorPresets.map((color) => (
                      <IconButton
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        aria-label={`Seleccionar color ${color}`}
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          bgcolor: color,
                          border: '2px solid',
                          borderColor: field.value.toLowerCase() === color.toLowerCase() ? 'text.primary' : 'transparent',
                          '&:hover': { bgcolor: color, opacity: 0.88 },
                        }}
                      />
                    ))}
                  </Box>
                </Stack>
              )} />
              <Controller name="description" control={control} render={({ field }) => (
                <TextField {...field} label="Descripción" fullWidth multiline rows={2} />
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

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3, maxWidth: 400 } } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 size={20} color="var(--mui-palette-error-main)" /> Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary', mt: 1 }}>
            ¿Eliminar la etiqueta <strong>{selected?.name}</strong>?
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
