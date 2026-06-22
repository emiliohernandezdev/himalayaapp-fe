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
  email: z.string().email('Ingresa un correo electrónico válido').min(1, 'El correo es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
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
      toast.success(`¡Bienvenido de nuevo, ${response.user.firstName}!`)
      navigate(selectedModule?.route ?? '/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'No se pudo iniciar sesión.')
    }
  }

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 3,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      '& fieldset': {
        borderColor: 'divider',
        transition: 'border-color 0.2s',
      },
      '&:hover fieldset': {
        borderColor: 'primary.main',
      },
      '&.Mui-focused': {
        bgcolor: 'background.paper',
        '& fieldset': {
          borderWidth: '2px',
          borderColor: 'primary.main',
        },
        boxShadow: (theme: any) => theme.palette.mode === 'dark'
          ? '0 0 0 4px rgba(2, 132, 199, 0.25)'
          : '0 0 0 4px rgba(2, 132, 199, 0.12)',
      },
    },
    '& .MuiInputLabel-root': {
      fontWeight: 550,
      '&.Mui-focused': {
        fontWeight: 700,
      }
    },
  }

  return (
    <Box
      data-theme={mode}
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        px: { xs: 2, sm: 3, lg: 4 },
        py: { xs: 3, sm: 4 },
        color: 'text.primary',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box 
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '0.95fr 1.05fr' },
          width: '100%',
          maxWidth: { xs: '480px', lg: '1200px' },
          minHeight: { xs: 'auto', lg: 'calc(100vh - 48px)' },
          overflow: 'hidden',
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: 'var(--himalaya-shadow)',
        }}
      >
        {/* Left Column: Premium Mountain Branding */}
        <Box 
          sx={{
            position: 'relative',
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #090d16 0%, #0c182e 50%, #080d19 100%)',
            p: { xs: 4, sm: 5, lg: 6 },
            color: 'white',
          }}
        >
          {/* Ambient Glows */}
          <Box
            sx={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '80%',
              height: '80%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(2, 132, 199, 0.15) 0%, rgba(2, 132, 199, 0) 70%)',
              filter: 'blur(40px)',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: '10%',
              right: '-10%',
              width: '80%',
              height: '80%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, rgba(124, 58, 237, 0) 70%)',
              filter: 'blur(40px)',
              pointerEvents: 'none',
            }}
          />

          {/* Logo and Header */}
          <Stack spacing={5} sx={{ position: 'relative', zIndex: 10 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <HimalayaLogo className="h-12 w-16 shrink-0 text-sky-100" />
              <Box>
                <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, fontWeight: 900, letterSpacing: '0.04em', color: '#f0f9ff' }}>
                  Himalaya
                </Typography>
                <Typography variant="body2" sx={{ color: '#bae6fd', opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.72rem' }}>
                  Seguros y fianzas
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ maxWidth: 500 }}>
              <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.85rem', sm: '2.5rem', md: '2.75rem' }, fontWeight: 900, lineHeight: 1.15, background: 'linear-gradient(to right, #ffffff, #e0f2fe, #bae6fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
                Protección que trasciende
              </Typography>
              <Typography sx={{ mt: 2.5, color: '#e0f2fe', opacity: 0.8, fontSize: '0.95rem', lineHeight: 1.6, fontWeight: 550 }}>
                Gestión unificada de pólizas, reclamos y relaciones comerciales con la robustez y solidez que nos define.
              </Typography>
            </Box>
          </Stack>

          {/* Majestic Mountain SVG (Occupying the empty space elegantly) */}
          <Box sx={{ position: 'relative', zIndex: 10, width: '100%', my: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
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

        {/* Right Column: Premium Form */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            p: { xs: 4, sm: 5, lg: 6 },
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: '400px' }}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={4}>
                <Stack spacing={1.5}>
                  {/* Logo only on mobile/tablet */}
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', display: { xs: 'flex', lg: 'none' }, mb: 2 }}>
                    <HimalayaLogo className="h-10 w-14 shrink-0 text-primary-main" />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1.1 }}>
                        Himalaya
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.85, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.65rem' }}>
                        Seguros y fianzas
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                    <Box 
                      sx={{ 
                        display: 'grid', 
                        placeItems: 'center', 
                        width: 36,
                        height: 36,
                        borderRadius: 2, 
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(2, 132, 199, 0.2)' : 'rgba(2, 132, 199, 0.08)',
                        color: 'primary.main',
                      }}
                    >
                      <ShieldCheck size={20} />
                    </Box>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: 1.2 }}>
                      Acceso Seguro
                    </Typography>
                  </Stack>
                  <Typography variant="h4" sx={{ fontSize: { xs: '1.65rem', sm: '2.1rem' }, fontWeight: 900, letterSpacing: '-0.02em' }}>
                    Iniciar sesión
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    Ingresa tus credenciales del sistema para continuar.
                  </Typography>
                </Stack>

                {sessionExpired && (
                  <Alert
                    severity="warning"
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      borderColor: 'warning.main',
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(217, 119, 6, 0.15)' : 'rgba(217, 119, 6, 0.06)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      alignItems: 'center',
                    }}
                  >
                    Tu sesión expiró o fue cerrada. Por favor, inicia sesión de nuevo.
                  </Alert>
                )}

                <Stack spacing={3}>
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
                        sx={textFieldSx}
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
                        sx={textFieldSx}
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
                  {instanceOptions.length > 1 ? (
                    <Controller
                      name="instanceUuid"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth sx={textFieldSx}>
                          <InputLabel id="module-instance-label">Módulo *</InputLabel>
                          <Select {...field} labelId="module-instance-label" label="Módulo *">
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
                  
                  <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1, justifyContent: 'space-between', mt: -1 }}>
                    <FormControlLabel 
                      control={
                        <Checkbox 
                          sx={{ 
                            color: 'primary.main',
                            '&.Mui-checked': {
                              color: 'primary.main',
                            }
                          }} 
                        />
                      } 
                      label={
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          Recordar acceso
                        </Typography>
                      } 
                    />
                    <Button 
                      variant="text" 
                      sx={{ 
                        textTransform: 'none', 
                        fontWeight: 700, 
                        color: 'primary.main',
                        borderRadius: 2,
                        fontSize: '0.85rem',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        }
                      }}
                    >
                      Recuperar clave
                    </Button>
                  </Stack>

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isSubmitting || (instanceOptions.length > 1 && !selectedInstanceUuid)}
                    endIcon={isSubmitting ? undefined : <ArrowRight size={18} />}
                    startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <LockKeyhole size={18} />}
                    sx={{
                      py: 1.6,
                      mt: 1,
                      borderRadius: 3,
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      textTransform: 'none',
                      boxShadow: (theme) => theme.palette.mode === 'dark'
                        ? '0 8px 24px rgba(2, 132, 199, 0.3)'
                        : '0 8px 20px rgba(2, 132, 199, 0.18)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: (theme) => theme.palette.mode === 'dark'
                          ? '0 12px 30px rgba(2, 132, 199, 0.45)'
                          : '0 12px 26px rgba(2, 132, 199, 0.28)',
                      },
                      '&:active': {
                        transform: 'translateY(1px)',
                      }
                    }}
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
