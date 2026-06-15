import { Alert, Box, Chip, Stack, Tooltip, Typography } from '@mui/material'
import type { GridColDef } from '@mui/x-data-grid'
import { Activity } from 'lucide-react'
import { fetchSecurityAuditLogs } from '../../api/securityApi'
import type { SecurityAuditLog } from '../../api/securityApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'
import { ResponsiveDataGrid } from '../../components/ResponsiveDataGrid'

// ─── Labels ───────────────────────────────────────────────

const actionLabels: Record<string, string> = {
  create: 'Creado',
  update: 'Actualizado',
  delete: 'Eliminado',
  restore: 'Restaurado',
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  assign: 'Asignado',
  status_change: 'Cambio de estado',
  comment: 'Comentario',
}

const actionColors: Record<string, { bg: string; text: string }> = {
  create:       { bg: '#16a34a22', text: '#4ade80' },
  update:       { bg: '#2563eb22', text: '#60a5fa' },
  delete:       { bg: '#dc262622', text: '#f87171' },
  restore:      { bg: '#7c3aed22', text: '#c084fc' },
  login:        { bg: '#0284c722', text: '#38bdf8' },
  logout:       { bg: '#6b728022', text: '#9ca3af' },
  assign:       { bg: '#ea580c22', text: '#fb923c' },
  status_change:{ bg: '#d9770622', text: '#fbbf24' },
  comment:      { bg: '#0d948822', text: '#2dd4bf' },
}

const entityLabels: Record<string, string> = {
  InsuranceCase:   'Caso de Seguro',
  Policy:          'Póliza',
  Client:          'Cliente',
  Provider:        'Aseguradora',
  Product:         'Producto',
  Tag:             'Etiqueta',
  User:            'Usuario',
  Seed:            'Carga Inicial',
  AuditLog:        'Auditoría',
  CaseComment:     'Comentario',
  MaintenanceModule: 'Módulo',
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
}

function ActionChip({ action }: { action: string }) {
  const key = action.toLowerCase()
  const label = actionLabels[key] ?? action
  const colors = actionColors[key] ?? { bg: 'action.disabledBackground', text: 'text.secondary' }
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        fontWeight: 700,
        fontSize: '0.70rem',
        bgcolor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.text}33`,
        letterSpacing: '0.02em',
      }}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────

export function SecurityAuditPage() {
  const { data, loading, error } = useApiQuery('security-audit-logs', fetchSecurityAuditLogs)

  const columns: GridColDef<SecurityAuditLog>[] = [
    {
      field: 'createdAt',
      headerName: 'Fecha',
      width: 190,
      type: 'dateTime',
      valueGetter: (value) => value ? new Date(value as string) : null,
      valueFormatter: (value) => formatDate(value as Date),
    },
    {
      field: 'action',
      headerName: 'Acción',
      width: 160,
      sortable: false,
      renderCell: (params) => <ActionChip action={params.row.action} />,
    },
    {
      field: 'entityName',
      headerName: 'Entidad',
      width: 160,
      valueGetter: (_v, row) => entityLabels[row.entityName] ?? row.entityName ?? '—',
    },
    {
      field: 'entityUuid',
      headerName: 'Registro',
      flex: 1,
      minWidth: 160,
      renderCell: (params) => {
        const uuid = params.row.entityUuid ?? '—'
        const short = uuid !== '—' ? uuid.substring(0, 8) + '…' : '—'
        return (
          <Tooltip title={uuid} placement="top">
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', cursor: 'default' }}>
              {short}
            </Typography>
          </Tooltip>
        )
      },
    },
    {
      field: 'actor',
      headerName: 'Usuario',
      flex: 1,
      minWidth: 180,
      valueGetter: (_v, row) =>
        row.actor ? `${row.actor.firstName} ${row.actor.lastName}` : 'Sistema',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 26, height: 26, borderRadius: '50%', bgcolor: 'primary.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'primary.contrastText', lineHeight: 1 }}>
              {params.value
                ? (params.value as string).split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                : 'S'}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
            {params.value as string}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'ipAddress',
      headerName: 'IP',
      width: 130,
      valueGetter: (_v, row) => (row as any).ipAddress ?? '—',
    },
  ]

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Histórico general"
        description="Actividad relevante, cambios de seguridad y auditoría operativa."
        actionLabel=""
        icon={Activity}
      />
      {error && <Alert severity="error">No se pudo cargar el histórico general.</Alert>}
      <ResponsiveDataGrid
        height={640}
        rows={data ?? []}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={loading}
        getRowHeight={() => 'auto'}
        sx={{ '& .MuiDataGrid-cell': { py: 1 } }}
      />
    </Stack>
  )
}
