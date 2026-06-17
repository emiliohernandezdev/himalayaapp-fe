import { Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Stack, TextField, Typography } from '@mui/material'
import type { GridColDef } from '@mui/x-data-grid'
import { Plus, Trash2, UserRoundCog } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { createSecurityUser, fetchSecurityUsers, removeSecurityUser, updateSecurityUser, userRoleLabels, userRoles, userStatuses } from '../api/securityApi'
import type { SecurityUser } from '../api/securityApi'
import { useApiQuery } from '../api/useApiQuery'
import { PageHeader } from '../components/PageHeader'
import { ResponsiveDataGrid } from '../components/ResponsiveDataGrid'
import { usePermission } from '../hooks/usePermission'
import { esESGrid } from '../utils/enumLabels'

const emptyForm = { email: '', firstName: '', lastName: '', status: 'active', roles: ['Assistant'], password: '' }

const userStatusLabels: Record<string, string> = {
  active: 'Activo',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
}

export function UsersPage() {
  const { data, loading, refetch } = useApiQuery('security-users', fetchSecurityUsers)
  const canManageUsers = usePermission('manage_users')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<SecurityUser | null>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<SecurityUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const save = async () => {
    try {
      if (selected) {
        const input = { uuid: selected.uuid, ...form }
        if (!input.password) delete input.password
        await updateSecurityUser(input)
      } else {
        await createSecurityUser(form)
      }
      toast.success('Usuario guardado')
      setOpen(false)
      refetch()
    } catch {
      toast.error('No se pudo guardar el usuario.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    setIsDeleting(true)
    try {
      await removeSecurityUser(userToDelete.uuid)
      toast.success(`Usuario "${userToDelete.firstName} ${userToDelete.lastName}" eliminado`)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
      refetch()
    } catch {
      toast.error('No se pudo eliminar el usuario.')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Usuario', flex: 1, minWidth: 200, valueGetter: (_v, row) => `${row.firstName} ${row.lastName}` },
    { field: 'email', headerName: 'Correo', flex: 1, minWidth: 200 },
    {
      field: 'status',
      headerName: 'Estado',
      width: 120,
      type: 'singleSelect',
      valueOptions: userStatuses.map((value) => ({ value, label: userStatusLabels[value] ?? value })),
      renderCell: (p) => {
        const label = userStatusLabels[p.value] ?? p.value
        const color = p.value === 'active' ? 'success' : p.value === 'suspended' ? 'warning' : 'default'
        return <Chip size="small" label={label} color={color as any} variant="outlined" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
      },
    },
    {
      field: 'roles',
      headerName: 'Roles',
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', width: '100%', py: 0.75 }}>
          {(p.value as string[]).map((r: string) => (
            <Chip
              key={r}
              size="small"
              label={userRoleLabels[r] ?? r}
              sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: 'action.selected', color: 'text.primary' }}
            />
          ))}
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (p) => (
        <Button color="error" size="small" onClick={(event) => {
          event.stopPropagation()
          setUserToDelete(p.row)
          setDeleteDialogOpen(true)
        }}>
          <Trash2 size={16} />
        </Button>
      ),
    },
  ]

  return (
    <Stack spacing={4}>
      <PageHeader title="Usuarios" description="Cuentas, estados y roles de acceso." actionLabel="" icon={UserRoundCog} />
      {canManageUsers && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => { setSelected(null); setForm(emptyForm); setOpen(true) }}>Nuevo usuario</Button>
        </Box>
      )}
      <ResponsiveDataGrid
        height={580}
        rows={data ?? []}
        columns={columns}
        getRowId={(r) => r.uuid}
        loading={loading}
        localeText={esESGrid}
        getRowHeight={() => 'auto'}
        sx={{ '& .MuiDataGrid-cell': { py: 1 } }}
        onRowClick={(p) => { setSelected(p.row); setForm({ ...p.row, password: '' }); setOpen(true) }}
      />
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} fullWidth />
            <TextField label="Apellido" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} fullWidth />
            <TextField label="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
            <TextField label={selected ? 'Nueva contrasena' : 'Contrasena'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth />
            <TextField select label="Estado" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} fullWidth>
              {userStatuses.map((s) => <MenuItem key={s} value={s}>{userStatusLabels[s] ?? s}</MenuItem>)}
            </TextField>
            <FormControl fullWidth>
              <InputLabel>Roles</InputLabel>
              <Select multiple value={form.roles} input={<OutlinedInput label="Roles" />} onChange={(e) => setForm({ ...form, roles: e.target.value })}>
                {userRoles.map((r) => <MenuItem key={r} value={r}>{userRoleLabels[r]}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={save}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !isDeleting && setDeleteDialogOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3, maxWidth: 420 } } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 size={20} color="var(--mui-palette-error-main)" /> Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1 }}>
            ¿Eliminar al usuario <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
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
