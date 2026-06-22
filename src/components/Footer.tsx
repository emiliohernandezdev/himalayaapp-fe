import { Box, Container, Stack, Typography } from '@mui/material'
import { AtSign, Mail, MapPin, Phone, Share2, Smartphone } from 'lucide-react'
import { HimalayaLogo } from './HimalayaLogo'

const companyContact = [
  {
    title: 'Base operativa',
    lines: ['Ciudad de Guatemala', 'Atencion administrativa y comercial'],
    icon: MapPin,
  },
  {
    title: 'Telefonos',
    lines: ['+502 2292 1716', '+502 5975 9782'],
    icon: Phone,
  },
  {
    title: 'Gerencia',
    lines: ['gerencia@seguroshimalaya.com', 'Atencion a clientes y aliados'],
    icon: Mail,
  },
]

const socialProfiles = [
  { label: 'Facebook', value: 'Facebook', href: 'https://www.facebook.com/profile.php?id=100093714603742', icon: Share2 },
  { label: 'Instagram', value: '@seguros_himalaya', href: 'https://www.instagram.com/seguros_himalaya', icon: AtSign },
  { label: 'Celular', value: '+502 5975 9782', href: 'tel:+50259759782', icon: Smartphone },
]

export function Footer() {
  return (
    <Box component="footer" sx={{ px: { xs: 1.5, sm: 3 }, pb: 3 }}>
      <Container maxWidth="xl" disableGutters>
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: { xs: 4, sm: 5 },
            border: '1px solid',
            borderColor: 'divider',
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(7,17,31,0.96), rgba(16,40,61,0.82))'
              : 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(224,242,254,0.78))',
            boxShadow: 'var(--himalaya-shadow)',
            p: { xs: 2, sm: 3, md: 4 },
            '&::before': {
              content: '""',
              position: 'absolute',
              right: -120,
              top: -160,
              width: 420,
              height: 420,
              borderRadius: '50%',
              background: 'radial-gradient(circle, color-mix(in srgb, var(--himalaya-primary) 20%, transparent), transparent 68%)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 'auto 0 0 0',
              height: { xs: 60, sm: 160 },
              opacity: 0.12,
              background:
                'url("data:image/svg+xml,%3Csvg viewBox=%270 0 900 180%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath d=%27M0 180L160 60L270 120L420 30L570 142L720 54L900 180H0Z%27 fill=%27%23075985%27/%3E%3Cpath d=%27M420 30L382 70H462L420 30Z%27 fill=%27%23e0f2fe%27/%3E%3C/svg%3E") bottom center / cover no-repeat',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box sx={{ display: 'grid', placeItems: 'center', width: { xs: 56, sm: 72 }, height: { xs: 46, sm: 58 }, borderRadius: { xs: 2, sm: 3 }, bgcolor: 'action.selected', color: 'primary.main', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                    <HimalayaLogo className="h-8 w-12 sm:h-12 sm:w-16" />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1, fontSize: { xs: '1.15rem', sm: '1.25rem', md: '1.5rem' } }}>
                      Seguros Himalaya
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                      Aplicativo de manejo de seguros
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: 440, lineHeight: 1.8 }}>
                  Gestion de seguros, fianzas, proveedores, polizas y seguimiento operativo.
                </Typography>
              </Stack>

              <Box className="grid gap-2 sm:gap-3 md:grid-cols-3">
                {companyContact.map((item) => {
                  const Icon = item.icon
                  return (
                    <Box key={item.title} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 1.5, sm: 2 } }}>
                      <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1.5} sx={{ alignItems: { xs: 'center', sm: 'flex-start' } }}>
                        <Box sx={{ display: 'grid', placeItems: 'center', width: { xs: 36, sm: 42 }, height: { xs: 36, sm: 42 }, borderRadius: 2, bgcolor: 'action.selected', color: 'primary.main', flexShrink: 0 }}>
                          <Icon size={17} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>{item.title}</Typography>
                          {item.lines.map((line) => (
                            <Typography key={line} variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: { xs: '0.75rem', sm: '0.8rem' }, lineHeight: 1.3 }}>
                              {line}
                            </Typography>
                          ))}
                        </Box>
                      </Stack>
                    </Box>
                  )
                })}
              </Box>
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ mt: { xs: 2.5, sm: 4 }, alignItems: { xs: 'stretch', md: 'center' }, gap: 2, justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                {socialProfiles.map((item) => {
                  const Icon = item.icon
                  return (
                    <Box
                      key={item.label}
                      component="a"
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                      sx={{
                        borderRadius: 99,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        textDecoration: 'none',
                        px: 1.5,
                        py: { xs: 0.65, sm: 0.85 },
                        transition: 'all 0.18s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Icon size={14} color="var(--himalaya-primary)" />
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>{item.value}</Typography>
                      </Stack>
                    </Box>
                  )
                })}
              </Stack>

              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, textAlign: { xs: 'center', md: 'right' }, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                Himalaya Seguros y Fianzas
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
