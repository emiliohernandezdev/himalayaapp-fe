import type { GridRowId, GridRowSelectionModel } from '@mui/x-data-grid'

export function createEmptyGridSelectionModel(): GridRowSelectionModel {
  return { type: 'include', ids: new Set<GridRowId>() }
}

export function getSelectedGridIds(rowSelectionModel: GridRowSelectionModel | GridRowId[], allRowIds: GridRowId[]) {
  if (Array.isArray(rowSelectionModel)) {
    return rowSelectionModel.map(String)
  }

  if (rowSelectionModel.type === 'exclude') {
    return allRowIds.filter((id) => !rowSelectionModel.ids.has(id)).map(String)
  }

  return Array.from(rowSelectionModel.ids).map(String)
}
