import React, { useState } from 'react'
import {
  Dialog,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Stack,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  MenuItem
} from '@mui/material'
import { X, Check } from 'lucide-react'

interface Option {
  value: string | number
  label: string
  icon?: React.ReactNode
}

interface ResponsiveSelectProps {
  label: string
  value: string | number
  onChange: (newValue: any) => void
  options: Option[]
  error?: boolean
  helperText?: string
  disabled?: boolean
  fullWidth?: boolean
}

export function ResponsiveSelect({
  label,
  value,
  onChange,
  options,
  error = false,
  helperText,
  disabled = false,
  fullWidth = true
}: ResponsiveSelectProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [open, setOpen] = useState(false)

  const selectedOption = options.find((opt) => opt.value === value)

  if (!isMobile) {
    return (
      <TextField
        select
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        helperText={helperText}
        disabled={disabled}
        fullWidth={fullWidth}
        slotProps={{
          select: {
            MenuProps: {
              slotProps: {
                paper: {
                  sx: {
                    borderRadius: 3,
                    boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
                    border: '1px solid',
                    borderColor: 'divider',
                    mt: 0.5,
                  }
                }
              }
            }
          }
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {option.icon}
              <span>{option.label}</span>
            </Box>
          </MenuItem>
        ))}
      </TextField>
    )
  }

  // Mobile Version: Opens a clean dialog
  return (
    <>
      <TextField
        label={label}
        value={selectedOption ? selectedOption.label : ''}
        error={error}
        helperText={helperText}
        disabled={disabled}
        fullWidth={fullWidth}
        onClick={() => {
          if (!disabled) setOpen(true)
        }}
        slotProps={{
          input: {
            readOnly: true,
            startAdornment: selectedOption?.icon ? (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, color: 'text.secondary' }}>
                {selectedOption.icon}
              </Box>
            ) : undefined,
            sx: {
              cursor: disabled ? 'default' : 'pointer',
              '& input': { cursor: disabled ? 'default' : 'pointer' }
            }
          }
        }}
      />

      <Dialog
        fullScreen
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'background.default',
              display: 'flex',
              flexDirection: 'column'
            }
          }
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <Box>
            <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.2 }}>
              Seleccionar
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              {label.replace(' *', '')}
            </Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <X size={20} />
          </IconButton>
        </Stack>

        {/* Options List */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
          <List disablePadding>
            {options.map((option) => {
              const isSelected = option.value === value

              return (
                <ListItemButton
                  key={option.value}
                  selected={isSelected}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  sx={{
                    borderRadius: 3,
                    mb: 0.5,
                    py: 1.75,
                    px: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    '&.Mui-selected': {
                      bgcolor: 'primary.soft',
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.soft',
                      }
                    }
                  }}
                >
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    {option.icon && (
                      <Box sx={{ display: 'flex', alignItems: 'center', color: isSelected ? 'primary.main' : 'text.secondary' }}>
                        {option.icon}
                      </Box>
                    )}
                    <ListItemText
                      primary={option.label}
                      slotProps={{
                        primary: {
                          variant: 'body1',
                          sx: { fontWeight: isSelected ? 800 : 500 }
                        }
                      }}
                    />
                  </Stack>
                  {isSelected && (
                    <Check size={18} color="var(--himalaya-primary)" style={{ strokeWidth: 3 }} />
                  )}
                </ListItemButton>
              )
            })}
          </List>
        </Box>
      </Dialog>
    </>
  )
}
