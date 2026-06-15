import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { Edit2, MoreVertical, Plus, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { MaintenanceRecord } from '../../api/maintenanceApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'

type MaintenanceRecordsViewProps = {
  title: string
  description: string
  actionLabel: string
  icon: LucideIcon
  queryKey: string
  queryFn: () => Promise<MaintenanceRecord[]>
}

export function MaintenanceRecordsView({
  title,
  description,
  actionLabel,
  icon: Icon,
  queryKey,
  queryFn,
}: MaintenanceRecordsViewProps) {
  const { data: recordData, error, loading } = useApiQuery(queryKey, queryFn)
  const records = recordData ?? []

  // State for Action Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null)
  const openMenu = Boolean(anchorEl)

  // State for Dialogs
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, record: MaintenanceRecord) => {
    setAnchorEl(event.currentTarget)
    setSelectedRecord(record)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleOpenCreate = () => {
    setDialogMode('create')
    setSelectedRecord(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = () => {
    setDialogMode('edit')
    setDialogOpen(true)
    handleMenuClose()
  }

  const handleOpenDelete = () => {
    setDeleteDialogOpen(true)
    handleMenuClose()
  }

  const handleDeleteMock = () => {
    setDeleteDialogOpen(false)
    toast.error('Este es un componente base, falta conectar las mutaciones específicas.')
  }

  const handleSaveMock = () => {
    setDialogOpen(false)
    toast.info('El guardado de esta seccion todavia no esta disponible para ' + title)
  }

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} className="flex-wrap gap-4">
        <Box sx={{ flexGrow: 1 }}>
          <PageHeader title={title} description={description} actionLabel="" icon={Icon} />
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Plus size={20} />} 
          onClick={handleOpenCreate}
          sx={{
            borderRadius: '9999px',
            textTransform: 'none',
            fontWeight: 600,
            paddingX: 3,
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
              transform: 'translateY(-1px)'
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          {actionLabel}
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          No se pudo cargar la información desde la API.
        </Alert>
      ) : null}

      <TableContainer 
        component={Paper} 
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflow: 'hidden'
        }}
      >
        <Table sx={{ minWidth: 650 }} aria-label="maintenance table">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Registro</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Detalle</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Estado</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                      <Skeleton variant="circular" width={40} height={40} />
                      <Box>
                        <Skeleton variant="text" width={120} height={24} />
                        <Skeleton variant="text" width={80} height={16} />
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell><Skeleton variant="text" width={150} /></TableCell>
                  <TableCell><Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 999 }} /></TableCell>
                  <TableCell align="right"><Skeleton variant="circular" width={32} height={32} sx={{ ml: 'auto' }} /></TableCell>
                </TableRow>
              ))
            ) : records.length === 0 && !error ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                  <Stack sx={{ alignItems: 'center' }} spacing={2}>
                    <Icon size={48} strokeWidth={1} style={{ color: 'var(--mui-palette-text-disabled)' }} />
                    <Typography variant="h6" sx={{ color: 'text.primary' }}>Sin registros</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Este mantenimiento aún no tiene datos registrados.
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow 
                  key={record.uuid}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 0.2s'
                  }}
                >
                  <TableCell component="th" scope="row">
                    <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                      <Box sx={{ 
                        display: 'grid', 
                        placeItems: 'center', 
                        width: 40, height: 40, 
                        flexShrink: 0, 
                        borderRadius: 2, 
                        bgcolor: 'action.selected',
                        color: 'primary.main'
                      }}>
                        <Icon size={20} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {record.title}
                        </Typography>
                        {record.eyebrow && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {record.eyebrow}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>
                      {record.detail}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={record.status} 
                      size="small"
                      sx={{ 
                        fontWeight: 600,
                        bgcolor: record.status.toLowerCase().includes('activ') || record.status.toLowerCase().includes('open') 
                          ? 'success.main' : 'action.disabledBackground',
                        color: record.status.toLowerCase().includes('activ') || record.status.toLowerCase().includes('open') 
                          ? 'success.contrastText' : 'text.secondary',
                      }} 
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMenuClick(e, record)}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                    >
                      <MoreVertical size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.1))',
              mt: 1,
              borderRadius: 3,
              minWidth: 160,
              border: '1px solid',
              borderColor: 'divider'
            },
          }
        }}
      >
        <MenuItem onClick={handleOpenEdit} sx={{ color: 'text.primary' }}>
          <Edit2 size={16} className="mr-3" style={{ opacity: 0.7 }} /> Editar
        </MenuItem>
        <MenuItem onClick={handleOpenDelete} sx={{ color: 'error.main' }}>
          <Trash2 size={16} className="mr-3" /> Eliminar
        </MenuItem>
      </Menu>

      {/* Create / Edit Dialog (Placeholder form) */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'text.primary' }}>
          {dialogMode === 'create' ? actionLabel : 'Editar Registro'}
        </DialogTitle>
        <DialogContent sx={{ color: 'text.secondary' }}>
          <Box sx={{ py: 2 }}>
            <Typography variant="body1">
              Aquí se montará el formulario dinámico para <strong>{title}</strong>. 
            </Typography>
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary', opacity: 0.8 }}>
              Para hacerlo completamente funcional necesitamos habilitar el guardado en el servidor.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveMock}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 3, maxWidth: 400 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 color="var(--mui-palette-error-main)" size={24} /> Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary', mt: 1 }}>
            ¿Estás seguro de que deseas eliminar el registro <strong>{selectedRecord?.title}</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button 
            color="error"
            variant="contained" 
            onClick={handleDeleteMock}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Sí, eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
