import { Box, Checkbox, Skeleton, Stack, TablePagination, Typography, useMediaQuery, useTheme } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { DataGridProps, GridColDef, GridRowId, GridRowSelectionModel, GridValidRowModel } from '@mui/x-data-grid'
import { useCallback, type ReactNode } from 'react'
import { esESGrid } from '../utils/enumLabels'

type ResponsiveDataGridProps<R extends GridValidRowModel> = DataGridProps<R> & {
  height?: number
  mobileHeight?: number
  mobileRenderRow?: (row: R) => ReactNode
}

function defaultMobileRenderRow<R extends GridValidRowModel>(columns: readonly GridColDef<R>[], row: R) {
  const readableColumns = columns.filter((column) => column.field !== 'actions').slice(0, 4)

  return (
    <Stack spacing={0.75} sx={{ width: '100%', minWidth: 0, py: 1 }}>
      {readableColumns.map((column, index) => {
        let rawValue = row[column.field]
        if (column.valueGetter) {
          rawValue = (column.valueGetter as any)(rawValue, row, column)
        }

        let valueStr = rawValue == null || rawValue === '' ? '—' : String(rawValue)
        if (typeof rawValue === 'object' && rawValue !== null) {
          valueStr = (rawValue as any).displayName || (rawValue as any).name || '—'
        }
        if (column.valueFormatter) {
          valueStr = String((column.valueFormatter as any)(rawValue, row, column))
        }

        const renderValue = () => {
          if (column.renderCell) {
            return column.renderCell({
              value: rawValue,
              row,
              field: column.field,
              id: row.uuid || row.id,
            } as any)
          }
          return (
            <Typography variant="body2" sx={{ color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {valueStr}
            </Typography>
          )
        }

        return (
          <Box key={column.field} sx={{ minWidth: 0 }}>
            {index === 0 ? (
              <Typography sx={{ fontWeight: 800, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {valueStr}
              </Typography>
            ) : (
              <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 82, flexShrink: 0 }}>
                  {column.headerName ?? column.field}
                </Typography>
                {renderValue()}
              </Stack>
            )}
          </Box>
        )
      })}
    </Stack>
  )
}

export function ResponsiveDataGrid<R extends GridValidRowModel>({
  height = 600,
  mobileHeight = 520,
  mobileRenderRow,
  columns,
  sx,
  localeText,
  pageSizeOptions,
  ...props
}: ResponsiveDataGridProps<R>) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const paginationModel = props.paginationModel
  const page = paginationModel?.page ?? 0
  const pageSize = paginationModel?.pageSize ?? 10
  const rows = [...(props.rows ?? [])]
  const mobileRows = rows.slice(page * pageSize, page * pageSize + pageSize)
  const numericPageSizeOptions = (pageSizeOptions ?? [10, 25, 50]).filter((option): option is number => typeof option === 'number')
  const getRowId = (row: R) => props.getRowId ? props.getRowId(row) : row.id
  const defaultDesktopRowHeight = useCallback(() => 'auto' as const, [])
  const isMobileRowSelected = (id: GridRowId) => {
    const model = props.rowSelectionModel as GridRowSelectionModel | GridRowId[] | undefined
    if (!model) return false
    if (Array.isArray(model)) return model.includes(id)
    return model.type === 'exclude' ? !model.ids.has(id) : model.ids.has(id)
  }
  const toggleMobileRowSelection = (id: GridRowId) => {
    const allRowIds = rows.map(getRowId)
    const currentModel = props.rowSelectionModel as GridRowSelectionModel | GridRowId[] | undefined
    const currentIds = Array.isArray(currentModel)
      ? new Set<GridRowId>(currentModel)
      : currentModel?.type === 'exclude'
        ? new Set<GridRowId>(allRowIds.filter((rowId) => !currentModel.ids.has(rowId)))
        : new Set<GridRowId>(currentModel?.ids ?? [])

    if (currentIds.has(id)) {
      currentIds.delete(id)
    } else {
      currentIds.add(id)
    }

    props.onRowSelectionModelChange?.({ type: 'include', ids: currentIds }, {} as any)
  }

  const checkboxSx = {
    width: 34,
    height: 34,
    borderRadius: 2,
    color: 'primary.main',
    transition: 'background-color 0.16s ease, transform 0.16s ease',
    '&:hover': {
      bgcolor: 'action.selected',
      transform: 'scale(1.04)',
    },
    '& .MuiSvgIcon-root': {
      width: 22,
      height: 22,
      borderRadius: 1.15,
      color: 'transparent',
      border: '2px solid',
      borderColor: 'primary.main',
      bgcolor: 'transparent',
      boxShadow: '0 0 0 3px color-mix(in srgb, var(--himalaya-primary) 8%, transparent)',
      transition: 'all 0.16s ease',
    },
    '&.Mui-checked .MuiSvgIcon-root, &.MuiCheckbox-indeterminate .MuiSvgIcon-root': {
      color: 'primary.contrastText',
      borderColor: 'primary.main',
      bgcolor: 'primary.main',
      boxShadow: '0 8px 18px color-mix(in srgb, var(--himalaya-primary) 28%, transparent)',
    },
    '&.Mui-disabled': {
      opacity: 0.45,
    },
  } as const

  if (isMobile) {
    const isLoading = Boolean(props.loading)

    return (
      <Box
        sx={{
          width: '100%',
          minWidth: 0,
          bgcolor: 'background.paper',
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: 'var(--himalaya-shadow)',
          border: '1px solid',
          borderColor: 'divider',
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(12,27,42,0.94), rgba(16,40,61,0.72))'
            : 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(238,247,255,0.78))',
        }}
      >
        <Stack spacing={1.25} sx={{ p: 1.25 }}>
          {isLoading && mobileRows.length === 0
            ? Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
              <Box
                key={index}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                    {props.checkboxSelection && <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 1.5 }} />}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Skeleton variant="text" width="72%" height={24} />
                      <Skeleton variant="text" width="44%" height={16} />
                    </Box>
                  </Stack>
                  <Skeleton variant="rounded" width="100%" height={12} sx={{ borderRadius: 99 }} />
                  <Skeleton variant="text" width="64%" height={18} />
                </Stack>
              </Box>
            ))
            : mobileRows.map((row) => {
            const id = getRowId(row)
            const selected = isMobileRowSelected(id)
            return (
              <Box
                key={String(id)}
                onClick={(event) => props.onRowClick?.({ id, row } as any, event as any, {} as any)}
                sx={{
                  px: 2,
                  py: 1.25,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: selected ? 'primary.main' : 'divider',
                  cursor: props.onRowClick ? 'pointer' : 'default',
                  bgcolor: selected ? 'action.selected' : undefined,
                  boxShadow: selected ? '0 12px 26px rgba(7,89,133,0.12)' : undefined,
                  '&:hover': { bgcolor: props.onRowClick ? 'action.hover' : undefined, borderColor: 'primary.main' },
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                  {props.checkboxSelection && (
                    <Checkbox
                      checked={selected}
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleMobileRowSelection(id)
                      }}
                      sx={{ ...checkboxSx, mt: -0.5, ml: -0.75, flexShrink: 0 }}
                    />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {mobileRenderRow ? mobileRenderRow(row) : defaultMobileRenderRow(columns, row)}
                  </Box>
                </Stack>
              </Box>
            )
          })}
          {!isLoading && mobileRows.length === 0 && (
            <Box sx={{ px: 2, py: 5, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No hay filas
              </Typography>
            </Box>
          )}
        </Stack>
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={numericPageSizeOptions}
          labelRowsPerPage="Filas por pagina:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          onPageChange={(_event, nextPage) => props.onPaginationModelChange?.({ page: nextPage, pageSize } as any, {} as any)}
          onRowsPerPageChange={(event) => props.onPaginationModelChange?.({ page: 0, pageSize: Number(event.target.value) } as any, {} as any)}
        />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        height: { xs: mobileHeight, sm: height },
        width: '100%',
        minWidth: 0,
        bgcolor: 'background.paper',
        borderRadius: { xs: 3, sm: 4 },
        overflow: 'hidden',
        boxShadow: 'var(--himalaya-shadow)',
        border: '1px solid',
        borderColor: 'divider',
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(12,27,42,0.96), rgba(16,40,61,0.78))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(238,247,255,0.82))',
        p: 1,
      }}
    >
      <DataGrid
        {...props}
        columns={columns}
        localeText={{ ...esESGrid, ...localeText }}
        pageSizeOptions={pageSizeOptions ?? [10, 25, 50]}
        disableRowSelectionOnClick={props.disableRowSelectionOnClick ?? true}
        showToolbar={props.showToolbar ?? true}
        getRowHeight={props.getRowHeight ?? defaultDesktopRowHeight}
        columnHeaderHeight={props.columnHeaderHeight ?? 58}
        sx={[
          {
            border: 'none',
            bgcolor: 'transparent',
            '& .MuiDataGrid-main': {
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: 'background.paper',
            },
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.selected', borderBottom: '1px solid', borderColor: 'divider' },
            '& .MuiDataGrid-columnHeader': { px: 1.5 },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6, fontSize: '0.72rem' },
            '& .MuiDataGrid-row': { transition: 'background-color 0.16s ease, box-shadow 0.16s ease', minHeight: '58px !important' },
            '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
            '& .MuiDataGrid-row.Mui-selected': { bgcolor: 'action.selected', '&:hover': { bgcolor: 'action.selected' } },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid',
              borderColor: 'divider',
              color: 'text.primary',
              py: 1.15,
              display: 'flex',
              alignItems: 'center',
              minHeight: '58px !important',
              lineHeight: 1.35,
            },
            '& .MuiDataGrid-cellContent': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
            '& .MuiDataGrid-cell .MuiChip-root': {
              maxWidth: '100%',
              borderRadius: 2,
              fontWeight: 800,
            },
            '& .MuiDataGrid-cell .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
            '& .MuiDataGrid-footerContainer': { borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
            '& .MuiDataGrid-toolbarContainer': { m: 1, mb: 0.75, px: 1.25, py: 1, gap: 1, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' },
            '& .MuiDataGrid-toolbarContainer .MuiButtonBase-root': { borderRadius: 99 },
            '& .MuiDataGrid-columnHeaderCheckbox, & .MuiDataGrid-cellCheckbox': {
              px: 1.25,
            },
            '& .MuiDataGrid-checkboxInput': {
              width: 34,
              height: 34,
              borderRadius: 2,
              color: 'primary.main',
              transition: 'background-color 0.16s ease, transform 0.16s ease',
              '&:hover': {
                bgcolor: 'action.selected',
                transform: 'scale(1.04)',
              },
              '& .MuiSvgIcon-root': {
                width: 22,
                height: 22,
                borderRadius: 1.15,
                color: 'transparent',
                border: '2px solid',
                borderColor: 'primary.main',
                bgcolor: 'transparent',
                boxShadow: '0 0 0 3px color-mix(in srgb, var(--himalaya-primary) 8%, transparent)',
                transition: 'all 0.16s ease',
              },
              '&.Mui-checked .MuiSvgIcon-root, &.MuiCheckbox-indeterminate .MuiSvgIcon-root': {
                color: 'primary.contrastText',
                borderColor: 'primary.main',
                bgcolor: 'primary.main',
                boxShadow: '0 8px 18px color-mix(in srgb, var(--himalaya-primary) 28%, transparent)',
              },
            },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': { outline: 'none' },
            '& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      />
    </Box>
  )
}
