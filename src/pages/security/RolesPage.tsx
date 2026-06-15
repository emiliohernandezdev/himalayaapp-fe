import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Switch, TextField } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { fetchSecurityRoles, updateSecurityRole } from '../../api/securityApi'
import type { SecurityRole } from '../../api/securityApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { esESGrid } from '../../utils/enumLabels'

export function RolesPage() {
  const { data, loading, refetch } = useApiQuery('security-roles', fetchSecurityRoles)
  const [selected, setSelected] = useState<SecurityRole | null>(null)

  const columns: GridColDef[] = [
    { field: 'code', headerName: 'Codigo', width: 150 },
    { field: 'name', headerName: 'Nombre', flex: 1 },
    { field: 'description', headerName: 'Descripcion', flex: 1.5 },
    { field: 'hierarchy', headerName: 'Jerarquia', width: 120 },
    { field: 'elevated', headerName: 'Elevado', width: 110, type: 'boolean' },
    { field: 'enabled', headerName: 'Activo', width: 110, type: 'boolean' },
  ]

  const save = async () => {
    if (!selected) return
    await updateSecurityRole(selected)
    toast.success('Rol actualizado')
    setSelected(null)
    refetch()
  }

  return (
    <Stack spacing={4}>
      <PageHeader title="Roles" description="Roles globales, jerarquia y privilegios elevados." actionLabel="" icon={ShieldCheck} />
      <Box sx={{ height: 560, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <DataGrid rows={data ?? []} columns={columns} getRowId={(r) => r.code} loading={loading} localeText={esESGrid} onRowClick={(p) => setSelected(p.row)} />
      </Box>
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar rol</DialogTitle>
        <DialogContent dividers>
          {selected && <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre" value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
            <TextField label="Descripcion" value={selected.description} onChange={(e) => setSelected({ ...selected, description: e.target.value })} multiline rows={3} />
            <TextField label="Jerarquia" type="number" value={selected.hierarchy} onChange={(e) => setSelected({ ...selected, hierarchy: Number(e.target.value) })} />
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>Elevado <Switch checked={selected.elevated} onChange={(e) => setSelected({ ...selected, elevated: e.target.checked })} /></Stack>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>Activo <Switch checked={selected.enabled} onChange={(e) => setSelected({ ...selected, enabled: e.target.checked })} /></Stack>
          </Stack>}
        </DialogContent>
        <DialogActions><Button onClick={() => setSelected(null)}>Cancelar</Button><Button variant="contained" onClick={save}>Guardar</Button></DialogActions>
      </Dialog>
    </Stack>
  )
}
