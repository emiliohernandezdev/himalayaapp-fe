import React, { useState, useMemo, useEffect } from 'react'
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
  InputAdornment,
  Autocomplete
} from '@mui/material'
import { Search, X, Check } from 'lucide-react'

interface ResponsiveAutocompleteProps<T> {
  options: T[]
  getOptionLabel: (option: T) => string
  getOptionSubtitle?: (option: T) => string
  value: T | null
  onChange: (event: any, newValue: T | null) => void
  isOptionEqualToValue?: (option: T, value: T) => boolean
  noOptionsText?: string
  disabled?: boolean
  fullWidth?: boolean
  label: string
  error?: boolean
  helperText?: string
  placeholder?: string
  renderOption?: (props: React.HTMLAttributes<HTMLLIElement> & { key: React.Key }, option: T) => React.ReactNode
}

export function ResponsiveAutocomplete<T>({
  options,
  getOptionLabel,
  getOptionSubtitle,
  value,
  onChange,
  isOptionEqualToValue,
  noOptionsText = 'Sin resultados',
  disabled = false,
  fullWidth = true,
  label,
  error,
  helperText,
  placeholder,
  renderOption
}: ResponsiveAutocompleteProps<T>) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Reset search query when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('')
    }
  }, [open])

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const query = searchQuery.toLowerCase().trim()
    return options.filter((option) => {
      const optionLabel = getOptionLabel(option).toLowerCase()
      const optionSubtitle = getOptionSubtitle ? getOptionSubtitle(option).toLowerCase() : ''
      return optionLabel.includes(query) || optionSubtitle.includes(query)
    })
  }, [options, searchQuery, getOptionLabel, getOptionSubtitle])

  if (!isMobile) {
    return (
      <Autocomplete
        options={options}
        getOptionLabel={getOptionLabel}
        value={value}
        onChange={onChange}
        isOptionEqualToValue={isOptionEqualToValue}
        noOptionsText={noOptionsText}
        disabled={disabled}
        fullWidth={fullWidth}
        // Force the dropdown to portal to body so it doesn't get clipped by containers like Dialog
        disablePortal={false}
        renderOption={renderOption}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
              border: '1px solid',
              borderColor: 'divider',
              mt: 1,
              bgcolor: 'background.paper',
            }
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText}
            placeholder={placeholder}
          />
        )}
      />
    )
  }

  // Mobile Version
  return (
    <>
      <TextField
        label={label}
        value={value ? getOptionLabel(value) : ''}
        error={error}
        helperText={helperText}
        disabled={disabled}
        fullWidth={fullWidth}
        placeholder={placeholder}
        onClick={() => {
          if (!disabled) setOpen(true)
        }}
        slotProps={{
          input: {
            readOnly: true,
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

        {/* Search Input */}
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            fullWidth
            autoFocus
            variant="outlined"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <X size={16} />
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
        </Box>

        {/* Options List */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
          {filteredOptions.length === 0 ? (
            <Box sx={{ py: 6, textCenter: 'center', textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body1">
                {noOptionsText}
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredOptions.map((option, index) => {
                const isSelected = value
                  ? isOptionEqualToValue
                    ? isOptionEqualToValue(option, value)
                    : getOptionLabel(option) === getOptionLabel(value)
                  : false

                return (
                  <ListItemButton
                    key={index}
                    selected={isSelected}
                    onClick={() => {
                      onChange(null, option)
                      setOpen(false)
                    }}
                    sx={{
                      borderRadius: 3,
                      mb: 0.5,
                      py: 1.5,
                      px: 2,
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
                    <ListItemText
                      primary={getOptionLabel(option)}
                      secondary={getOptionSubtitle ? getOptionSubtitle(option) : undefined}
                      slotProps={{
                        primary: {
                          variant: 'body1',
                          sx: { fontWeight: isSelected ? 800 : 500 }
                        },
                        secondary: {
                          variant: 'caption',
                          sx: { opacity: 0.8 }
                        }
                      }}
                    />
                    {isSelected && (
                      <Check size={18} color="var(--himalaya-primary)" style={{ strokeWidth: 3 }} />
                    )}
                  </ListItemButton>
                )
              })}
            </List>
          )}
        </Box>
      </Dialog>
    </>
  )
}
