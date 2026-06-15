import { Box, Container, Stack, Typography } from '@mui/material'
import { AtSign, BriefcaseBusiness, Mail, MapPin, Phone, Share2 } from 'lucide-react'

const companyContact = [
  {
    title: 'Direccion',
    lines: ['Ciudad de Guatemala, Guatemala', 'Atencion administrativa y comercial'],
    icon: MapPin,
  },
  {
    title: 'Contacto',
    lines: ['PBX: +502 0000-0000', 'correo@himalaya.com.gt'],
    icon: Phone,
  },
  {
    title: 'Correo',
    lines: ['Servicio al cliente y seguimiento', 'Lunes a viernes'],
    icon: Mail,
  },
]

const socialProfiles = [
  { label: 'Facebook', value: '@HimalayaSeguros', icon: Share2 },
  { label: 'Instagram', value: '@himalayaseguros', icon: AtSign },
  { label: 'LinkedIn', value: 'Himalaya Seguros y Fianzas', icon: BriefcaseBusiness },
]

export function Footer() {
  return (
    <Box
      component="footer"
      className="border-t border-[var(--himalaya-border)] bg-[var(--himalaya-surface)]"
    >
      <Container maxWidth="xl" className="py-8">
        <Stack spacing={3.5}>
          <Box className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
            <Box>
              <Typography variant="h6">Informacion corporativa</Typography>
              <Typography variant="body2" color="text.secondary" className="mt-1 max-w-xl">
                Canales oficiales de comunicacion para clientes, usuarios y personal autorizado.
              </Typography>
            </Box>

            <Box className="grid gap-3 md:grid-cols-3">
              {companyContact.map((item) => {
                const Icon = item.icon

                return (
                  <Box
                    key={item.title}
                    className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface-soft)] p-4"
                  >
                    <Stack spacing={1.25}>
                      <Box className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--himalaya-primary-soft)] text-[var(--himalaya-primary)]">
                        <Icon size={18} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle1">{item.title}</Typography>
                        {item.lines.map((line) => (
                          <Typography key={line} variant="body2" color="text.secondary">
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

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            sx={{
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              {socialProfiles.map((item) => {
              const Icon = item.icon

              return (
                <Box
                  key={item.label}
                  className="rounded-lg border border-[var(--himalaya-border)] px-3 py-2"
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Icon size={16} color="var(--himalaya-primary)" />
                    <Typography variant="body2">{item.value}</Typography>
                  </Stack>
                </Box>
              )
            })}
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Himalaya Seguros y Fianzas
            </Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
