import { Box, Button, Chip, Divider, Stack, TextField, Typography } from '@mui/material'
import { ClipboardCheck, MessageSquareText, NotebookPen, Plus } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { followUpTasks } from '../data/mockAdminData'

export function TasksPage() {
  return (
    <Stack spacing={4}>
      <PageHeader
        title="Seguimientos y tareas"
        description="Asignacion por usuario, comentarios, notas y estado operativo de cada seguimiento."
        actionLabel="Nueva tarea"
        icon={ClipboardCheck}
      />

      <Box className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Stack spacing={3}>
          {followUpTasks.map((task) => (
            <Box
              key={task.title}
              className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-4 shadow-[var(--himalaya-shadow)]"
            >
              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  sx={{
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: 1.5,
                    justifyContent: 'space-between',
                  }}
                >
                  <Box className="min-w-0">
                    <Typography variant="h6" className="break-words">
                      {task.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {task.client} · Responsable: {task.owner}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} className="flex-wrap">
                    <Chip label={task.priority} color="warning" variant="outlined" />
                    <Chip label={task.status} color="primary" variant="outlined" />
                  </Stack>
                </Stack>

                <Divider />

                <Box className="grid gap-3 sm:grid-cols-3">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Vence
                    </Typography>
                    <Typography variant="subtitle1">{task.dueDate}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Comentarios
                    </Typography>
                    <Typography variant="subtitle1">{task.comments}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Notas internas
                    </Typography>
                    <Typography variant="subtitle1">{task.notes}</Typography>
                  </Box>
                </Box>

                <Box className="rounded-lg bg-[var(--himalaya-surface-soft)] p-3">
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <MessageSquareText size={18} color="var(--himalaya-primary)" />
                    <Typography variant="body2">
                      Ultimo comentario: pendiente confirmacion del cliente para continuar.
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>

        <Box className="h-fit rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-4 shadow-[var(--himalaya-shadow)]">
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <NotebookPen size={20} color="var(--himalaya-primary)" />
              <Typography variant="h6">Nota rapida</Typography>
            </Stack>
            <TextField label="Cliente o poliza" fullWidth />
            <TextField label="Comentario" fullWidth multiline minRows={4} />
            <Button variant="contained" startIcon={<Plus size={18} />}>
              Guardar seguimiento
            </Button>
          </Stack>
        </Box>
      </Box>
    </Stack>
  )
}
