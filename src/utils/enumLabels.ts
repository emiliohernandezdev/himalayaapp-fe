/** Spanish label maps for all backend enum values */

export const providerStatusLabels: Record<string, string> = {
  Active: 'Activo',
  Inactive: 'Inactivo',
  UnderReview: 'En revisión',
}

export const providerTypeLabels: Record<string, string> = {
  InsuranceCompany: 'Aseguradora',
  SuretyCompany: 'Afianzadora',
  ServiceProvider: 'Proveedor de Servicios',
}

export const productCategoryLabels: Record<string, string> = {
  Insurance: 'Seguros',
  SuretyBond: 'Fianzas',
  Assistance: 'Asistencias',
}

export const productStatusLabels: Record<string, string> = {
  Active: 'Activo',
  Inactive: 'Inactivo',
  Draft: 'Borrador',
}

export const clientTypeLabels: Record<string, string> = {
  Individual: 'Persona Física',
  Company: 'Empresa',
}

export const clientStatusLabels: Record<string, string> = {
  Active: 'Activo',
  Inactive: 'Inactivo',
  Prospect: 'Prospecto',
}

export const policyStatusLabels: Record<string, string> = {
  Active: 'Vigente',
  Draft: 'Borrador',
  Expired: 'Vencida',
  Cancelled: 'Cancelada',
  PendingRenewal: 'Pendiente de Renovación',
}

export const caseStatusLabels: Record<string, string> = {
  Pending: 'Pendiente',
  InProgress: 'En Progreso',
  WaitingForClient: 'Esperando Cliente',
  WaitingForProvider: 'Esperando Proveedor',
  Closed: 'Cerrado',
  Cancelled: 'Cancelado',
}

export const casePriorityLabels: Record<string, string> = {
  Low: 'Baja',
  Medium: 'Media',
  High: 'Alta',
  Urgent: 'Urgente',
}

export const caseTypeLabels: Record<string, string> = {
  Claim: 'Reclamo',
  Renewal: 'Renovación',
  Endorsement: 'Endoso',
  Payment: 'Pago',
  Documentation: 'Documentación',
  GeneralSupport: 'Soporte General',
}

/** Generic helper: translate or return original value */
export function t(map: Record<string, string>, value: string | undefined | null): string {
  if (!value) return '—'
  return map[value] ?? value
}

export const esESGrid = {
  noRowsLabel: 'No hay filas',
  noResultsOverlayLabel: 'No se encontraron resultados.',
  toolbarDensity: 'Densidad',
  toolbarDensityLabel: 'Densidad',
  toolbarDensityCompact: 'Compacta',
  toolbarDensityStandard: 'Estándar',
  toolbarDensityComfortable: 'Cómoda',
  toolbarColumns: 'Columnas',
  toolbarColumnsLabel: 'Seleccionar columnas',
  toolbarFilters: 'Filtros',
  toolbarFiltersLabel: 'Mostrar filtros',
  toolbarFiltersTooltipHide: 'Ocultar filtros',
  toolbarFiltersTooltipShow: 'Mostrar filtros',
  toolbarQuickFilterPlaceholder: 'Buscar…',
  toolbarQuickFilterLabel: 'Buscar',
  toolbarQuickFilterDeleteIconLabel: 'Limpiar',
  toolbarExport: 'Exportar',
  toolbarExportLabel: 'Exportar',
  toolbarExportCSV: 'Descargar como CSV',
  toolbarExportPrint: 'Imprimir',
  columnsPanelTextFieldLabel: 'Buscar columna',
  columnsPanelTextFieldPlaceholder: 'Título de columna',
  columnsPanelDragIconLabel: 'Reordenar columna',
  columnsPanelShowAllButton: 'Mostrar todo',
  columnsPanelHideAllButton: 'Ocultar todo',
  filterPanelAddFilter: 'Agregar filtro',
  filterPanelRemoveAll: 'Eliminar todos',
  filterPanelDeleteIconLabel: 'Eliminar',
  filterPanelLinkOperator: 'Operador lógico',
  filterPanelOperators: 'Operadores',
  filterPanelOperatorAnd: 'Y',
  filterPanelOperatorOr: 'O',
  filterPanelColumns: 'Columnas',
  filterPanelInputLabel: 'Valor',
  filterPanelInputPlaceholder: 'Valor de filtro',
  filterOperatorContains: 'contiene',
  filterOperatorEquals: 'es igual a',
  filterOperatorStartsWith: 'comienza con',
  filterOperatorEndsWith: 'termina con',
  filterOperatorIs: 'es',
  filterOperatorNot: 'no es',
  filterOperatorAfter: 'es posterior a',
  filterOperatorOnOrAfter: 'es posterior o igual a',
  filterOperatorBefore: 'es anterior a',
  filterOperatorOnOrBefore: 'es anterior o igual a',
  filterOperatorIsEmpty: 'está vacío',
  filterOperatorIsNotEmpty: 'no está vacío',
  filterOperatorIsAnyOf: 'es cualquiera de',
  filterValueAny: 'cualquiera',
  filterValueTrue: 'verdadero',
  filterValueFalse: 'falso',
  columnMenuLabel: 'Menú',
  columnMenuShowColumns: 'Mostrar columnas',
  columnMenuManageColumns: 'Administrar columnas',
  columnMenuFilter: 'Filtrar',
  columnMenuHideColumn: 'Ocultar columna',
  columnMenuUnsort: 'Sin ordenar',
  columnMenuSortAsc: 'Orden ascendente',
  columnMenuSortDesc: 'Orden descendente',
  columnHeaderFiltersTooltip: 'Ver filtros',
  columnHeaderFiltersLabel: 'Mostrar filtros',
  columnHeaderSortIconLabel: 'Ordenar',
  footerRowSelected: (count: number) =>
    count !== 1
      ? `${count.toLocaleString()} filas seleccionadas`
      : `${count.toLocaleString()} fila seleccionada`,
  footerTotalRows: 'Filas Totales:',
  footerTotalVisibleRows: (visibleCount: number, totalCount: number) =>
    `${visibleCount.toLocaleString()} de ${totalCount.toLocaleString()}`,
  checkboxSelectionHeaderName: 'Selección por casilla',
  checkboxSelectionSelectAllRows: 'Seleccionar todas las filas',
  checkboxSelectionUnselectAllRows: 'Deseleccionar todas las filas',
  checkboxSelectionSelectRow: 'Seleccionar fila',
  checkboxSelectionUnselectRow: 'Deseleccionar fila',
  booleanCellTrueLabel: 'sí',
  booleanCellFalseLabel: 'no',
  actionsCellMore: 'más',
  pinToLeft: 'Anclar a la izquierda',
  pinToRight: 'Anclar a la derecha',
  unpin: 'Desanclar',
  treeDataGroupingHeaderName: 'Grupo',
  treeDataExpand: 'ver hijos',
  treeDataCollapse: 'ocultar hijos',
  groupingColumnHeaderName: 'Grupo',
  noResultsFound: 'No se encontraron resultados',
}

