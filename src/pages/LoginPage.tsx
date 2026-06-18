import {
  Alert,
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
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
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

export function LoginPage({ mode }: LoginPageProps) {
  const navigate = useNavigate()
  const loginStore = useAuthStore((state) => state.login)
  const sessionExpired = useAuthStore((state) => state.sessionExpired)
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
      label: `${node.nickname || node.title} / ${module.moduleNickname || module.title}`,
    })),
  )

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await loginApi(data.email, data.password, data.instanceUuid || undefined)

      if (response.requiresModuleSelection || !response.accessToken) {
        setAccessNodes(response.accessNodes)
        toast.info('Selecciona el módulo para continuar.')
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
        <Box className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0b1329] via-[#102244] to-[#080d1a] p-8 sm:p-10 lg:p-12 text-white">
          {/* Decorative ambient light glows */}
          <Box className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
          <Box className="absolute right-[-10%] top-[20%] h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          {/* Logo and Header */}
          <Stack spacing={5} className="relative z-10">
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <HimalayaLogo className="h-12 w-16 shrink-0 filter brightness-0 invert" />
              <Box>
                <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, fontWeight: 800, letterSpacing: '0.05em', color: '#f0f9ff' }}>
                  Himalaya
                </Typography>
                <Typography variant="body2" sx={{ color: 'sky.200', opacity: 0.8, fontWeight: 500 }}>
                  Seguros y fianzas
                </Typography>
              </Box>
            </Stack>

            <Box className="max-w-xl">
              <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.75rem', sm: '2.5rem', md: '2.75rem' }, fontWeight: 900, lineHeight: 1.15, background: 'linear-gradient(to right, #ffffff, #e0f2fe, #bae6fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Protección que trasciende
              </Typography>
              <Typography className="mt-4" sx={{ color: 'sky.100', opacity: 0.8, fontSize: '0.95rem', lineHeight: 1.6 }}>
                Gestión unificada de pólizas, reclamos y relaciones comerciales con la robustez y solidez que nos define.
              </Typography>
            </Box>
          </Stack>

          {/* Majestic Mountain SVG (Occupying the empty space elegantly) */}
          <Box className="relative z-10 w-full my-auto flex justify-center items-center py-6">
            <svg viewBox="0 0 800 450" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto max-h-[280px] drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]">
              {/* Stars/Snow in the background */}
              <circle cx="150" cy="80" r="1.5" fill="white" opacity="0.6" />
              <circle cx="280" cy="120" r="1" fill="white" opacity="0.4" />
              <circle cx="350" cy="50" r="2" fill="white" opacity="0.8" />
              <circle cx="450" cy="90" r="1" fill="white" opacity="0.5" />
              <circle cx="620" cy="70" r="1.5" fill="white" opacity="0.7" />
              <circle cx="710" cy="110" r="2" fill="white" opacity="0.9" />

              {/* Sun/Moon with glow */}
              <circle cx="400" cy="200" r="100" fill="url(#mountainSun)" opacity="0.25" />
              <circle cx="400" cy="200" r="30" fill="#bae6fd" opacity="0.7" />

              {/* Back Mountains (Deep silhouette) */}
              <path d="M-50 450 L180 180 L320 320 L580 120 L850 450 Z" fill="url(#backMtn)" opacity="0.4" />

              {/* Mid Mountains */}
              <path d="M50 450 L300 220 L440 340 L650 160 L900 450 Z" fill="url(#midMtn)" opacity="0.7" />

              {/* Front Mountains (Sharp, detailed) */}
              <path d="M-100 450 L120 250 L280 370 L480 200 L720 450 Z" fill="url(#frontMtn)" />

              {/* Snow Cap Detail on Front Mountains */}
              {/* Peak 1: (120, 250) */}
              <path d="M120 250 L85 300 L155 300 Z" fill="url(#snowGrad)" />
              {/* Peak 2: (480, 200) */}
              <path d="M480 200 L430 270 L530 270 Z" fill="url(#snowGrad)" />
              
              {/* Peak Detail on Mid Mountain (650, 160) */}
              <path d="M650 160 L610 220 L690 220 Z" fill="url(#snowGrad)" opacity="0.8" />

              {/* Soft clouds */}
              <path d="M 220,180 Q 250,160 280,180 T 340,180 Q 350,200 320,210 L 240,210 Z" fill="white" opacity="0.1" />
              <path d="M 500,230 Q 530,210 560,230 T 620,230 Q 630,250 600,260 L 520,260 Z" fill="white" opacity="0.07" />

              <defs>
                <radialGradient id="mountainSun" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="backMtn" x1="400" y1="120" x2="400" y2="450" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1e3a8a" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="midMtn" x1="400" y1="160" x2="400" y2="450" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#0b1329" />
                </linearGradient>
                <linearGradient id="frontMtn" x1="400" y1="200" x2="400" y2="450" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#050b14" />
                </linearGradient>
                <linearGradient id="snowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#93c5fd" />
                </linearGradient>
              </defs>
            </svg>
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

                {sessionExpired && (
                  <Alert
                    severity="warning"
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      borderColor: 'warning.main',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      alignItems: 'center',
                    }}
                  >
                    Tu sesión expiró o fue cerrada. Por favor, inicia sesión de nuevo.
                  </Alert>
                )}

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
                    {isSubmitting ? 'Iniciando sesión...' : instanceOptions.length > 1 ? 'Entrar al módulo' : 'Entrar al sistema'}
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
