import { Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material'
import type { GridColDef } from '@mui/x-data-grid'
import { Edit2, MoreVertical, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { createSecurityRole, fetchSecurityRoles, removeSecurityRole, updateSecurityRole } from '../../api/securityApi'
import type { SecurityRole } from '../../api/securityApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { ResponsiveDataGrid } from '../../components/ResponsiveDataGrid'
import { esESGrid } from '../../utils/enumLabels'

const emptyForm = { code: '', name: '', description: '', hierarchy: 10, elevated: false, enabled: true }

export function RolesPage() {
  const { data, loading, refetch } = useApiQuery('security-roles', fetchSecurityRoles)

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<SecurityRole | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<any>(emptyForm)

  const openCreate = () => {
    setDialogMode('create')
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (role: SecurityRole) => {
    setDialogMode('edit')
    setForm({ code: role.code, name: role.name, description: role.description, hierarchy: role.hierarchy, elevated: role.elevated, enabled: role.enabled })
    setDialogOpen(true)
    setAnchorEl(null)
  }

  const openDelete = () => {
    setDeleteDialogOpen(true)
    setAnchorEl(null)
  }

  const save = async () => {
    setIsSaving(true)
    try {
      if (dialogMode === 'create') {
        await createSecurityRole(form)
        toast.success('Rol creado exitosamente')
      } else if (selected) {
        await updateSecurityRole({ ...form, code: selected.code })
        toast.success('Rol actualizado')
      }
      setDialogOpen(false)
      refetch()
    } catch {
      toast.error('No se pudo guardar el rol.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setIsDeleting(true)
    try {
      await removeSecurityRole(selected.uuid)
      toast.success(`Rol "${selected.name}" eliminado`)
      setDeleteDialogOpen(false)
      setSelected(null)
      refetch()
    } catch {
      toast.error('No se pudo eliminar el rol.')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: GridColDef<SecurityRole>[] = [
    {
      field: 'code',
      headerName: 'Código',
      width: 150,
      renderCell: (p) => (
        <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'action.selected', px: 1, py: 0.25, borderRadius: 1, color: 'primary.main', fontWeight: 700 }}>
          {p.value}
        </Typography>
      ),
    },
    { field: 'name', headerName: 'Nombre', width: 170, renderCell: (p) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.value}</Typography> },
    { field: 'description', headerName: 'Descripción', flex: 1, minWidth: 200 },
    {
      field: 'hierarchy',
      headerName: 'Jerarquía',
      width: 110,
      renderCell: (p) => (
        <Tooltip title={`Nivel ${p.value} — mayor número = mayor autoridad`}>
          <Chip size="small" label={p.value} sx={{ fontWeight: 700, bgcolor: p.value >= 80 ? '#7c3aed22' : p.value >= 40 ? '#2563eb22' : 'action.selected', color: p.value >= 80 ? '#c084fc' : p.value >= 40 ? '#60a5fa' : 'text.secondary' }} />
        </Tooltip>
      ),
    },
    {
      field: 'elevated',
      headerName: 'Elevado',
      width: 100,
      renderCell: (p) => p.value
        ? <Chip size="small" label="Sí" sx={{ fontWeight: 700, bgcolor: '#dc262622', color: '#f87171', border: '1px solid #dc262633' }} />
        : <Chip size="small" label="No" sx={{ bgcolor: 'action.disabledBackground', color: 'text.disabled' }} />,
    },
    {
      field: 'enabled',
      headerName: 'Activo',
      width: 90,
      renderCell: (p) => p.value
        ? <Chip size="small" label="Sí" sx={{ fontWeight: 700, bgcolor: '#16a34a22', color: '#4ade80', border: '1px solid #16a34a33' }} />
        : <Chip size="small" label="No" sx={{ bgcolor: 'action.disabledBackground', color: 'text.disabled' }} />,
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (p) => (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setSelected(p.row) }} sx={{ color: 'text.secondary' }}>
          <MoreVertical size={16} />
        </IconButton>
      ),
    },
  ]

  return (
    <Stack spacing={4}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <PageHeader title="Roles" description="Roles, jerarquía y privilegios de acceso." actionLabel="" icon={ShieldCheck} />
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={openCreate} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}>
          Nuevo Rol
        </Button>
      </Stack>

      <ResponsiveDataGrid
        height={560}
        rows={data ?? []}
        columns={columns}
        getRowId={(r) => r.uuid}
        loading={loading}
        localeText={esESGrid}
        getRowHeight={() => 'auto'}
        sx={{ '& .MuiDataGrid-cell': { py: 1 } }}
      />

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { elevation: 0, sx: { borderRadius: 3, minWidth: 160, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } } }}>
        <MenuItem onClick={() => selected && openEdit(selected)} sx={{ color: 'text.primary' }}>
          <Edit2 size={15} style={{ marginRight: 10, opacity: 0.7 }} /> Editar
        </MenuItem>
        <MenuItem onClick={openDelete} sx={{ color: 'error.main' }}>
          <Trash2 size={15} style={{ marginRight: 10 }} /> Eliminar
        </MenuItem>
      </Menu>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => !isSaving && setDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {dialogMode === 'create' ? 'Nuevo Rol' : `Editar Rol: ${selected?.name}`}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {dialogMode === 'create' && (
              <TextField
                label="Código (único, sin espacios)"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                fullWidth
                helperText="Ej: auditor_senior, operaciones_gt"
                slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
              />
            )}
            <TextField label="Nombre visible" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
            <TextField label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={2} />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Jerarquía (0–100)"
                type="number"
                value={form.hierarchy}
                onChange={(e) => setForm({ ...form, hierarchy: Number(e.target.value) })}
                fullWidth
                helperText="Mayor número = mayor autoridad"
                slotProps={{ htmlInput: { min: 0, max: 100 } }}
              />
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Rol elevado</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Requiere aprobación superior</Typography>
                  </Box>
                  <Switch checked={form.elevated} onChange={(e) => setForm({ ...form, elevated: e.target.checked })} />
                </Stack>
                {dialogMode === 'edit' && (
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Habilitado</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Visible y asignable</Typography>
                    </Box>
                    <Switch checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                  </Stack>
                )}
              </Box>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={isSaving} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={isSaving || !form.name || (dialogMode === 'create' && !form.code)}
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isSaving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => !isDeleting && setDeleteDialogOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3, maxWidth: 420 } } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 size={20} color="var(--mui-palette-error-main)" /> Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1 }}>
            ¿Eliminar el rol <strong>{selected?.name}</strong>? Los usuarios con este rol asignado perderán los permisos asociados.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={16} />}
          >
            {isDeleting ? 'Eliminando…' : 'Sí, eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
