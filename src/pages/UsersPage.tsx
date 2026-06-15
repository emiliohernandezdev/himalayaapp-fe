import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Stack, TextField } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { Plus, Trash2, UserRoundCog } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { createSecurityUser, fetchSecurityUsers, removeSecurityUser, updateSecurityUser, userRoles, userStatuses } from '../api/securityApi'
import type { SecurityUser } from '../api/securityApi'
import { useApiQuery } from '../api/useApiQuery'
import { PageHeader } from '../components/PageHeader'
import { esESGrid } from '../utils/enumLabels'

const emptyForm = { email: '', firstName: '', lastName: '', status: 'active', roles: ['agent'], password: '' }

export function UsersPage() {
  const { data, loading, refetch } = useApiQuery('security-users', fetchSecurityUsers)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<SecurityUser | null>(null)
  const [form, setForm] = useState<any>(emptyForm)

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

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Usuario', flex: 1, minWidth: 220, valueGetter: (_v, row) => `${row.firstName} ${row.lastName}` },
    { field: 'email', headerName: 'Correo', flex: 1, minWidth: 220 },
    { field: 'status', headerName: 'Estado', width: 130, renderCell: (p) => <Chip size="small" label={p.value} /> },
    { field: 'roles', headerName: 'Roles', flex: 1, minWidth: 220, renderCell: (p) => <Stack direction="row" spacing={0.5}>{p.value.map((r: string) => <Chip key={r} size="small" label={r} />)}</Stack> },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      renderCell: (p) => (
        <Button color="error" size="small" onClick={async (event) => {
          event.stopPropagation()
          await removeSecurityUser(p.row.uuid)
          refetch()
        }}>
          <Trash2 size={16} />
        </Button>
      ),
    },
  ]

  return (
    <Stack spacing={4}>
      <PageHeader title="Usuarios" description="Cuentas, estados y roles de acceso." actionLabel="" icon={UserRoundCog} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => { setSelected(null); setForm(emptyForm); setOpen(true) }}>Nuevo usuario</Button>
      </Box>
      <Box sx={{ height: 560, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <DataGrid rows={data ?? []} columns={columns} getRowId={(r) => r.uuid} loading={loading} localeText={esESGrid} onRowClick={(p) => { setSelected(p.row); setForm({ ...p.row, password: '' }); setOpen(true) }} />
      </Box>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} fullWidth />
            <TextField label="Apellido" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} fullWidth />
            <TextField label="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
            <TextField label={selected ? 'Nueva contrasena' : 'Contrasena'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth />
            <TextField select label="Estado" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} fullWidth>
              {userStatuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <FormControl fullWidth>
              <InputLabel>Roles</InputLabel>
              <Select multiple value={form.roles} input={<OutlinedInput label="Roles" />} onChange={(e) => setForm({ ...form, roles: e.target.value })}>
                {userRoles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={save}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
