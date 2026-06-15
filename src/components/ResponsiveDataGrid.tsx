import { Box, Stack, TablePagination, Typography, useMediaQuery, useTheme } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { DataGridProps, GridColDef, GridValidRowModel } from '@mui/x-data-grid'
import type { ReactNode } from 'react'
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

  if (isMobile) {
    return (
      <Box
        sx={{
          width: '100%',
          minWidth: 0,
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 4px 14px 0 rgba(0,0,0,0.05)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
          {mobileRows.map((row) => {
            const id = props.getRowId ? props.getRowId(row) : row.id
            return (
              <Box
                key={String(id)}
                onClick={(event) => props.onRowClick?.({ id, row } as any, event as any, {} as any)}
                sx={{
                  px: 2,
                  py: 1,
                  cursor: props.onRowClick ? 'pointer' : 'default',
                  '&:hover': { bgcolor: props.onRowClick ? 'action.hover' : undefined },
                }}
              >
                {mobileRenderRow ? mobileRenderRow(row) : defaultMobileRenderRow(columns, row)}
              </Box>
            )
          })}
          {mobileRows.length === 0 && (
            <Box sx={{ px: 2, py: 5, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {props.loading ? 'Cargando...' : 'No hay filas'}
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
        borderRadius: { xs: 2, sm: 3 },
        overflow: 'hidden',
        boxShadow: '0 4px 14px 0 rgba(0,0,0,0.05)',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <DataGrid
        {...props}
        columns={columns}
        localeText={{ ...esESGrid, ...localeText }}
        pageSizeOptions={pageSizeOptions ?? [10, 25, 50]}
        disableRowSelectionOnClick={props.disableRowSelectionOnClick ?? true}
        showToolbar={props.showToolbar ?? true}
        sx={[
          {
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, color: 'text.secondary' },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary' },
            '& .MuiDataGrid-footerContainer': { borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' },
            '& .MuiDataGrid-toolbarContainer': { px: 1.5, py: 1, gap: 1, borderBottom: '1px solid', borderColor: 'divider' },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': { outline: 'none' },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      />
    </Box>
  )
}
