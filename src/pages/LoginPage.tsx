import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { PaletteMode } from '@mui/material/styles'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import * as z from 'zod'
import { loginApi } from '../api/maintenanceApi'
import { HimalayaLogo } from '../components/HimalayaLogo'
import { useAuthStore } from '../store/useAuthStore'
import type { NodeAccess } from '../store/useAuthStore'

type LoginPageProps = {
  mode: PaletteMode
}

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electronico valido').min(1, 'El correo es requerido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  instanceUuid: z.string().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

const accessHighlights = [
  'Cartera, polizas y renovaciones en una sola vista',
  'Seguimientos con responsables, notas y comentarios',
  'Mantenimientos para clientes, proveedores y productos',
]

export function LoginPage({ mode }: LoginPageProps) {
  const navigate = useNavigate()
  const loginStore = useAuthStore((state) => state.login)
  const [showPassword, setShowPassword] = useState(false)
  const [accessNodes, setAccessNodes] = useState<NodeAccess[]>([])

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      instanceUuid: '',
    },
  })

  const selectedInstanceUuid = useWatch({ control, name: 'instanceUuid' })
  const instanceOptions = accessNodes.flatMap((node) =>
    node.modules.map((module) => ({
      ...module,
      label: `${node.title} / ${module.nickname || module.title}`,
    })),
  )

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await loginApi(data.email, data.password, data.instanceUuid || undefined)

      if (response.requiresModuleSelection || !response.accessToken) {
        setAccessNodes(response.accessNodes)
        toast.info('Selecciona el modulo para continuar.')
        return
      }

      const selectedModule = response.accessNodes
        .flatMap((node) => node.modules)
        .find((module) => module.instanceUuid === data.instanceUuid)
        ?? response.accessNodes[0]?.modules[0]

      loginStore(response.accessToken, response.user, response.accessNodes, selectedModule?.instanceUuid)
      toast.success(`Bienvenido de nuevo, ${response.user.firstName}!`)
      navigate(selectedModule?.route ?? '/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'No se pudo iniciar sesion.')
    }
  }

  return (
    <Box
      data-theme={mode}
      className="min-h-screen bg-[var(--himalaya-bg)] px-4 py-6 text-[var(--himalaya-text)] sm:px-6 lg:px-8"
    >
      <Box className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] shadow-[var(--himalaya-shadow)] lg:grid lg:grid-cols-[0.95fr_1.05fr]">
        <Box className="flex flex-col justify-between bg-[var(--himalaya-surface-soft)] p-6 sm:p-8 lg:p-10">
          <Stack spacing={5}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <HimalayaLogo className="h-12 w-16 shrink-0" />
              <Box>
                <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, fontWeight: 750 }}>
                  Himalaya
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Seguros y fianzas
                </Typography>
              </Box>
            </Stack>

            <Box className="max-w-xl">
              <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, fontWeight: 800, lineHeight: 1.2 }}>
                Acceso administrativo
              </Typography>
              <Typography className="mt-4" color="text.secondary">
                Panel interno para gestionar clientes, proveedores, productos, polizas,
                renovaciones y tareas de seguimiento del equipo.
              </Typography>
            </Box>
          </Stack>

          <Box className="mt-8 grid gap-3" sx={{ gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr' } }}>
            {accessHighlights.map((item) => (
              <Stack
                key={item}
                direction="row"
                spacing={1.25}
                className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-3"
                sx={{ alignItems: 'center' }}
              >
                <CheckCircle2 size={18} color="var(--himalaya-primary)" />
                <Typography variant="body2">{item}</Typography>
              </Stack>
            ))}
          </Box>
        </Box>

        <Box className="flex items-center justify-center p-6 sm:p-8 lg:p-10">
          <Box className="w-full max-w-md">
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={3}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Box className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--himalaya-primary-soft)]">
                      <ShieldCheck size={20} color="var(--himalaya-primary)" />
                    </Box>
                    <Typography variant="overline" color="text.secondary">
                      Acceso Seguro
                    </Typography>
                  </Stack>
                  <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, fontWeight: 750 }}>
                    Iniciar sesion
                  </Typography>
                  <Typography color="text.secondary">
                    Ingresa tus credenciales del sistema para continuar.
                  </Typography>
                </Stack>

                <Stack spacing={2.5}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Correo electronico *"
                        type="email"
                        fullWidth
                        autoComplete="email"
                        error={!!errors.email}
                        helperText={errors.email?.message ?? ' '}
                      />
                    )}
                  />
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Contrasena *"
                        type={showPassword ? 'text' : 'password'}
                        fullWidth
                        autoComplete="current-password"
                        error={!!errors.password}
                        helperText={errors.password?.message ?? ' '}
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="mostrar u ocultar contrasena"
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                >
                                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    )}
                  />
                  {instanceOptions.length > 1 ? (
                    <Controller
                      name="instanceUuid"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel id="module-instance-label">Modulo *</InputLabel>
                          <Select {...field} labelId="module-instance-label" label="Modulo *">
                            {instanceOptions.map((module) => (
                              <MenuItem key={module.instanceUuid} value={module.instanceUuid}>
                                {module.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  ) : null}
                  <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1, justifyContent: 'space-between' }}>
                    <FormControlLabel control={<Checkbox />} label="Recordar acceso" />
                    <Button variant="text">Recuperar clave</Button>
                  </Stack>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isSubmitting || (instanceOptions.length > 1 && !selectedInstanceUuid)}
                    endIcon={isSubmitting ? undefined : <ArrowRight size={18} />}
                    startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <LockKeyhole size={18} />}
                  >
                    {isSubmitting ? 'Iniciando sesion...' : instanceOptions.length > 1 ? 'Entrar al modulo' : 'Entrar al sistema'}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
