import { Box, Button, Checkbox, CircularProgress, FormControlLabel, Stack, TextField, Typography, InputAdornment, IconButton } from '@mui/material'
import type { PaletteMode } from '@mui/material/styles'
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useState } from 'react'
import { toast } from 'sonner'
import { HimalayaLogo } from '../components/HimalayaLogo'
import { loginApi } from '../api/maintenanceApi'
import { useAuthStore } from '../store/useAuthStore'

type LoginPageProps = {
  mode: PaletteMode
}

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido').min(1, 'El correo es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

const accessHighlights = [
  'Cartera, pólizas y renovaciones en una sola vista',
  'Seguimientos con responsables, notas y comentarios',
  'Mantenimientos para clientes, proveedores y productos',
]

export function LoginPage({ mode }: LoginPageProps) {
  const navigate = useNavigate()
  const loginStore = useAuthStore((state) => state.login)
  const [showPassword, setShowPassword] = useState(false)

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await loginApi(data.email, data.password)
      loginStore(response.accessToken, response.user)
      toast.success(`Bienvenido de nuevo, ${response.user.firstName}!`)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Error al iniciar sesión. Verifica tus credenciales.')
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
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Seguros y fianzas
                </Typography>
              </Box>
            </Stack>

            <Box className="max-w-xl">
              <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }, fontWeight: 800, lineHeight: 1.2 }}>
                Acceso administrativo
              </Typography>
              <Typography className="mt-4" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                Panel interno para gestionar clientes, proveedores, productos, pólizas,
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
                <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{item}</Typography>
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
                    <Typography variant="overline" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                      Acceso Seguro
                    </Typography>
                  </Stack>
                  <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, fontWeight: 750 }}>
                    Iniciar sesión
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
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
                        label="Correo electrónico *"
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
                        label="Contraseña *"
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
                                  aria-label="mostrar u ocultar contraseña"
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
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    sx={{
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 1,
                      justifyContent: 'space-between',
                    }}
                  >
                    <FormControlLabel control={<Checkbox />} label="Recordar acceso" />
                    <Button variant="text">Recuperar clave</Button>
                  </Stack>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isSubmitting}
                    endIcon={isSubmitting ? undefined : <ArrowRight size={18} />}
                    startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <LockKeyhole size={18} />}
                  >
                    {isSubmitting ? 'Iniciando sesión…' : 'Entrar al sistema'}
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
