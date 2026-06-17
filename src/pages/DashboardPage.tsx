import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Skeleton,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Fab,
  Grid,
  Paper,
  useTheme,
} from '@mui/material'
import { GridStack, type GridStackWidget } from 'gridstack'
import type { LucideIcon } from 'lucide-react'
import {
  Blocks,
  Building2,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  Eye,
  FileCheck2,
  FolderKanban,
  GripVertical,
  PackageCheck,
  Plus,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  Tags,
  UsersRound,
  Trash2,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react'
import * as Lucide from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import * as z from 'zod'
import dayjs from 'dayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import {
  fetchDashboardSummary,
  fetchUserDashboards,
  saveUserDashboardApi,
  removeUserDashboardApi,
  setPrimaryDashboardApi,
  fetchWidgets,
  fetchSystemHealth,
  fetchDashboardWidgetData,
  type SystemHealthDto,
} from '../api/maintenanceApi'
import { useApiQuery } from '../api/useApiQuery'
import { PieChart, BarChart, ScatterChart, SparkLineChart, Gauge, LineChart } from '@mui/x-charts'

type WidgetId = string

type WidgetLayout = {
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

type WidgetDefinition = {
  id: WidgetId
  title: string
  description: string
  icon: any
  category: string
  presentationType?: string
  defaultLayout: WidgetLayout
}

type FilterOperator = 'eq' | 'neq' | 'contains' | 'not_contains' | 'gt' | 'lt' | 'is_null' | 'is_not_null'

type WidgetFilter = {
  field: string
  operator: FilterOperator
  value: string
}

type WidgetSettings = {
  title?: string
  subtitle?: string
  tone?: 'primary' | 'success' | 'warning' | 'info'
  limit?: number
  priorityFilter?: 'all' | 'urgent' | 'high'
  showDescriptions?: boolean
  daysThreshold?: number
  barStyle?: 'colored' | 'primary'
  displayMode?: 'compact' | 'detailed'
  xAxisLabel?: string
  yAxisLabel?: string

  // Generic widget settings
  dataSource?: 'clientes' | 'polizas' | 'casos'
  chartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'sparkline'
  groupByField?: string
  aggregateFunction?: string
  aggregateField?: string
  daysWindow?: number
  fieldsToShow?: string[]
  filters?: WidgetFilter[]
  dateField?: string
  dateFrom?: string
  dateTo?: string
}

type WidgetInstance = {
  id: string
  widgetId: WidgetId
}

type DashboardConfig = {
  visible: Record<string, boolean>
  layout: Record<string, WidgetLayout>
  settings?: Record<string, WidgetSettings>
  instances?: WidgetInstance[]
}

type DashboardRecord = {
  uuid?: string
  name: string
  config: DashboardConfig
  isPrimary?: boolean
}

const dashboardNameSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(60, 'El nombre no puede superar 60 caracteres.')
    .regex(/^[\p{L}\p{N}\s._-]+$/u, 'Usa letras, numeros, espacios, punto, guion o guion bajo.'),
})

const widgetFilterSchema = z.object({
  field: z.string().trim().min(1, 'Selecciona un campo.'),
  operator: z.enum(['eq', 'neq', 'contains', 'not_contains', 'gt', 'lt', 'is_null', 'is_not_null']),
  value: z.string().optional().nullable(),
}).superRefine((filter, ctx) => {
  if (!['is_null', 'is_not_null'].includes(filter.operator) && !String(filter.value ?? '').trim()) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Ingresa un valor para el filtro.' })
  }
})

const widgetSettingsSchema = z.object({
  title: z.string().max(80, 'La etiqueta no puede superar 80 caracteres.').optional(),
  subtitle: z.string().max(160, 'El subtitulo no puede superar 160 caracteres.').optional(),
  dataSource: z.enum(['clientes', 'polizas', 'casos']).optional(),
  groupByField: z.string().optional(),
  aggregateFunction: z.string().optional(),
  aggregateField: z.string().optional(),
  daysWindow: z.number().min(1, 'La ventana minima es de 1 dia.').max(365, 'La ventana maxima es de 365 dias.').optional(),
  limit: z.number().min(1, 'El minimo es 1.').max(100, 'El maximo es 100.').optional(),
  fieldsToShow: z.array(z.string()).optional(),
  filters: z.array(widgetFilterSchema).optional(),
  xAxisLabel: z.string().max(40, 'La etiqueta no puede superar 40 caracteres.').optional(),
  yAxisLabel: z.string().max(40, 'La etiqueta no puede superar 40 caracteres.').optional(),
}).superRefine((settings, ctx) => {
  if (settings.aggregateFunction && AGGREGATE_FIELD_REQUIRED.has(settings.aggregateFunction) && !settings.aggregateField) {
    ctx.addIssue({ code: 'custom', path: ['aggregateField'], message: 'Selecciona el campo para calcular esta funcion.' })
  }
  if (settings.dataSource && settings.fieldsToShow && settings.fieldsToShow.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['fieldsToShow'], message: 'Selecciona al menos una columna.' })
  }
})

type DashboardNameErrors = Partial<Record<'name', string>>
type WidgetSettingsErrors = Record<string, string>

function normalizeDashboards(dashboards: DashboardRecord[]) {
  const seen = new Set<string>()
  const unique = dashboards.filter((dashboard) => {
    const key = dashboard.name.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (unique.length === 0) return unique

  const primaryIndex = unique.findIndex((dashboard) => dashboard.isPrimary)
  const safePrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0

  return unique
    .map((dashboard, index) => ({ ...dashboard, isPrimary: index === safePrimaryIndex }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name))
}


// widgetCatalog is now loaded dynamically from database inside DashboardPage component

const shortcutIcons = {
  Building2,
  UsersRound,
  PackageCheck,
  FileCheck2,
  ClipboardList,
  Tags,
} as const


function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function toCanonicalEnumValue(value: any) {
  return String(value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .trim()
}

function statusLabel(status: string) {
  const key = toCanonicalEnumValue(status)
  return (
    enumLabels.status[key] ??
    enumLabels.priority[key] ??
    enumLabels.type[key] ??
    key
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  )
}

const enumLabels = {
  status: {
    active: 'Activo',
    inactive: 'Inactivo',
    prospect: 'Prospecto',
    draft: 'Borrador',
    pending_renewal: 'Pendiente de renovación',
    expired: 'Vencida',
    cancelled: 'Cancelado',
    pending: 'Pendiente',
    in_progress: 'En proceso',
    waiting_for_client: 'Esperando cliente',
    waiting_for_provider: 'Esperando proveedor',
    closed: 'Cerrado',
  } as Record<string, string>,
  priority: {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente',
  } as Record<string, string>,
  type: {
    individual: 'Persona individual',
    company: 'Empresa',
    claim: 'Reclamo',
    renewal: 'Renovación',
    endorsement: 'Endoso',
    payment: 'Pago',
    documentation: 'Documentación',
    general_support: 'Soporte general',
  } as Record<string, string>,
}

function getFieldDisplayValue(dataSource: string, field: string, value: any, row?: any) {
  if (value == null || value === '') return 'N/A'
  if (field === 'premiumAmount' || field === 'insuredAmount') {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: row?.currency || 'GTQ',
      maximumFractionDigits: 0,
    }).format(Number(value))
  }
  if (isDateFilterField(field)) return formatDate(value)
  const canonicalValue = toCanonicalEnumValue(value)
  if (field === 'status') {
    if (dataSource === 'polizas' && canonicalValue === 'active') return 'Vigente'
    return enumLabels.status[canonicalValue] ?? statusLabel(String(value))
  }
  if (field === 'priority') return enumLabels.priority[canonicalValue] ?? statusLabel(String(value))
  if (field === 'type') return enumLabels.type[canonicalValue] ?? statusLabel(String(value))
  return String(value)
}

function normalizeFilterValue(dataSource: string, field: string, value: any) {
  const raw = toCanonicalEnumValue(value)
  if (dataSource === 'polizas' && field === 'status') {
    if (raw === 'active_policy' || raw === 'vigente') return 'active'
    if (raw === 'pending') return 'pending_renewal'
  }
  if (dataSource === 'clientes' && field === 'status') {
    if (raw === 'suspended') return 'inactive'
    if (raw === 'invited') return 'prospect'
  }
  if (dataSource === 'clientes' && field === 'type') {
    if (raw === 'corporate') return 'company'
  }
  if (dataSource === 'casos' && field === 'type') {
    if (raw === 'inquiry' || raw === 'support') return 'general_support'
    if (raw === 'billing') return 'payment'
  }
  return raw
}

function getStatusColor(value: any) {
  const normalized = toCanonicalEnumValue(value)
  if (['active', 'closed'].includes(normalized)) return 'success'
  if (['pending', 'pending_renewal', 'in_progress', 'waiting_for_client', 'waiting_for_provider'].includes(normalized)) return 'warning'
  if (['expired', 'cancelled', 'inactive', 'urgent'].includes(normalized)) return 'error'
  return 'default'
}



function WidgetLoadingSkeleton({ presentationType }: { presentationType?: string }) {
  const type = presentationType ?? ''

  if (type === 'Metric') {
    return (
      <Stack spacing={2} sx={{ py: 2, height: '100%', justifyContent: 'center' }}>
        <Skeleton variant="text" width="60%" height={40} sx={{ borderRadius: 1 }} />
        <Skeleton variant="text" width="40%" height={16} sx={{ borderRadius: 0.5 }} />
      </Stack>
    )
  }

  if (type === 'Pie Chart' || type === 'Gauge') {
    return (
      <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', py: 1 }}>
        <Skeleton variant="circular" width={110} height={110} />
      </Stack>
    )
  }

  if (type === 'Bars Chart' || type === 'Bar Chart' || type === 'Line Chart' || type === 'Sparkline' || type === 'Scatter Chart') {
    return (
      <Stack spacing={1} sx={{ height: '100%', py: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-end', height: 90, px: 1 }}>
          <Skeleton variant="rectangular" width="20%" height="40%" sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width="20%" height="80%" sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width="20%" height="60%" sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width="20%" height="90%" sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width="20%" height="50%" sx={{ borderRadius: 1 }} />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
          <Skeleton variant="text" width="25%" height={12} />
          <Skeleton variant="text" width="25%" height={12} />
        </Stack>
      </Stack>
    )
  }

  if (type === 'DataGrid' || type === 'List') {
    return (
      <Stack spacing={1.5} sx={{ py: 1 }}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Stack key={idx} spacing={0.5}>
            <Skeleton variant="text" width="70%" height={16} />
            <Skeleton variant="text" width="40%" height={12} />
          </Stack>
        ))}
      </Stack>
    )
  }

  return (
    <Stack spacing={1} sx={{ py: 1 }}>
      <Skeleton variant="rectangular" width="100%" height={32} sx={{ borderRadius: 1 }} />
      <Skeleton variant="text" width="80%" height={14} />
      <Skeleton variant="text" width="60%" height={14} />
    </Stack>
  )
}

function DashboardSkeleton() {
  return (
    <Stack spacing={4}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}
      >
        <Stack spacing={1}>
          <Skeleton variant="text" width={250} height={44} sx={{ borderRadius: 1.5 }} />
          <Skeleton variant="text" width={420} height={24} sx={{ borderRadius: 1 }} />
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Skeleton variant="rounded" width={128} height={40} />
          <Skeleton variant="rounded" width={144} height={40} />
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Skeleton variant="rounded" width={136} height={32} />
          <Skeleton variant="rounded" width={170} height={32} />
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <Skeleton variant="rounded" width={96} height={36} />
          <Skeleton variant="rounded" width={138} height={36} />
          <Skeleton variant="rounded" width={118} height={36} />
        </Stack>
      </Stack>

      <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Box
            key={index}
            className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-5 shadow-[var(--himalaya-shadow)]"
          >
            <Stack spacing={2}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Skeleton variant="text" width="50%" height={20} />
                <Skeleton variant="rounded" width={40} height={40} />
              </Stack>
              <Skeleton variant="text" width="35%" height={38} />
              <Skeleton variant="text" width="80%" height={18} />
            </Stack>
          </Box>
        ))}
      </Box>

      <Box className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Box
            key={index}
            className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-5 shadow-[var(--himalaya-shadow)]"
          >
            <Stack spacing={2.25}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Skeleton variant="text" width="45%" height={28} />
                <Skeleton variant="rounded" width={92} height={28} />
              </Stack>
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <Stack key={rowIndex} spacing={0.75}>
                  <Skeleton variant="text" width={`${65 - rowIndex * 8}%`} height={20} />
                  <Skeleton variant="text" width={`${88 - rowIndex * 6}%`} height={16} />
                  <Skeleton variant="rounded" width="100%" height={10} />
                </Stack>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
    </Stack>
  )
}

function WidgetShell({
  title,
  description,
  icon: Icon,
  children,
  editing,
  onConfigure,
  onRemove,
  onRefresh,
}: {
  title: string
  description: string
  icon: LucideIcon
  children: ReactNode
  editing: boolean
  onConfigure?: () => void
  onRemove?: () => void
  onRefresh?: () => void
}) {
  return (
    <Stack spacing={1.75} sx={{ height: '100%', minWidth: 0 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
          <Box
            className="grid h-11 w-11 shrink-0 place-items-center text-[var(--himalaya-primary)]"
            sx={{
              borderRadius: 3,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Icon size={19} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 760, fontSize: '0.96rem', letterSpacing: 0 }}>{title}</Typography>
            {description && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: '90%', mt: 0.15 }}>
                {description}
              </Typography>
            )}
          </Box>
        </Stack>

        {editing && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', shrink: 0 }}>
            {onConfigure && (
              <Tooltip title="Configurar widget">
                <Button
                  size="small"
                  sx={{ minWidth: 32, width: 32, height: 32, p: 0, borderRadius: '50%', color: 'text.secondary' }}
                  onClick={(e) => { e.stopPropagation(); onConfigure(); }}
                >
                  <Settings2 size={16} />
                </Button>
              </Tooltip>
            )}
            {onRemove && (
              <Tooltip title="Quitar del tablero">
                <Button
                  size="small"
                  color="error"
                  sx={{ minWidth: 32, width: 32, height: 32, p: 0, borderRadius: '50%' }}
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                >
                  <Trash2 size={15} />
                </Button>
              </Tooltip>
            )}
            <Box className="dashboard-widget-drag" sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', pl: 0.5, color: 'text.secondary' }}>
              <GripVertical size={16} />
            </Box>
          </Stack>
        )}
        {!editing && onRefresh && (
          <Tooltip title="Actualizar widget">
            <Button
              size="small"
              sx={{ minWidth: 32, width: 32, height: 32, p: 0, borderRadius: '50%', color: 'text.secondary' }}
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            >
              <RefreshCcw size={15} />
            </Button>
          </Tooltip>
        )}
      </Stack>
      <Box
        className="dashboard-widget-content"
        sx={{
          minHeight: 0,
          flex: 1,
          overflow: 'auto',
          pr: 0.5
        }}
      >
        {children}
      </Box>
    </Stack>
  )
}



function renderWidgetMiniPreview(presentationType?: string) {
  const type = presentationType ?? ''

  if (type === 'Metric') {
    return (
      <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.5" />
        <rect x="8" y="8" width="28" height="5" rx="1.5" fill="#94A3B8" />
        <text x="8" y="34" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0F172A">92</text>
        <path d="M44 26L48 22L52 26L56 18" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    )
  }

  if (type === 'Pie Chart') {
    return (
      <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.5" />
        <circle cx="24" cy="24" r="12" stroke="#E2E8F0" stroke-width="3" fill="none" />
        <path d="M24 12C30.6274 12 36 17.3726 36 24" stroke="#0D9488" stroke-width="3" stroke-linecap="round" />
        <path d="M36 24C36 30.6274 30.6274 36 24 36C17.3726 36 12 30.6274 12 24" stroke="#0F766E" stroke-width="3" stroke-linecap="round" />
        <line x1="44" y1="18" x2="54" y2="18" stroke="#0D9488" stroke-width="2" stroke-linecap="round" />
        <line x1="44" y1="24" x2="54" y2="24" stroke="#0F766E" stroke-width="2" stroke-linecap="round" />
        <line x1="44" y1="30" x2="50" y2="30" stroke="#F43F5E" stroke-width="2" stroke-linecap="round" />
      </svg>
    )
  }

  if (type === 'Bars Chart' || type === 'Bar Chart') {
    return (
      <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.5" />
        <rect x="10" y="28" width="6" height="12" rx="1.5" fill="#7C3AED" />
        <rect x="20" y="16" width="6" height="24" rx="1.5" fill="#8B5CF6" />
        <rect x="30" y="22" width="6" height="18" rx="1.5" fill="#A78BFA" />
        <rect x="40" y="10" width="6" height="30" rx="1.5" fill="#C4B5FD" />
      </svg>
    )
  }

  if (type === 'Line Chart' || type === 'Sparkline') {
    return (
      <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.5" />
        <path d="M8 32C15 28 20 12 28 16C36 20 40 32 46 24C50 18 52 14 56 10" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="56" cy="10" r="2" fill="#34D399" />
      </svg>
    )
  }

  if (type === 'Scatter Chart') {
    return (
      <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.5" />
        <circle cx="16" cy="32" r="2" fill="#D97706" />
        <circle cx="26" cy="18" r="2" fill="#F59E0B" />
        <circle cx="34" cy="34" r="2" fill="#FBBF24" />
        <circle cx="44" cy="22" r="2" fill="#D97706" />
        <circle cx="20" cy="14" r="2" fill="#FBBF24" />
        <circle cx="38" cy="12" r="2" fill="#F59E0B" />
        <circle cx="48" cy="30" r="2" fill="#D97706" />
      </svg>
    )
  }

  if (type === 'Gauge') {
    return (
      <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.5" />
        <path d="M14 34C14 22 22 14 32 14C42 14 50 22 50 34" stroke="#FDA4AF" stroke-width="4" stroke-linecap="round" fill="none" />
        <path d="M14 34C14 22 22 14 32 14" stroke="#E11D48" stroke-width="4" stroke-linecap="round" fill="none" />
        <circle cx="32" cy="34" r="3" fill="#4C0519" />
        <path d="M32 34L40 20" stroke="#4C0519" stroke-width="2" stroke-linecap="round" />
      </svg>
    )
  }

  if (type === 'DataGrid') {
    return (
      <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.5" />
        <rect x="6" y="8" width="52" height="6" fill="#64748B" rx="1" />
        <rect x="6" y="18" width="14" height="4" fill="#94A3B8" rx="1" />
        <rect x="24" y="18" width="20" height="4" fill="#CBD5E1" rx="1" />
        <rect x="48" y="18" width="10" height="4" fill="#94A3B8" rx="1" />
        <rect x="6" y="26" width="10" height="4" fill="#94A3B8" rx="1" />
        <rect x="20" y="26" width="24" height="4" fill="#CBD5E1" rx="1" />
        <rect x="48" y="26" width="10" height="4" fill="#94A3B8" rx="1" />
        <rect x="6" y="34" width="16" height="4" fill="#94A3B8" rx="1" />
        <rect x="26" y="34" width="18" height="4" fill="#CBD5E1" rx="1" />
        <rect x="48" y="34" width="10" height="4" fill="#94A3B8" rx="1" />
      </svg>
    )
  }

  if (type === 'Shortcuts') {
    return (
      <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.5" />
        <rect x="8" y="8" width="20" height="13" rx="2" fill="#3B82F6" />
        <rect x="36" y="8" width="20" height="13" rx="2" fill="#60A5FA" />
        <rect x="8" y="27" width="20" height="13" rx="2" fill="#60A5FA" />
        <rect x="36" y="27" width="20" height="13" rx="2" fill="#93C5FD" />
      </svg>
    )
  }

  if (type === 'List') {
    return (
      <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.5" />
        <circle cx="12" cy="14" r="2.5" fill="#A855F7" />
        <rect x="20" y="12" width="36" height="4" rx="1" fill="#A855F7" />
        <circle cx="12" cy="24" r="2.5" fill="#C084FC" />
        <rect x="20" y="22" width="36" height="4" rx="1" fill="#C084FC" />
        <circle cx="12" cy="34" r="2.5" fill="#E9D5FF" />
        <rect x="20" y="32" width="26" height="4" rx="1" fill="#E9D5FF" />
      </svg>
    )
  }

  // Default fallback
  return (
    <svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.5" />
      <circle cx="32" cy="24" r="6" fill="#94A3B8" />
    </svg>
  )
}

function CustomWidgetEmptyState({ title, onConfigure }: { title: string; onConfigure: () => void }) {
  return (
    <Stack
      sx={{
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        textAlign: 'center',
        border: '1.5px dashed',
        borderColor: 'warning.light',
        borderRadius: 2,
        backgroundColor: 'rgba(237, 108, 2, 0.04)',
      }}
      spacing={1.5}
    >
      <Box
        sx={{
          display: 'grid',
          height: 48,
          width: 48,
          placeItems: 'center',
          borderRadius: '50%',
          bgcolor: 'warning.light',
          color: 'warning.contrastText',
          animation: 'pulse-warn 2s infinite',
          '@keyframes pulse-warn': {
            '0%': { boxShadow: '0 0 0 0 rgba(237, 108, 2, 0.5)' },
            '70%': { boxShadow: '0 0 0 10px rgba(237, 108, 2, 0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(237, 108, 2, 0)' }
          }
        }}
      >
        <Blocks size={20} />
      </Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'warning.dark' }}>
        {title} sin vincular
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: '85%' }}>
        Vincúlalo a una tabla de datos y personaliza su vista.
      </Typography>
      <Button
        variant="contained"
        color="warning"
        size="small"
        startIcon={<Settings2 size={14} />}
        onClick={onConfigure}
        sx={{
          fontWeight: 600,
          boxShadow: 2,
          '&:hover': {
            bgcolor: 'warning.dark',
          }
        }}
      >
        Configurar Origen
      </Button>
    </Stack>
  )
}



function CustomDataGridWidget({
  settings,
  loading,
  clientsData,
  policiesData,
  casesData,
}: {
  settings: WidgetSettings
  loading?: boolean
  clientsData?: any[]
  policiesData?: any[]
  casesData?: any[]
}) {
  const source = settings.dataSource ?? 'clientes'
  const rowsPerPage = settings.limit ?? 5

  const rawData = useMemo(() => {
    return source === 'clientes'
      ? clientsData
      : source === 'polizas'
        ? policiesData
        : casesData
  }, [source, clientsData, policiesData, casesData])

  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [source])

  if (loading) {
    return <EmptyWidgetState text="Cargando información del origen de datos..." />
  }

  if (!rawData || rawData.length === 0) {
    return <EmptyWidgetState text="Sin datos para los filtros configurados." />
  }

  const fields = settings.fieldsToShow ?? (
    source === 'clientes'
      ? ['displayName', 'type', 'status']
      : source === 'polizas'
        ? ['policyNumber', 'premiumAmount', 'status']
        : ['caseNumber', 'title', 'status']
  )

  const totalRows = rawData.length
  const totalPages = Math.ceil(totalRows / rowsPerPage)
  const startIndex = page * rowsPerPage
  const items = rawData.slice(startIndex, startIndex + rowsPerPage)

  const fieldHeaders: Record<string, string> = {
    displayName: 'Nombre',
    type: 'Tipo',
    status: 'Estado',
    taxId: 'Identificación',
    email: 'Correo',
    phone: 'Teléfono',
    city: 'Ciudad',
    department: 'Departamento',
    policyNumber: 'Nº Póliza',
    startDate: 'Inicio',
    endDate: 'Vence',
    premiumAmount: 'Prima',
    insuredAmount: 'Asegurado',
    currency: 'Moneda',
    caseNumber: 'Nº Caso',
    title: 'Título',
    priority: 'Prioridad',
    dueAt: 'Vencimiento',
  }

  return (
    <Stack sx={{ height: '100%', justifyContent: 'space-between' }}>
      <Box sx={{ width: '100%', overflowX: 'auto', flex: 1 }} className="dashboard-widget-content">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--himalaya-border)', textAlign: 'left' }}>
              {fields.map((f: string) => (
                <th key={f} style={{ padding: '6px 4px', color: 'var(--himalaya-muted)', fontWeight: 600 }}>
                  {fieldHeaders[f] ?? f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row: any) => (
              <tr key={row.uuid || row.id} style={{ borderBottom: '1px solid color-mix(in srgb, var(--himalaya-border) 35%, transparent)' }}>
                {fields.map((f: string) => {
                  const rawValue = row[f]
                  const val = getFieldDisplayValue(source, f, rawValue, row)

                  if (f === 'status' || f === 'priority') {
                    return (
                      <td key={f} style={{ padding: '8px 4px' }}>
                        <Chip size="small" label={val} color={getStatusColor(rawValue) as any} variant="outlined" sx={{ height: 18, fontSize: '0.65rem', borderRadius: 99 }} />
                      </td>
                    )
                  }

                  return (
                    <td key={f} style={{ padding: '8px 4px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {String(val ?? '')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      {totalPages > 1 && (
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px solid var(--himalaya-border)', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {startIndex + 1}-{Math.min(startIndex + rowsPerPage, totalRows)} de {totalRows}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <Button
              size="small"
              variant="text"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              sx={{ minWidth: 48, fontSize: '0.72rem', py: 0.25 }}
            >
              Anterior
            </Button>
            <Button
              size="small"
              variant="text"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              sx={{ minWidth: 48, fontSize: '0.72rem', py: 0.25 }}
            >
              Siguiente
            </Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}

function CustomListWidget({
  settings,
  loading,
  clientsData,
  policiesData,
  casesData,
}: {
  settings: WidgetSettings
  loading?: boolean
  clientsData?: any[]
  policiesData?: any[]
  casesData?: any[]
}) {
  const source = settings.dataSource ?? 'clientes'
  const limit = settings.limit ?? 5
  const rawData = source === 'clientes'
    ? clientsData
    : source === 'polizas'
      ? policiesData
      : casesData

  if (loading) {
    return <EmptyWidgetState text="Cargando información del origen de datos..." />
  }

  if (!rawData || rawData.length === 0) {
    return <EmptyWidgetState text="Sin datos para los filtros configurados." />
  }

  const fields = settings.fieldsToShow ?? (
    source === 'clientes'
      ? ['displayName', 'status', 'email']
      : source === 'polizas'
        ? ['policyNumber', 'status', 'endDate']
        : ['caseNumber', 'title', 'dueAt']
  )

  const labels: Record<string, string> = {
    displayName: 'Cliente',
    status: 'Estado',
    email: 'Correo',
    policyNumber: 'Póliza',
    endDate: 'Vence',
    caseNumber: 'Caso',
    title: 'Título',
    dueAt: 'Vence',
    priority: 'Prioridad',
  }

  return (
    <Stack spacing={1.25}>
      {rawData.slice(0, limit).map((row: any, index: number) => {
        const primaryField = fields[0]
        const primaryValue = getFieldDisplayValue(source, primaryField, row[primaryField], row)
        const secondaryFields = fields.slice(1, 4)

        return (
          <Box
            key={row.uuid || row.id || `${primaryValue}-${index}`}
            className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface-soft)] p-3"
          >
            <Stack spacing={0.75}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {primaryValue}
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                {secondaryFields.map((field) => (
                  <Chip
                    key={field}
                    size="small"
                    variant="outlined"
                    color={(field === 'status' || field === 'priority') ? getStatusColor(row[field]) as any : 'default'}
                    label={`${labels[field] ?? field}: ${getFieldDisplayValue(source, field, row[field], row)}`}
                    sx={{ borderRadius: 99 }}
                  />
                ))}
              </Stack>
            </Stack>
          </Box>
        )
      })}
    </Stack>
  )
}


function CustomRadarChart({
  data,
  xAxisLabel,
  yAxisLabel,
}: {
  data: { label: string; value: number }[]
  xAxisLabel?: string
  yAxisLabel?: string
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const width = 280
  const height = 150
  const cx = width / 2
  const cy = height / 2 - 10
  const r = 42

  const count = data.length
  if (count < 3) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 4 }}>
        Se requieren al menos 3 categorías para el gráfico de radar.
      </Typography>
    )
  }

  const maxVal = Math.max(...data.map((d) => Number(d.value) || 0), 1)

  const points = data.map((d, i) => {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2
    const val = Number(d.value) || 0
    const radius = (val / maxVal) * r
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    return { x, y, label: String(d.label ?? ''), angle }
  })

  const polygonPointsStr = points.map((p) => `${p.x},${p.y}`).join(' ')
  const gridLevels = [0.25, 0.5, 0.75, 1]

  const gridColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'
  const axisColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
  const textColor = theme.palette.text.secondary
  const areaColor = isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.2)'
  const strokeColor = isDark ? '#38bdf8' : '#0284c7'
  const dotColor = isDark ? '#60a5fa' : '#0369a1'

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1 }}>
      <svg width={width} height={height}>
        {gridLevels.map((level, idx) => {
          const gridPoints = data.map((_, i) => {
            const angle = (i * 2 * Math.PI) / count - Math.PI / 2
            const radius = level * r
            const x = cx + radius * Math.cos(angle)
            const y = cy + radius * Math.sin(angle)
            return `${x},${y}`
          }).join(' ')
          return (
            <polygon
              key={idx}
              points={gridPoints}
              fill="none"
              stroke={gridColor}
              strokeWidth="1"
            />
          )
        })}

        {data.map((_, i) => {
          const angle = (i * 2 * Math.PI) / count - Math.PI / 2
          const x2 = cx + r * Math.cos(angle)
          const y2 = cy + r * Math.sin(angle)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke={axisColor}
              strokeWidth="1"
            />
          )
        })}

        {points.map((p, i) => {
          const labelX = cx + (r + 14) * Math.cos(p.angle)
          const labelY = cy + (r + 10) * Math.sin(p.angle) + 4
          return (
            <text
              key={i}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              fill={textColor}
              style={{ fontSize: '8px', fontWeight: 600, fontFamily: 'inherit' }}
            >
              {String(p.label ?? '').substring(0, 10)}
            </text>
          )
        })}

        <polygon
          points={polygonPointsStr}
          fill={areaColor}
          stroke={strokeColor}
          strokeWidth="2"
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill={dotColor}
          />
        ))}
      </svg>
      {(xAxisLabel || yAxisLabel) && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '9px', fontWeight: 600, mt: 0.5 }}>
          {[xAxisLabel, yAxisLabel].filter(Boolean).join(' / ')}
        </Typography>
      )}
    </Box>
  )
}

function CustomBubbleChart({
  data,
  xAxisLabel,
  yAxisLabel,
}: {
  data: { label: string; value: number }[]
  xAxisLabel?: string
  yAxisLabel?: string
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const width = 280
  const height = 150
  const padding = 25
  const graphWidth = width - 2 * padding
  const graphHeight = height - 2 * padding

  const maxVal = Math.max(...data.map((d) => Number(d.value) || 0), 1)
  const count = data.length

  const bubbles = data.map((d, i) => {
    const val = Number(d.value) || 0
    const x = padding + (count > 1 ? (i / (count - 1)) * graphWidth : graphWidth / 2)
    const y = padding + graphHeight - (val / maxVal) * graphHeight
    const r = 7 + (val / maxVal) * 13
    return { x, y, r, label: String(d.label ?? ''), value: val }
  })

  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
  const axisColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
  const textColor = theme.palette.text.secondary
  const bubbleFill = isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(16, 185, 129, 0.2)'
  const bubbleStroke = isDark ? '#34d399' : '#10b981'

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={width} height={height}>
        <line x1={padding} y1={padding} x2={padding + graphWidth} y2={padding} stroke={gridColor} strokeDasharray="3 3" />
        <line x1={padding} y1={padding + graphHeight / 2} x2={padding + graphWidth} y2={padding + graphHeight / 2} stroke={gridColor} strokeDasharray="3 3" />

        <line x1={padding} y1={padding} x2={padding} y2={padding + graphHeight} stroke={axisColor} />
        <line x1={padding} y1={padding + graphHeight} x2={padding + graphWidth} y2={padding + graphHeight} stroke={axisColor} />

        {bubbles.map((b, i) => (
          <g key={i}>
            <circle
              cx={b.x}
              cy={b.y}
              r={b.r}
              fill={bubbleFill}
              stroke={bubbleStroke}
              strokeWidth="1.5"
            />
            {b.r > 10 && (
              <text
                x={b.x}
                y={b.y + 3}
                textAnchor="middle"
                fill={isDark ? '#ffffff' : '#064e3b'}
                style={{ fontSize: '8px', fontWeight: 700, fontFamily: 'inherit' }}
              >
                {b.value}
              </text>
            )}
            <text
              x={b.x}
              y={padding + graphHeight + 12}
              textAnchor="middle"
              fill={textColor}
              style={{ fontSize: '8px', fontWeight: 600, fontFamily: 'inherit' }}
            >
              {String(b.label ?? '').substring(0, 8)}
            </text>
          </g>
        ))}

        {yAxisLabel && (
          <text
            x={8}
            y={height / 2}
            transform={`rotate(-90 8 ${height / 2})`}
            textAnchor="middle"
            fill={textColor}
            style={{ fontSize: '8px', fontWeight: 600, fontFamily: 'inherit' }}
          >
            {yAxisLabel}
          </text>
        )}
      </svg>
      {xAxisLabel && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '9px', fontWeight: 600, mt: 0.5 }}>
          {xAxisLabel}
        </Typography>
      )}
    </Box>
  )
}

function CustomMetricWidget({
  settings,
  aggregateLabel,
  aggregateValue,
  clientsData,
  policiesData,
  casesData,
}: {
  settings: WidgetSettings
  aggregateLabel?: string
  aggregateValue?: string
  clientsData?: any[]
  policiesData?: any[]
  casesData?: any[]
}) {
  const source = settings.dataSource ?? 'clientes'
  const tone = settings.tone ?? 'primary'

  let value = '0'
  let detail = ''

  if (source === 'clientes') {
    value = clientsData ? clientsData.length.toString() : '0'
    if (clientsData) {
      const activeCount = clientsData.filter((c) => {
        const s = String(c.status || '').toLowerCase().trim()
        return s === 'active' || s === 'activo'
      }).length
      detail = activeCount > 0 ? (activeCount === clientsData.length ? 'Clientes activos' : `${activeCount} activos`) : ''
    }
  } else if (source === 'polizas') {
    value = policiesData ? policiesData.length.toString() : '0'
    if (policiesData) {
      const activeCount = policiesData.filter((p) => {
        const s = String(p.status || '').toLowerCase().replace(/_/g, '').trim()
        return s === 'active' || s === 'activepolicy' || s === 'vigente'
      }).length
      detail = activeCount > 0 ? (activeCount === policiesData.length ? 'Pólizas vigentes' : `${activeCount} vigentes`) : ''
    }
  } else if (source === 'casos') {
    value = casesData ? casesData.length.toString() : '0'
    if (casesData) {
      const activeCount = casesData.filter((c) => {
        const s = String(c.status || '').toLowerCase().replace(/_/g, '').trim()
        return s === 'pending' || s === 'inprogress' || s === 'in_progress'
      }).length
      detail = activeCount > 0 ? (activeCount === casesData.length ? 'Casos pendientes' : `${activeCount} pendientes`) : ''
    }
  }

  if (aggregateValue) {
    value = aggregateValue
    detail = aggregateLabel || detail
  }

  const toneColor =
    tone === 'success'
      ? 'success.main'
      : tone === 'warning'
        ? 'warning.main'
        : tone === 'info'
          ? 'info.main'
          : 'primary.main'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', py: 1 }}>
      <Typography variant="h3" sx={{ fontWeight: 800, color: toneColor, lineHeight: 1.1 }}>
        {value}
      </Typography>
      {detail && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {detail}
        </Typography>
      )}
    </Box>
  )
}

function CustomSystemHealthWidget() {
  const [health, setHealth] = useState<SystemHealthDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = () => {
      fetchSystemHealth()
        .then((res) => {
          if (active) {
            setHealth(res)
            setLoading(false)
          }
        })
        .catch((err) => {
          console.error(err)
          if (active) setLoading(false)
        })
    }
    load()
    const timer = setInterval(load, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  if (loading || !health) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  const statusColor = health.status === 'ok' ? '#34c759' : health.status === 'warning' ? '#ff9500' : '#ff3b30'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', justifyContent: 'center' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: statusColor,
              boxShadow: `0 0 8px ${statusColor}`,
              animation: 'pulse-health 2s infinite',
              '@keyframes pulse-health': {
                '0%': { boxShadow: `0 0 0 0 ${statusColor}a0` },
                '70%': { boxShadow: `0 0 0 6px ${statusColor}00` },
                '100%': { boxShadow: `0 0 0 0 ${statusColor}00` },
              }
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', color: statusColor }}>
            {health.status === 'ok' ? 'Operativo' : health.status === 'warning' ? 'Advertencia' : 'Crítico'}
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 550 }}>
          Uptime: {Math.floor(health.uptime / 60)}m {Math.floor(health.uptime % 60)}s
        </Typography>
      </Stack>

      <Grid container spacing={1}>
        <Grid size={{ xs: 6 }}>
          <Box sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.25
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.68rem' }}>Base de Datos</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: health.dbConnected ? 'success.main' : 'error.main' }}>
              {health.dbConnected ? 'En línea' : 'Caído'}
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Box sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.25
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.68rem' }}>Carga CPU</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {health.cpuStatus === 'high' ? 'Alta' : 'Normal'}
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Box sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5
          }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.68rem' }}>Memoria RAM</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem' }}>{health.memoryUsage}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={health.memoryUsage}
              sx={{
                height: 4,
                borderRadius: 99,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: health.memoryUsage > 85 ? '#ff9500' : '#34c759',
                  borderRadius: 99,
                }
              }}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 6 }}>
          <Box sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5
          }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.68rem' }}>Disco</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem' }}>{health.diskUsage}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={health.diskUsage}
              sx={{
                height: 4,
                borderRadius: 99,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: '#007aff',
                  borderRadius: 99,
                }
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

function DynamicWidgetContent({
  widget,
  settings,
  instanceId,
  refreshVersion,
  onConfigure,
}: {
  widget: WidgetDefinition
  settings: WidgetSettings
  instanceId: string
  refreshVersion: number
  onConfigure: () => void
}) {
  const source = settings.dataSource
  const queryInput = useMemo(() => {
    if (!source) return null
    return {
      dataSource: source,
      fieldsToShow: settings.fieldsToShow,
      filtersJson: JSON.stringify(settings.filters ?? []),
      groupByField: settings.groupByField ?? 'status',
      aggregateFunction: settings.aggregateFunction ?? 'count',
      aggregateField: settings.aggregateField ?? null,
      daysWindow: settings.daysWindow ?? 30,
      limit: settings.limit ?? 20,
    }
  }, [source, settings.fieldsToShow, settings.filters, settings.groupByField, settings.aggregateFunction, settings.aggregateField, settings.daysWindow, settings.limit])

  const { data, error, loading } = useApiQuery(
    `dashboard-widget-data:${instanceId}:${refreshVersion}:${JSON.stringify(queryInput)}`,
    () => queryInput ? fetchDashboardWidgetData(queryInput) : Promise.resolve(null),
  )

  if (!source) {
    return <CustomWidgetEmptyState title={widget.title} onConfigure={onConfigure} />
  }

  if (loading) {
    return <WidgetLoadingSkeleton presentationType={widget.presentationType} />
  }

  if (error) {
    return (
      <EmptyWidgetState
        text="No se pudo cargar la información de este widget."
        onConfigure={onConfigure}
      />
    )
  }

  if (!data) {
    return <WidgetLoadingSkeleton presentationType={widget.presentationType} />
  }

  let rows: any[] = []
  let chartData: { label: string; value: number }[] = []
  try {
    rows = JSON.parse(data.rowsJson || '[]')
    chartData = JSON.parse(data.chartDataJson || '[]')
  } catch {
    rows = []
    chartData = []
  }

  const type = widget.presentationType || 'Metric'

  if (type === 'Metric') {
    return (
      <CustomMetricWidget
        settings={settings}
        aggregateLabel={data.aggregateLabel}
        aggregateValue={data.aggregateValue}
        clientsData={source === 'clientes' ? rows : []}
        policiesData={source === 'polizas' ? rows : []}
        casesData={source === 'casos' ? rows : []}
      />
    )
  }

  if (type === 'DataGrid') {
    return (
      <CustomDataGridWidget
        settings={settings}
        clientsData={source === 'clientes' ? rows : []}
        policiesData={source === 'polizas' ? rows : []}
        casesData={source === 'casos' ? rows : []}
      />
    )
  }

  if (type === 'List') {
    return (
      <CustomListWidget
        settings={settings}
        clientsData={source === 'clientes' ? rows : []}
        policiesData={source === 'polizas' ? rows : []}
        casesData={source === 'casos' ? rows : []}
      />
    )
  }

  if (rows.length === 0 && chartData.length === 0) {
    return <EmptyWidgetState text="Sin datos para los filtros configurados." onConfigure={onConfigure} />
  }

  const translatedChartData = chartData.map((item) => ({
    ...item,
    label: getFieldDisplayValue(source, settings.groupByField ?? 'status', item.label),
  }))

  if (type === 'Pie Chart') {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
        <PieChart
          series={[{
            data: translatedChartData.map((d, i) => ({ id: i, value: d.value, label: d.label })),
            innerRadius: 25,
            outerRadius: 60,
            paddingAngle: 4,
            cornerRadius: 4,
            cx: 90,
            cy: 75
          }]}
          width={280}
          height={150}
          slotProps={{
            legend: {
              direction: 'column' as any,
              position: { vertical: 'middle' as const, horizontal: 'end' as const },
            },
          }}
        />
      </Box>
    )
  }

  if (type === 'Bars Chart' || type === 'Bar Chart') {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
        <BarChart
          dataset={translatedChartData}
          xAxis={[{ scaleType: 'band', dataKey: 'label', label: settings.xAxisLabel || undefined }]}
          yAxis={[{ label: settings.yAxisLabel || undefined }]}
          series={[{ dataKey: 'value', label: 'Cantidad', color: '#075985' }]}
          width={280}
          height={150}
        />
      </Box>
    )
  }

  if (type === 'Line Chart') {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
        <LineChart
          dataset={translatedChartData}
          xAxis={[{ scaleType: 'band', dataKey: 'label', label: settings.xAxisLabel || undefined }]}
          yAxis={[{ label: settings.yAxisLabel || undefined }]}
          series={[{ dataKey: 'value', label: 'Cantidad', color: '#0284c7' }]}
          width={280}
          height={150}
        />
      </Box>
    )
  }

  if (type === 'Sparkline') {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
        <SparkLineChart
          data={translatedChartData.map((d) => d.value)}
          width={280}
          height={150}
          showTooltip
          showHighlight
        />
      </Box>
    )
  }

  if (type === 'Scatter Chart') {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
        <ScatterChart
          xAxis={[{ label: settings.xAxisLabel || undefined }]}
          yAxis={[{ label: settings.yAxisLabel || undefined }]}
          series={[{
            data: translatedChartData.map((d, i) => ({ x: i, y: d.value, id: i, label: d.label })),
            color: '#0f766e'
          }]}
          width={280}
          height={150}
        />
      </Box>
    )
  }

  if (type === 'Radar Chart') {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
        <CustomRadarChart
          data={translatedChartData}
          xAxisLabel={settings.xAxisLabel}
          yAxisLabel={settings.yAxisLabel}
        />
      </Box>
    )
  }

  if (type === 'Bubble Chart') {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
        <CustomBubbleChart
          data={translatedChartData}
          xAxisLabel={settings.xAxisLabel}
          yAxisLabel={settings.yAxisLabel}
        />
      </Box>
    )
  }

  if (type === 'Gauge') {
    const { value, label } = getGaugeValueAndLabel(source, rows)
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
        <Gauge
          width={180}
          height={120}
          value={value}
          innerRadius="70%"
          outerRadius="100%"
        />
        <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
          {label} de registros activos
        </Typography>
      </Box>
    )
  }

  return <EmptyWidgetState text="Tipo de widget no soportado o sin datos." onConfigure={onConfigure} />
}

function EmptyWidgetState({ text, onConfigure }: { text: string; onConfigure?: () => void }) {
  return (
    <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', px: 2, textAlign: 'center' }} spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
      {onConfigure && (
        <Button variant="outlined" size="small" startIcon={<Settings2 size={13} />} onClick={onConfigure}>
          Configurar
        </Button>
      )}
    </Stack>
  )
}

function getGaugeValueAndLabel(source: string, rawData: any[]) {
  if (!rawData || rawData.length === 0) return { value: 0, label: '0%' }
  const total = rawData.length
  let activeCount = 0
  if (source === 'clientes') {
    activeCount = rawData.filter((c) => c.status === 'active').length
  } else if (source === 'polizas') {
    activeCount = rawData.filter((p) => normalizeFilterValue('polizas', 'status', p.status) === 'active').length
  } else if (source === 'casos') {
    activeCount = rawData.filter((c) => c.status === 'closed' || c.status === 'completed').length
  }
  const pct = Math.round((activeCount / total) * 100)
  return { value: pct, label: `${pct}%` }
}

export function DashboardPage() {
  const { data, error, loading } = useApiQuery('dashboard-summary', fetchDashboardSummary)

  // Load widgets catalog from DB
  const { data: dbWidgets, loading: loadingWidgetsCatalog } = useApiQuery('widgets-catalog', fetchWidgets)

  // Compute widgetCatalog from dbWidgets dynamically
  const widgetCatalog = useMemo(() => {
    if (!dbWidgets) return []
    return dbWidgets
      .filter((w) => w.enabled)
      .map((w) => {
        let defaultLayoutObj: WidgetLayout = { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 }
        try {
          defaultLayoutObj = JSON.parse(w.defaultLayout)
        } catch (e) {
          console.error(`Error parseando defaultLayout para el widget ${w.slug}:`, e)
        }
        return {
          id: w.slug as WidgetId,
          title: w.title,
          description: w.description,
          icon: (Lucide as any)[w.icon] || Lucide.Blocks,
          category: w.category,
          presentationType: w.presentationType,
          defaultLayout: defaultLayoutObj,
        }
      })
  }, [dbWidgets])

  // Multiple persistent dashboards — start empty, loaded from DB on mount
  const [dashboards, setDashboards] = useState<DashboardRecord[]>([])
  const [currentDashboardName, setCurrentDashboardName] = useState<string>('General')
  const [loadingDashboards, setLoadingDashboards] = useState<boolean>(true)

  // Dashboard management dialogs state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [renameDashboardName, setRenameDashboardName] = useState('')
  const [newDashboardErrors, setNewDashboardErrors] = useState<DashboardNameErrors>({})
  const [renameDashboardErrors, setRenameDashboardErrors] = useState<DashboardNameErrors>({})

  const currentDashboard = useMemo(() => {
    return dashboards.find((d) => d.name === currentDashboardName) || dashboards[0]
  }, [dashboards, currentDashboardName])

  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>({})
  const [widgetSettings, setWidgetSettings] = useState<Record<string, WidgetSettings>>({})
  const [customizeMode, setCustomizeMode] = useState(false)
  const [widgetsOpen, setWidgetsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'metrics' | 'operation' | 'analysis' | 'security'>('all')
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [layoutNotice, setLayoutNotice] = useState('')

  const [configuringWidgetId, setConfiguringWidgetId] = useState<string | null>(null)
  const [tempSettings, setTempSettings] = useState<WidgetSettings>({})
  const [widgetSettingsErrors, setWidgetSettingsErrors] = useState<WidgetSettingsErrors>({})
  const [widgetIdToRemove, setWidgetIdToRemove] = useState<string | null>(null)
  const [speedDialOpen, setSpeedDialOpen] = useState(false)
  const [widgetRefreshVersions, setWidgetRefreshVersions] = useState<Record<string, number>>({})

  const configuringWidget = useMemo(() => {
    if (!configuringWidgetId) return undefined
    const baseId = configuringWidgetId.split('_')[0] as WidgetId
    return widgetCatalog.find((w) => w.id === baseId)
  }, [widgetCatalog, configuringWidgetId])


  const [isAddingDashboard, setIsAddingDashboard] = useState(false)
  const [isRenamingDashboard, setIsRenamingDashboard] = useState(false)
  const [isDeletingDashboard, setIsDeletingDashboard] = useState(false)

  const gridHostRef = useRef<HTMLDivElement | null>(null)
  const gridRef = useRef<GridStack | null>(null)
  const layoutRef = useRef<Record<string, WidgetLayout>>({})
  const visibilityRef = useRef(widgetVisibility)
  const noticeTimeoutRef = useRef<number | null>(null)

  // Load from database on mount — no default widgets, everything comes from DB
  useEffect(() => {
    fetchUserDashboards()
      .then((data) => {
        if (data && data.length > 0) {
          const seen = new Set<string>()
          const loaded: DashboardRecord[] = []
          data.forEach((d) => {
            const normalized = d.name.toLowerCase().trim()
            if (!seen.has(normalized)) {
              seen.add(normalized)
              let config: DashboardConfig = { visible: {}, layout: {}, settings: {}, instances: [] }
              try {
                config = JSON.parse(d.config)
              } catch (e) {
                console.error('Error parseando tablero:', e)
              }
              loaded.push({ uuid: d.uuid, name: d.name, config, isPrimary: d.isPrimary })
            }
          })
          const normalizedDashboards = normalizeDashboards(loaded)
          const primary = normalizedDashboards.find((d) => d.isPrimary) ?? normalizedDashboards[0]
          setDashboards(normalizedDashboards)
          setCurrentDashboardName(primary.name)
        } else {
          // First login: create a clean empty "General" dashboard
          const emptyConfig: DashboardConfig = { visible: {}, layout: {}, settings: {}, instances: [] }
          saveUserDashboardApi('General', JSON.stringify(emptyConfig))
            .then((saved) => {
              setDashboards(normalizeDashboards([{ uuid: saved.uuid, name: 'General', config: emptyConfig, isPrimary: saved.isPrimary }]))
              setCurrentDashboardName('General')
            })
            .catch(console.error)
        }
      })
      .catch((err) => {
        console.error('Error cargando tableros de base de datos:', err)
      })
      .finally(() => {
        setLoadingDashboards(false)
      })
  }, [])

  // Sync state with selected tab
  useEffect(() => {
    if (currentDashboard) {
      setWidgetVisibility(currentDashboard.config.visible ?? {})
      setWidgetSettings(currentDashboard.config.settings ?? {})
      layoutRef.current = currentDashboard.config.layout ?? {}
      setLayoutVersion((prev) => prev + 1)
    }
  }, [currentDashboardName, dashboards])

  useEffect(() => {
    visibilityRef.current = widgetVisibility
  }, [widgetVisibility])

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current)
      gridRef.current?.destroy(false)
    }
  }, [])

  const persistConfig = async (
    visible = visibilityRef.current,
    layout = layoutRef.current,
    settings = widgetSettings,
    instances?: WidgetInstance[]
  ) => {
    let currentInstances: WidgetInstance[] = instances ?? currentDashboard?.config.instances ?? []

    if (!instances && !currentDashboard?.config.instances) {
      currentInstances = Object.entries(visible)
        .filter(([_, vis]) => vis)
        .map(([wid]) => ({ id: wid, widgetId: wid as WidgetId }))
    }

    currentInstances = currentInstances.filter((inst) => visible[inst.id] !== false)

    const updatedConfig: DashboardConfig = {
      visible,
      layout,
      settings,
      instances: currentInstances
    }

    // Update local state first
    setDashboards((prev) =>
      prev.map((d) => (d.name === currentDashboardName ? { ...d, config: updatedConfig } : d))
    )

    // Auto-save to server
    try {
      await saveUserDashboardApi(currentDashboardName, JSON.stringify(updatedConfig))
    } catch (err) {
      console.error('Error guardando configuración en base de datos:', err)
    }
  }

  const metricByKey = useMemo(
    () => new Map((data?.metrics ?? []).map((metric) => [metric.key, metric])),
    [data],
  )

  const availableWidgetIds = useMemo(() => {
    if (!data) return new Set<WidgetId>()

    return new Set<WidgetId>(
      widgetCatalog
        .filter((widget) => {
          // If the widget has a specific presentationType that is tied to system data
          if (widget.presentationType === 'Shortcuts') {
            return data.shortcuts.length > 0
          }
          if (widget.presentationType === 'List' && widget.id === 'renewals') {
            return data.visibility.canViewPolicies
          }
          if (widget.presentationType === 'List' && widget.id === 'followUps') {
            return data.visibility.canViewCases
          }
          // All other generic widgets are available to configure
          return true
        })
        .map((widget) => widget.id),
    )
  }, [data, metricByKey, widgetCatalog])

  const activeWidgetInstances = useMemo(() => {
    if (!currentDashboard) return []
    const config = currentDashboard.config

    if (config.instances && Array.isArray(config.instances)) {
      return config.instances.filter((inst) => availableWidgetIds.has(inst.widgetId))
    }

    // Fallback: migrate old visible singletons
    const list: WidgetInstance[] = []
    Object.entries(config.visible ?? {}).forEach(([widgetId, isVisible]) => {
      if (isVisible && availableWidgetIds.has(widgetId as WidgetId)) {
        list.push({ id: widgetId, widgetId: widgetId as WidgetId })
      }
    })
    return list
  }, [currentDashboard, availableWidgetIds])

  const syncLayoutFromGrid = () => {
    const grid = gridRef.current
    if (!grid) return

    const saved = grid.save(false, false) as GridStackWidget[]
    const nextLayout = { ...layoutRef.current }

    saved.forEach((widget) => {
      const id = widget.id as string | undefined
      if (!id) return
      nextLayout[id] = {
        x: widget.x ?? 0,
        y: widget.y ?? 0,
        w: widget.w ?? 1,
        h: widget.h ?? 1,
        minW: widget.minW,
        minH: widget.minH,
      }
    })

    layoutRef.current = nextLayout
    persistConfig(visibilityRef.current, nextLayout, widgetSettings)

    if (customizeMode) {
      setLayoutNotice('Diseño guardado automáticamente')
      if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current)
      noticeTimeoutRef.current = window.setTimeout(() => setLayoutNotice(''), 1400)
    }
  }

  useEffect(() => {
    if (!data || !gridHostRef.current) return

    gridRef.current?.destroy(false)

    // margin set to 18px and float set to false to prevent widget collisions and tight spacing
    const grid = GridStack.init(
      {
        animate: true,
        column: 12,
        float: false,
        margin: 18,
        cellHeight: 84,
        minRow: 1,
        disableDrag: !customizeMode,
        disableResize: !customizeMode,
        handle: '.dashboard-widget-drag',
        columnOpts: {
          breakpoints: [
            { w: 700, c: 1 },
            { w: 1080, c: 6 },
            { c: 12 },
          ],
        },
      },
      gridHostRef.current,
    )

    grid.setStatic(!customizeMode)
    grid.on('change', syncLayoutFromGrid)
    gridRef.current = grid

    return () => {
      grid.destroy(false)
      if (gridRef.current === grid) gridRef.current = null
    }
  }, [activeWidgetInstances, customizeMode, data, layoutVersion])

  const handleAddDashboard = async () => {
    if (!newDashboardName.trim()) return
    const name = newDashboardName.trim()
    if (dashboards.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Ya existe un tablero con este nombre.')
      return
    }

    const newConfig: DashboardConfig = {
      visible: {},
      layout: {},
      settings: {},
    }

    setIsAddingDashboard(true)
    try {
      const saved = await saveUserDashboardApi(name, JSON.stringify(newConfig))
      setDashboards((prev) => normalizeDashboards([...prev, { uuid: saved.uuid, name, config: newConfig, isPrimary: saved.isPrimary }]))
      setCurrentDashboardName(name)
      setIsAddDialogOpen(false)
      setNewDashboardName('')
      toast.success('Tablero creado exitosamente.')
    } catch (err) {
      console.error(err)
      toast.error('No se pudo crear el tablero en el servidor.')
    } finally {
      setIsAddingDashboard(false)
    }
  }

  const handleRenameDashboard = async () => {
    if (!renameDashboardName.trim()) return
    const name = renameDashboardName.trim()
    if (name === currentDashboardName) {
      setIsRenameDialogOpen(false)
      return
    }
    if (dashboards.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Ya existe un tablero con este nombre.')
      return
    }

    setIsRenamingDashboard(true)
    try {
      const wasPrimary = !!currentDashboard.isPrimary
      await saveUserDashboardApi(name, JSON.stringify(currentDashboard.config))
      await removeUserDashboardApi(currentDashboardName)
      if (wasPrimary) {
        await setPrimaryDashboardApi(name)
      }

      setDashboards((prev) =>
        normalizeDashboards(prev.map((d) => (d.name === currentDashboardName ? { ...d, name, isPrimary: wasPrimary } : d)))
      )
      setCurrentDashboardName(name)
      setIsRenameDialogOpen(false)
      toast.success('Tablero renombrado exitosamente.')
    } catch (err) {
      console.error(err)
      toast.error('No se pudo renombrar el tablero.')
    } finally {
      setIsRenamingDashboard(false)
    }
  }

  const handleDeleteDashboard = async () => {
    setIsDeletingDashboard(true)
    try {
      await removeUserDashboardApi(currentDashboardName)

      const remaining = dashboards.filter((d) => d.name !== currentDashboardName)
      if (remaining.length === 0) {
        // Last dashboard deleted — create a fresh empty one
        const emptyConfig: DashboardConfig = { visible: {}, layout: {}, settings: {}, instances: [] }
        const saved = await saveUserDashboardApi('General', JSON.stringify(emptyConfig))
        setDashboards(normalizeDashboards([{ uuid: saved.uuid, name: 'General', config: emptyConfig, isPrimary: saved.isPrimary }]))
        setCurrentDashboardName('General')
      } else {
        const normalizedRemaining = normalizeDashboards(remaining)
        setDashboards(normalizedRemaining)
        setCurrentDashboardName((normalizedRemaining.find((d) => d.isPrimary) ?? normalizedRemaining[0]).name)
      }
      setIsDeleteDialogOpen(false)
      toast.success('Tablero eliminado exitosamente.')
    } catch (err) {
      console.error(err)
      toast.error('No se pudo eliminar el tablero.')
    } finally {
      setIsDeletingDashboard(false)
    }
  }

  const resetDashboard = () => {
    // Reset to a clean, empty dashboard — user must add widgets from library
    layoutRef.current = {}
    setWidgetVisibility({})
    setWidgetSettings({})
    persistConfig({}, {}, {}, [])
    setLayoutVersion((value) => value + 1)
    setCustomizeMode(false)
    toast.success('Tablero restaurado a estado limpio.')
  }

  const [isSettingPrimary, setIsSettingPrimary] = useState(false)

  const handleSetPrimary = async () => {
    setIsSettingPrimary(true)
    try {
      await setPrimaryDashboardApi(currentDashboardName)
      setDashboards((prev) =>
        normalizeDashboards(prev.map((d) => ({ ...d, isPrimary: d.name === currentDashboardName })))
      )
      toast.success(`"${currentDashboardName}" es ahora tu tablero de inicio.`)
    } catch (err) {
      console.error(err)
      toast.error('No se pudo establecer el tablero como principal.')
    } finally {
      setIsSettingPrimary(false)
    }
  }

  const addWidgetInstance = (widgetId: WidgetId) => {
    if (!currentDashboard) return
    const widget = widgetCatalog.find((w) => w.id === widgetId)
    if (!widget) return

    // Prevent duplicate: same widgetId already in this dashboard
    const currentInstances = currentDashboard.config.instances ?? []
    const existingCount = currentInstances.filter((inst) => inst.widgetId === widgetId).length
    if (existingCount > 0) {
      toast.warning(`Ya tienes un widget "${widget.title}" en este tablero. Configúralo antes de agregar otro.`)
      return
    }

    const instanceId = `${widgetId}_${Date.now()}`
    const defaultLayout = widget.defaultLayout ?? { w: 4, h: 2, minW: 3, minH: 2 }

    // Position it below the existing widgets
    let maxY = 0
    Object.values(layoutRef.current).forEach((lay) => {
      const bottom = (lay.y ?? 0) + (lay.h ?? 2)
      if (bottom > maxY) maxY = bottom
    })

    const newLayout = {
      ...defaultLayout,
      x: 0,
      y: maxY,
    }

    setDashboards((prev) =>
      prev.map((d) => {
        if (d.name !== currentDashboardName) return d
        const config = d.config
        const updatedInstances = [...(config.instances ?? []), { id: instanceId, widgetId }]
        const updatedVisible = { ...config.visible, [instanceId]: true }
        const updatedLayout = { ...config.layout, [instanceId]: newLayout }
        const updatedSettings = { ...config.settings }

        const nextConfig: DashboardConfig = {
          visible: updatedVisible,
          layout: updatedLayout,
          settings: updatedSettings,
          instances: updatedInstances,
        }

        saveUserDashboardApi(currentDashboardName, JSON.stringify(nextConfig)).catch(console.error)
        return { ...d, config: nextConfig }
      })
    )

    toast.success(`Widget "${widget.title}" agregado al tablero. Configúralo para comenzar.`)
    setLayoutVersion((value) => value + 1)

    // Auto-edit mode & configure dialog triggers
    setWidgetsOpen(false)
    setCustomizeMode(true)
    handleOpenConfigure(instanceId)
  }

  const removeWidgetInstance = (instanceId: string) => {
    if (!currentDashboard) return

    setDashboards((prev) =>
      prev.map((d) => {
        if (d.name !== currentDashboardName) return d
        const config = d.config
        const currentInstances = config.instances ?? Object.entries(config.visible ?? {})
          .filter(([_, vis]) => vis)
          .map(([wid]) => ({ id: wid, widgetId: wid as WidgetId }))

        const updatedInstances = currentInstances.filter((inst) => inst.id !== instanceId)
        const updatedVisible = { ...config.visible }
        delete updatedVisible[instanceId]
        const updatedLayout = { ...config.layout }
        delete updatedLayout[instanceId]
        const updatedSettings = { ...config.settings }
        delete updatedSettings[instanceId]

        const nextConfig: DashboardConfig = {
          visible: updatedVisible,
          layout: updatedLayout,
          settings: updatedSettings,
          instances: updatedInstances,
        }

        saveUserDashboardApi(currentDashboardName, JSON.stringify(nextConfig)).catch(console.error)
        return { ...d, config: nextConfig }
      })
    )

    toast.success('Widget quitado del tablero.')
    setWidgetRefreshVersions((current) => {
      const next = { ...current }
      delete next[instanceId]
      return next
    })
    setLayoutVersion((value) => value + 1)
  }

  const handleOpenConfigure = (id: string) => {
    setConfiguringWidgetId(id)
    const currentSettings = widgetSettings[id] ?? {}
    const inst = currentDashboard?.config.instances?.find((i) => i.id === id)
    const widget = inst ? widgetCatalog.find((w) => w.id === inst.widgetId) : undefined
    setTempSettings({
      ...currentSettings,
      subtitle: currentSettings.subtitle !== undefined ? currentSettings.subtitle : (widget?.description ?? ''),
    })
  }

  const handleSaveSettings = () => {
    if (!configuringWidgetId) return
    setWidgetSettings((current) => {
      const next = { ...current, [configuringWidgetId]: tempSettings }
      persistConfig(visibilityRef.current, layoutRef.current, next)
      return next
    })
    setConfiguringWidgetId(null)
    setLayoutVersion((value) => value + 1)
  }

  const summaryMessage = useMemo(() => {
    if (!data) return 'Cargando métricas operativas.'
    const sections = [
      data.visibility.canViewClients ? 'clientes' : null,
      data.visibility.canViewPolicies ? 'pólizas' : null,
      data.visibility.canViewCases ? 'casos' : null,
    ].filter(Boolean)
    return sections.length > 0
      ? `Acceso autorizado a datos de ${sections.join(', ')}.`
      : 'Vista restringida.'
  }, [data])

  const filteredCatalog = useMemo(() => {
    return widgetCatalog.filter((widget) => {
      if (activeTab === 'all') return true
      if (activeTab === 'metrics') return widget.category === 'Métricas'
      if (activeTab === 'operation') return widget.category === 'Operación'
      if (activeTab === 'analysis') return widget.category === 'Análisis'
      if (activeTab === 'security') return widget.category === 'Seguridad'
      return true
    })
  }, [activeTab])

  const renderWidget = (widget: WidgetDefinition, settings: WidgetSettings = {}, instanceId: string, refreshVersion = 0) => {
    if (loading || !data) {
      return <WidgetLoadingSkeleton presentationType={widget.presentationType} />
    }

    // For fixed operational widgets, use the presentationType to decide
    if (widget.presentationType === 'Shortcuts') {
      const showDesc = settings.showDescriptions ?? true
      return data.shortcuts.length === 0 ? (
        <EmptyWidgetState text="No hay accesos visibles para este perfil." />
      ) : (
        <Box className="grid gap-2 sm:grid-cols-2">
          {data.shortcuts.map((shortcut) => {
            const Icon = shortcutIcons[shortcut.icon as keyof typeof shortcutIcons] ?? FolderKanban
            return (
              <Button
                key={shortcut.slug}
                component={Link}
                to={shortcut.route}
                variant="outlined"
                className="justify-start bg-[var(--himalaya-surface)] text-left"
                sx={{ minHeight: showDesc ? 72 : 52, px: 1.5, py: 1.25 }}
                startIcon={<Icon size={17} />}
              >
                <Stack spacing={0.25} sx={{ alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {shortcut.title}
                  </Typography>
                  {showDesc && (
                    <Typography variant="caption" color="text.secondary">
                      {shortcut.description}
                    </Typography>
                  )}
                </Stack>
              </Button>
            )
          })}
        </Box>
      )
    }

    if (widget.presentationType === 'List' && widget.id === 'renewals') {
      const limit = settings.limit ?? 3
      const threshold = settings.daysThreshold ?? 30
      const items = data.renewals.slice(0, limit)
      return items.length === 0 ? (
        <EmptyWidgetState text="No hay renovaciones visibles para tu perfil." />
      ) : (
        <Stack spacing={2}>
          {items.map((renewal) => {
            const isUrgent = renewal.daysRemaining <= threshold
            return (
              <Box key={renewal.policyUuid}>
                <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1, justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {renewal.clientName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {renewal.policyNumber} · vence {formatDate(renewal.endDate)}
                    </Typography>
                  </Box>
                  <Stack sx={{ alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
                    <Typography variant="body2" color={isUrgent ? 'error.main' : 'text.secondary'} sx={{ fontWeight: isUrgent ? 700 : 400 }}>
                      {renewal.daysRemaining} días
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {renewal.premiumAmount == null ? 'Monto restringido' : renewal.currency}
                    </Typography>
                  </Stack>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={renewal.progress}
                  color={isUrgent ? 'error' : 'primary'}
                  sx={{ mt: 1.25, height: 8, borderRadius: 999 }}
                />
              </Box>
            )
          })}
        </Stack>
      )
    }

    if (widget.presentationType === 'List' && widget.id === 'followUps') {
      const priority = settings.priorityFilter ?? 'all'
      const limit = settings.limit ?? 3

      let filtered = data.followUps
      if (priority === 'urgent') {
        filtered = data.followUps.filter((item) => item.priority === 'urgent')
      } else if (priority === 'high') {
        filtered = data.followUps.filter((item) => item.priority === 'urgent' || item.priority === 'high')
      }

      const items = filtered.slice(0, limit)

      return items.length === 0 ? (
        <EmptyWidgetState text="No hay seguimientos que coincidan con la prioridad." />
      ) : (
        <Stack spacing={1.5}>
          {items.map((item) => (
            <Box
              key={item.caseUuid}
              className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface-soft)] p-3"
            >
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                  <Chip size="small" label={item.caseNumber} />
                  <Chip size="small" variant="outlined" label={statusLabel(item.status)} />
                  <Chip
                    size="small"
                    color={item.priority === 'urgent' ? 'error' : item.priority === 'high' ? 'warning' : 'default'}
                    label={statusLabel(item.priority)}
                  />
                </Stack>
                <Typography variant="body2">{item.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.clientName} · vence {formatDate(item.dueAt)}
                  {item.assignedTo ? ` · ${item.assignedTo}` : ''}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      )
    }

    if (widget.presentationType === 'Security' || widget.id === 'securityOverview') {
      const mode = settings.displayMode ?? 'detailed'
      return (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Chip icon={<Eye size={15} />} label={data.visibility.canViewClients ? 'Ve clientes' : 'Sin clientes'} />
            <Chip icon={<ShieldCheck size={15} />} label={data.visibility.canViewPolicies ? 'Ve pólizas' : 'Sin pólizas'} />
            <Chip icon={<CalendarClock size={15} />} label={data.visibility.canViewCases ? 'Ve casos' : 'Sin casos'} />
            {mode === 'detailed' && (
              <>
                <Chip icon={<CircleDollarSign size={15} />} color={data.visibility.canViewPremiums ? 'success' : 'warning'} label={data.visibility.canViewPremiums ? 'Montos visibles' : 'Montos restringidos'} />
                <Chip icon={<Blocks size={15} />} color={data.visibility.canExport ? 'primary' : 'default'} label={data.visibility.canExport ? 'Exportación habilitada' : 'Sin exportación'} />
              </>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Última actualización: {formatDateTime(data.generatedAt)}
          </Typography>
        </Stack>
      )
    }

    // Generic Customizable dynamic widgets from database catalog
    const type = widget.presentationType || 'Metric'

    if (type === 'SystemHealth') {
      return <CustomSystemHealthWidget />
    }
    return (
      <DynamicWidgetContent
        widget={widget}
        settings={settings}
        instanceId={instanceId}
        refreshVersion={refreshVersion}
        onConfigure={() => handleOpenConfigure(instanceId)}
      />
    )
  }

  const speedDialActions = useMemo(() => {
    if (!currentDashboard) return []

    if (customizeMode) {
      return [
        {
          icon: <Lucide.Save size={20} />,
          name: 'Guardar Cambios',
          onClick: () => {
            setCustomizeMode(false)
            setSpeedDialOpen(false)
          },
          color: 'success.main',
          hoverColor: 'success.dark',
        },
        {
          icon: <Lucide.LayoutGrid size={20} />,
          name: 'Agregar Widget',
          onClick: () => {
            setWidgetsOpen(true)
            setSpeedDialOpen(false)
          },
          color: 'info.main',
          hoverColor: 'info.dark',
        },
        {
          icon: <Lucide.Type size={20} />,
          name: 'Renombrar Tablero',
          onClick: () => {
            setRenameDashboardName(currentDashboardName)
            setIsRenameDialogOpen(true)
            setSpeedDialOpen(false)
          },
          color: 'secondary.main',
          hoverColor: 'secondary.dark',
        },
        ...(dashboards.length > 1 ? [{
          icon: <Lucide.Trash2 size={20} />,
          name: 'Eliminar Tablero',
          onClick: () => {
            setIsDeleteDialogOpen(true)
            setSpeedDialOpen(false)
          },
          color: 'error.main',
          hoverColor: 'error.dark',
        }] : []),
      ]
    } else {
      return [
        {
          icon: <Lucide.Edit3 size={20} />,
          name: 'Editar Tablero',
          onClick: () => {
            setCustomizeMode(true)
            setSpeedDialOpen(false)
          },
          color: 'primary.main',
          hoverColor: 'primary.dark',
        },
        {
          icon: <Lucide.FolderPlus size={20} />,
          name: 'Nuevo Tablero',
          onClick: () => {
            setNewDashboardName('')
            setIsAddDialogOpen(true)
            setSpeedDialOpen(false)
          },
          color: 'primary.main',
          hoverColor: 'primary.dark',
        },
        ...(!currentDashboard.isPrimary ? [{
          icon: isSettingPrimary ? <CircularProgress size={16} color="inherit" /> : <Lucide.Star size={20} />,
          name: 'Hacer Principal',
          onClick: () => {
            handleSetPrimary()
            setSpeedDialOpen(false)
          },
          color: 'warning.main',
          hoverColor: 'warning.dark',
        }] : []),
      ]
    }
  }, [customizeMode, currentDashboard, currentDashboardName, dashboards.length, handleSetPrimary, isSettingPrimary])

  const dashboardContentLoading = loadingDashboards || loadingWidgetsCatalog || !data || !currentDashboard

  if (loading && !data) {
    return <DashboardSkeleton />
  }

  return (
    <Stack spacing={4}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)'
            : 'linear-gradient(135deg, rgba(239, 246, 255, 0.5) 0%, rgba(243, 244, 246, 0.6) 100%)',
          border: (theme) => theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 8px 32px 0 rgba(0, 0, 0, 0.25)'
            : '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '3px',
            background: 'linear-gradient(90deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
          }
        }}
      >
        <Grid container spacing={3} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: '-0.02em', color: 'text.primary' }}>
                Panel Operativo
              </Typography>

              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 99,
                  bgcolor: (theme) => theme.palette.mode === 'dark'
                    ? (loading ? 'rgba(56, 189, 248, 0.1)' : 'rgba(74, 222, 128, 0.1)')
                    : (loading ? 'rgba(2, 132, 199, 0.08)' : 'rgba(22, 163, 74, 0.08)'),
                  border: (theme) => theme.palette.mode === 'dark'
                    ? (loading ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(74, 222, 128, 0.2)')
                    : (loading ? '1px solid rgba(2, 132, 199, 0.15)' : '1px solid rgba(22, 163, 74, 0.15)'),
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: (theme) => theme.palette.mode === 'dark'
                      ? (loading ? '#38bdf8' : '#4ade80')
                      : (loading ? '#0284c7' : '#16a34a'),
                    animation: loading ? 'none' : 'pulse-green 2.5s infinite',
                    '@keyframes pulse-green': {
                      '0%': { boxShadow: (theme) => `0 0 0 0 ${theme.palette.mode === 'dark' ? 'rgba(74, 222, 128, 0.7)' : 'rgba(22, 163, 74, 0.7)'}` },
                      '70%': { boxShadow: '0 0 0 6px rgba(74, 222, 128, 0)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(74, 222, 128, 0)' },
                    }
                  }}
                />
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: (theme) => theme.palette.mode === 'dark' ? (loading ? '#38bdf8' : '#4ade80') : (loading ? '#0284c7' : '#16a34a'), textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {loading ? 'Actualizando' : 'En vivo'}
                </Typography>
              </Box>
            </Stack>

            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
              {summaryMessage}
            </Typography>

            {customizeMode && (
              <Typography variant="caption" sx={{ color: 'warning.main', mt: 1, display: 'block', fontWeight: 600 }}>
                💡 Modo edición activo: arrastra los encabezados para mover, o estira las esquinas para cambiar el tamaño.
              </Typography>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>

                {!data?.visibility.canViewPremiums && data && (
                  <Tooltip title="Montos sensibles y primas ocultos para tu nivel de acceso">
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 2,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(217, 119, 6, 0.08)',
                        border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(217, 119, 6, 0.15)',
                        color: (theme) => theme.palette.mode === 'dark' ? '#fbbf24' : '#b45309',
                      }}
                    >
                      <ShieldAlert size={14} />
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Privado</Typography>
                    </Box>
                  </Tooltip>
                )}

                {layoutNotice && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 2,
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(22, 163, 74, 0.08)',
                      border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(74, 222, 128, 0.2)' : '1px solid rgba(22, 163, 74, 0.15)',
                      color: (theme) => theme.palette.mode === 'dark' ? '#4ade80' : '#16a34a',
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Guardado</Typography>
                  </Box>
                )}
              </Stack>

            </Stack>
          </Grid>
        </Grid>

        {loading && data && (
          <LinearProgress
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              bgcolor: 'transparent',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
              }
            }}
          />
        )}
      </Paper>

      {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error.message}</Alert>}

      {loadingDashboards ? (
        <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 1.5, my: 1.5 }} />
      ) : (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, pb: 1, mt: 1 }}>
          <Tabs
            value={currentDashboardName}
            onChange={(_, val) => setCurrentDashboardName(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                minWidth: 100,
              }
            }}
          >
            {dashboards.map((d) => (
              <Tab
                key={d.name}
                value={d.name}
                label={
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    {d.isPrimary && (
                      <Tooltip title="Tablero Principal">
                        <Box component="span" sx={{ color: 'warning.main', fontSize: '0.8rem', lineHeight: 1 }}>★</Box>
                      </Tooltip>
                    )}
                    <span>{d.name}</span>
                  </Stack>
                }
              />
            ))}
          </Tabs>
        </Box>
      )}

      {customizeMode && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 1,
            my: 1.5,
            borderRadius: 2,
            bgcolor: 'warning.light',
            color: 'warning.contrastText',
            fontWeight: 600,
            fontSize: '0.85rem',
            gap: 1
          }}
        >
          <Settings2 size={16} /> Modo Edición Activo: Arrastra widgets o usa el menú flotante en la esquina inferior derecha.
        </Box>
      )}

      {dashboardContentLoading ? (
        <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Box
              key={index}
              className="rounded-lg border border-[var(--himalaya-border)] bg-[var(--himalaya-surface)] p-5 shadow-[var(--himalaya-shadow)]"
              sx={{ minHeight: 220 }}
            >
              <Stack spacing={2}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flex: 1 }}>
                    <Skeleton variant="rounded" width={40} height={40} />
                    <Stack spacing={0.75} sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="60%" height={22} />
                      <Skeleton variant="text" width="42%" height={16} />
                    </Stack>
                  </Stack>
                </Stack>
                <Skeleton variant="rounded" width="100%" height={116} />
                <Stack direction="row" spacing={1}>
                  <Skeleton variant="text" width="35%" height={18} />
                  <Skeleton variant="text" width="24%" height={18} />
                </Stack>
              </Stack>
            </Box>
          ))}
        </Box>
      ) : activeWidgetInstances.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            px: 3,
            textAlign: 'center',
            borderRadius: '16px',
            border: '2px dashed var(--himalaya-border)',
            backgroundColor: 'var(--himalaya-surface-soft)',
            minHeight: 340
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'var(--himalaya-primary-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--himalaya-primary)',
              mb: 3
            }}
          >
            <Blocks size={40} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'var(--himalaya-text)' }}>
            Tablero vacío
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mb: 3.5, lineHeight: 1.6 }}>
            Este tablero operativo no tiene widgets configurados aún. Abre la librería de widgets para añadir y organizar tus métricas, gráficos y tablas.
          </Typography>
          <Button
            variant="contained"
            size="medium"
            startIcon={<Plus size={18} />}
            onClick={() => setWidgetsOpen(true)}
            sx={{
              px: 3.5,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(7, 89, 133, 0.2)'
            }}
          >
            Agregar mi primer widget
          </Button>
        </Box>
      ) : (
        <Box
          key={`${layoutVersion}-${customizeMode ? 'edit' : 'view'}-${activeWidgetInstances.map((inst) => inst.id).join('-')}`}
          ref={gridHostRef}
          className={`grid-stack dashboard-grid${customizeMode ? ' is-editing' : ''}`}
        >
          {activeWidgetInstances.map((inst) => {
            const widget = widgetCatalog.find((w) => w.id === inst.widgetId)
            if (!widget) return null

            const layout = layoutRef.current[inst.id] ?? widget.defaultLayout
            const settings = widgetSettings[inst.id] ?? {}
            const title = settings.title || widget.title
            const isDynamicDataWidget = !['Shortcuts', 'Security', 'SystemHealth', 'shortcuts', 'securityOverview'].includes(widget.presentationType ?? '')

            const gridItemProps = {
              className: 'grid-stack-item',
              'gs-id': inst.id,
              'gs-x': layout.x,
              'gs-y': layout.y,
              'gs-w': layout.w,
              'gs-h': layout.h,
              'gs-min-w': layout.minW,
              'gs-min-h': layout.minH,
            } as Record<string, string | number | undefined>

            return (
              <div key={inst.id} {...gridItemProps}>
                <div className="grid-stack-item-content">
                  <WidgetShell
                    title={title}
                    description={settings.subtitle !== undefined ? settings.subtitle : widget.description}
                    icon={widget.icon}
                    editing={customizeMode}
                    onConfigure={() => handleOpenConfigure(inst.id)}
                    onRemove={() => setWidgetIdToRemove(inst.id)}
                    onRefresh={isDynamicDataWidget ? () => {
                      setWidgetRefreshVersions((current) => ({
                        ...current,
                        [inst.id]: (current[inst.id] ?? 0) + 1,
                      }))
                    } : undefined}
                  >
                    {renderWidget(widget, settings, inst.id, widgetRefreshVersions[inst.id] ?? 0)}
                  </WidgetShell>
                </div>
              </div>
            )
          })}
        </Box>
      )}

      {/* Widget Library Modal */}
      <Dialog
        open={widgetsOpen}
        onClose={() => setWidgetsOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 850, letterSpacing: 0, pb: 1 }}>
          Librería de Widgets
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
          <Stack spacing={2.5}>
            <Typography color="text.secondary" sx={{ fontSize: '0.92rem' }}>
              Activa y configura los widgets disponibles para estructurar tu panel operativo ideal.
            </Typography>

            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
            >
              <Tab label="Todos" value="all" />
              <Tab label="Métricas" value="metrics" />
              <Tab label="Operación" value="operation" />
              <Tab label="Análisis" value="analysis" />
              <Tab label="Seguridad" value="security" />
            </Tabs>

            <Stack spacing={1.75}>
              {filteredCatalog.map((widget) => {
                const available = availableWidgetIds.has(widget.id)
                const instanceCount = activeWidgetInstances.filter((inst) => inst.widgetId === widget.id).length

                return (
                  <Box
                    key={widget.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 3,
                      p: 2.25,
                      opacity: available ? 1 : 0.58,
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s',
                      '&:hover': {
                        transform: available ? 'translateY(-1px)' : 'none',
                        borderColor: 'primary.main',
                        boxShadow: 3,
                      }
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0, borderRadius: 3, overflow: 'hidden' }}>
                          {renderWidgetMiniPreview(widget.presentationType)}
                        </Box>
                        <Box>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.75, mb: 0.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{widget.title}</Typography>
                            <Chip size="small" label={widget.category} variant="outlined" sx={{ borderRadius: 99 }} />
                            {!available && <Chip size="small" color="warning" variant="outlined" label="No disponible para este perfil" />}
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                            {widget.description}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1.5} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' }, alignItems: 'center' }}>
                        {instanceCount > 0 && (
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--himalaya-primary)' }}>
                            {instanceCount} {instanceCount === 1 ? 'activo' : 'activos'}
                          </Typography>
                        )}
                        <Button
                          variant="contained"
                          size="small"
                          disabled={!available}
                          startIcon={<Plus size={15} />}
                          onClick={() => addWidgetInstance(widget.id)}
                          sx={{ textTransform: 'none', borderRadius: 99, px: 2 }}
                        >
                          Agregar
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
          <Button color="error" variant="text" onClick={resetDashboard}>
            Restaurar base
          </Button>
          <Button variant="contained" onClick={() => setWidgetsOpen(false)}>
            Listo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Widget Settings Modal — fully generic, driven by presentationType */}
      <Dialog open={configuringWidgetId !== null} onClose={() => setConfiguringWidgetId(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Configurar: {configuringWidget?.title ?? 'Widget'}
        </DialogTitle>
        <DialogContent dividers>
          {configuringWidgetId && (
            <Stack spacing={3} sx={{ py: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Personaliza el comportamiento y la presentación visual de este widget.
              </Typography>

              {/* Title override — always shown */}
              <TextField
                label="Etiqueta del Widget"
                value={tempSettings.title ?? ''}
                onChange={(e) => setTempSettings({ ...tempSettings, title: e.target.value })}
                placeholder={configuringWidget?.title ?? 'Nombre personalizado'}
                fullWidth
                variant="outlined"
                size="small"
              />

              {/* Subtitle override — always shown */}
              <TextField
                label="Subtítulo / Descripción"
                value={tempSettings.subtitle ?? ''}
                onChange={(e) => setTempSettings({ ...tempSettings, subtitle: e.target.value })}
                placeholder={configuringWidget?.description ?? 'Descripción o subtítulo'}
                fullWidth
                variant="outlined"
                size="small"
                helperText="Si lo dejas vacío, el widget se mostrará sin subtítulo."
              />

              {/* ─── Origen de datos — shown for all non-fixed widgets ─── */}
              {configuringWidget?.presentationType && !['Shortcuts', 'Security', 'SystemHealth', 'shortcuts', 'securityOverview'].includes(configuringWidget.presentationType) && (
                <FormControl fullWidth size="small">
                  <InputLabel>Origen de datos</InputLabel>
                  <Select
                    label="Origen de datos"
                    value={tempSettings.dataSource ?? ''}
                    onChange={(e) => {
                      const newSource = e.target.value as any
                      setTempSettings({
                        ...tempSettings,
                        dataSource: newSource,
                        groupByField: 'status',
                        aggregateFunction: 'count',
                        aggregateField: '',
                        daysWindow: 30,
                        fieldsToShow: newSource === 'clientes'
                          ? ['displayName', 'type', 'status']
                          : newSource === 'polizas'
                            ? ['policyNumber', 'premiumAmount', 'status']
                            : ['caseNumber', 'title', 'status'],
                        filters: [],
                      })
                    }}
                  >
                    <MenuItem value="clientes">Clientes</MenuItem>
                    <MenuItem value="polizas">Pólizas</MenuItem>
                    <MenuItem value="casos">Casos</MenuItem>
                  </Select>
                </FormControl>
              )}

              {/* ─── Chart-specific: group by ─── */}
              {configuringWidget?.presentationType && (
                configuringWidget.presentationType.includes('Chart') ||
                configuringWidget.presentationType === 'Sparkline' ||
                configuringWidget.presentationType === 'Gauge'
              ) && tempSettings.dataSource && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Agrupar por</InputLabel>
                    <Select
                      label="Agrupar por"
                      value={tempSettings.groupByField ?? 'status'}
                      onChange={(e) => setTempSettings({ ...tempSettings, groupByField: e.target.value })}
                    >
                      {(tempSettings.dataSource === 'polizas' ? [
                        { value: 'status', label: 'Estado de la Póliza' },
                        { value: 'currency', label: 'Moneda de Pago' }
                      ] : tempSettings.dataSource === 'casos' ? [
                        { value: 'status', label: 'Estado del Caso' },
                        { value: 'priority', label: 'Prioridad' },
                        { value: 'type', label: 'Tipo de Caso' }
                      ] : [
                        { value: 'status', label: 'Estado de Cuenta' },
                        { value: 'type', label: 'Tipo de cliente' },
                        { value: 'department', label: 'Departamento' }
                      ]).map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

              {/* ─── DataGrid: columns + row limit ─── */}
              {configuringWidget?.presentationType === 'DataGrid' && tempSettings.dataSource && (
                <>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Columnas a mostrar:
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {(tempSettings.dataSource === 'polizas'
                        ? POLICY_FIELDS
                        : tempSettings.dataSource === 'casos'
                          ? CASE_FIELDS
                          : CLIENT_FIELDS
                      ).map((f) => {
                        const currentFields = tempSettings.fieldsToShow ?? []
                        const isSelected = currentFields.includes(f.key)
                        return (
                          <Chip
                            key={f.key}
                            label={f.label}
                            color={isSelected ? 'primary' : 'default'}
                            variant={isSelected ? 'filled' : 'outlined'}
                            onClick={() => {
                              setTempSettings({
                                ...tempSettings,
                                fieldsToShow: isSelected
                                  ? currentFields.filter((item) => item !== f.key)
                                  : [...currentFields, f.key],
                              })
                            }}
                            sx={{ cursor: 'pointer' }}
                          />
                        )
                      })}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Filas por página ({tempSettings.limit ?? 5})
                    </Typography>
                    <Slider
                      value={tempSettings.limit ?? 5}
                      min={3}
                      max={15}
                      step={1}
                      marks={[{ value: 3, label: '3' }, { value: 5, label: '5' }, { value: 10, label: '10' }, { value: 15, label: '15' }]}
                      valueLabelDisplay="auto"
                      onChange={(_, val) => setTempSettings({ ...tempSettings, limit: val as number })}
                    />
                  </Box>
                </>
              )}

              {/* ─── Metric / Gauge: color ─── */}
              {configuringWidget?.presentationType && (
                configuringWidget.presentationType === 'Metric' ||
                configuringWidget.presentationType === 'Gauge' ||
                configuringWidget.presentationType.includes('Chart') ||
                configuringWidget.presentationType === 'Sparkline'
              ) && tempSettings.dataSource && (
                  <Stack spacing={1.5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Funcion a calcular</InputLabel>
                      <Select
                        label="Funcion a calcular"
                        value={tempSettings.aggregateFunction ?? 'count'}
                        onChange={(e) => {
                          const nextFunction = e.target.value
                          const numericFields = NUMERIC_FIELDS_BY_SOURCE[tempSettings.dataSource ?? ''] ?? []
                          setTempSettings({
                            ...tempSettings,
                            aggregateFunction: nextFunction,
                            aggregateField: AGGREGATE_FIELD_REQUIRED.has(nextFunction)
                              ? (numericFields[0]?.key ?? '')
                              : tempSettings.aggregateField,
                            daysWindow: AGGREGATE_WINDOW_FUNCTIONS.has(nextFunction) ? (tempSettings.daysWindow ?? 30) : tempSettings.daysWindow,
                          })
                        }}
                      >
                        {AGGREGATE_FUNCTIONS.map((fn) => (
                          <MenuItem key={fn.value} value={fn.value}>
                            <Stack spacing={0.25}>
                              <Typography variant="body2">{fn.label}</Typography>
                              <Typography variant="caption" color="text.secondary">{fn.description}</Typography>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {(AGGREGATE_FIELD_REQUIRED.has(tempSettings.aggregateFunction ?? 'count') || AGGREGATE_FIELD_OPTIONAL.has(tempSettings.aggregateFunction ?? 'count')) && (
                      <FormControl fullWidth size="small">
                        <InputLabel>Campo de calculo</InputLabel>
                        <Select
                          label="Campo de calculo"
                          value={tempSettings.aggregateField ?? ''}
                          onChange={(e) => setTempSettings({ ...tempSettings, aggregateField: e.target.value })}
                        >
                          {AGGREGATE_FIELD_REQUIRED.has(tempSettings.aggregateFunction ?? 'count')
                            ? (NUMERIC_FIELDS_BY_SOURCE[tempSettings.dataSource ?? ''] ?? []).map((field) => (
                              <MenuItem key={field.key} value={field.key}>{field.label}</MenuItem>
                            ))
                            : (tempSettings.dataSource === 'polizas'
                              ? POLICY_FIELDS
                              : tempSettings.dataSource === 'casos'
                                ? CASE_FIELDS
                                : CLIENT_FIELDS
                            ).map((field) => (
                              <MenuItem key={field.key} value={field.key}>{field.label}</MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    )}

                    {AGGREGATE_WINDOW_FUNCTIONS.has(tempSettings.aggregateFunction ?? 'count') && (
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Ventana de dias ({tempSettings.daysWindow ?? 30})
                        </Typography>
                        <Slider
                          value={tempSettings.daysWindow ?? 30}
                          min={7}
                          max={120}
                          step={1}
                          marks={[{ value: 7, label: '7' }, { value: 30, label: '30' }, { value: 60, label: '60' }, { value: 120, label: '120' }]}
                          valueLabelDisplay="auto"
                          onChange={(_, val) => setTempSettings({ ...tempSettings, daysWindow: val as number })}
                        />
                      </Box>
                    )}
                  </Stack>
                )}

              {/* â”€â”€â”€ Metric / Gauge: color â”€â”€â”€ */}
              {configuringWidget?.presentationType && (
                configuringWidget.presentationType === 'Metric' ||
                configuringWidget.presentationType === 'Gauge'
              ) && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Color del indicador</InputLabel>
                    <Select
                      label="Color del indicador"
                      value={tempSettings.tone ?? 'primary'}
                      onChange={(e) => setTempSettings({ ...tempSettings, tone: e.target.value as any })}
                    >
                      <MenuItem value="primary">Azul (Principal)</MenuItem>
                      <MenuItem value="success">Verde (Éxito)</MenuItem>
                      <MenuItem value="warning">Amarillo (Advertencia)</MenuItem>
                      <MenuItem value="info">Celeste (Información)</MenuItem>
                    </Select>
                  </FormControl>
                )}

              {/* ─── Filtros avanzados — shown when a dataSource is selected ─── */}
              {tempSettings.dataSource && (
                <Box>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Filtros de datos
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Plus size={13} />}
                      onClick={() => setTempSettings({
                        ...tempSettings,
                        filters: [
                          ...(tempSettings.filters ?? []),
                          { field: 'status', operator: 'eq', value: getDefaultFilterValue(tempSettings.dataSource ?? '', 'status') }
                        ]
                      })}
                      sx={{ textTransform: 'none' }}
                    >
                      Agregar filtro
                    </Button>
                  </Stack>

                  {(tempSettings.filters ?? []).length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Sin filtros aplicados. Se mostrará toda la información disponible.
                    </Typography>
                  )}

                  <Stack spacing={1.5}>
                    {(tempSettings.filters ?? []).map((filter, idx) => {
                      const availableFields =
                        tempSettings.dataSource === 'polizas' ? POLICY_FIELDS :
                          tempSettings.dataSource === 'casos' ? CASE_FIELDS :
                            CLIENT_FIELDS

                      const options = getFilterFieldOptions(tempSettings.dataSource ?? '', filter.field)
                      const isNullOperator = filter.operator === 'is_null' || filter.operator === 'is_not_null'
                      const isDateField = isDateFilterField(filter.field)

                      return (
                        <Stack key={idx} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <FormControl size="small" sx={{ flex: 1.2 }}>
                            <InputLabel>Campo</InputLabel>
                            <Select
                              label="Campo"
                              value={filter.field}
                              onChange={(e) => {
                                const newField = e.target.value
                                const updated = [...(tempSettings.filters ?? [])]
                                const nextOperator = isDateFilterField(newField) ? 'gt' : 'eq'
                                updated[idx] = {
                                  ...updated[idx],
                                  field: newField,
                                  operator: nextOperator,
                                  value: getDefaultFilterValue(tempSettings.dataSource ?? '', newField)
                                }
                                setTempSettings({ ...tempSettings, filters: updated })
                              }}
                            >
                              {availableFields.map((f) => (
                                <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Operador</InputLabel>
                            <Select
                              label="Operador"
                              value={filter.operator}
                              onChange={(e) => {
                                const newOp = e.target.value as FilterOperator
                                const updated = [...(tempSettings.filters ?? [])]
                                const isNewOpNull = newOp === 'is_null' || newOp === 'is_not_null'
                                updated[idx] = {
                                  ...updated[idx],
                                  operator: newOp,
                                  value: isNewOpNull ? '' : updated[idx].value
                                }
                                setTempSettings({ ...tempSettings, filters: updated })
                              }}
                            >
                              <MenuItem value="eq">Igual a</MenuItem>
                              <MenuItem value="neq">Diferente de</MenuItem>
                              {!isDateField && <MenuItem value="contains">Contiene</MenuItem>}
                              {!isDateField && <MenuItem value="not_contains">No contiene</MenuItem>}
                              <MenuItem value="gt">Mayor que</MenuItem>
                              <MenuItem value="lt">Menor que</MenuItem>
                              <MenuItem value="is_null">Es nulo / vacío</MenuItem>
                              <MenuItem value="is_not_null">No es nulo / vacío</MenuItem>
                            </Select>
                          </FormControl>

                          {isNullOperator ? (
                            <TextField
                              size="small"
                              label="Valor"
                              value=""
                              disabled
                              placeholder="No requiere"
                              sx={{ flex: 1 }}
                            />
                          ) : isDateField ? (
                            <DatePicker
                              label="Valor"
                              value={filter.value ? dayjs(filter.value) : null}
                              onChange={(newValue) => {
                                const updated = [...(tempSettings.filters ?? [])]
                                updated[idx] = {
                                  ...updated[idx],
                                  value: newValue?.isValid() ? newValue.startOf('day').toISOString() : ''
                                }
                                setTempSettings({ ...tempSettings, filters: updated })
                              }}
                              format="DD/MM/YYYY"
                              slotProps={{
                                field: {
                                  readOnly: true,
                                },
                                textField: {
                                  size: 'small',
                                  sx: { flex: 1 },
                                },
                              }}
                            />
                          ) : options ? (
                            <FormControl size="small" sx={{ flex: 1 }}>
                              <InputLabel>Valor</InputLabel>
                              <Select
                                label="Valor"
                                value={normalizeFilterValue(tempSettings.dataSource ?? '', filter.field, filter.value)}
                                onChange={(e) => {
                                  const updated = [...(tempSettings.filters ?? [])]
                                  updated[idx] = { ...updated[idx], value: e.target.value }
                                  setTempSettings({ ...tempSettings, filters: updated })
                                }}
                              >
                                {options.map((opt) => (
                                  <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ) : (
                            <TextField
                              size="small"
                              label="Valor"
                              value={filter.value}
                              onChange={(e) => {
                                const updated = [...(tempSettings.filters ?? [])]
                                updated[idx] = { ...updated[idx], value: e.target.value }
                                setTempSettings({ ...tempSettings, filters: updated })
                              }}
                              sx={{ flex: 1 }}
                            />
                          )}

                          <Button
                            size="small"
                            color="error"
                            sx={{ minWidth: 32, width: 32, height: 40, p: 0 }}
                            onClick={() => {
                              const updated = (tempSettings.filters ?? []).filter((_, i) => i !== idx)
                              setTempSettings({ ...tempSettings, filters: updated })
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </Stack>
                      )
                    })}
                  </Stack>
                </Box>
              )}

              {/* Custom Axis Labels for Charts */}
              {configuringWidget?.presentationType && (
                configuringWidget.presentationType.includes('Chart')
              ) && (
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Etiqueta Eje X (Categorías)"
                      value={tempSettings.xAxisLabel ?? ''}
                      onChange={(e) => setTempSettings({ ...tempSettings, xAxisLabel: e.target.value })}
                      placeholder="Ej. Estados, Monedas"
                      fullWidth
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      label="Etiqueta Eje Y (Valores)"
                      value={tempSettings.yAxisLabel ?? ''}
                      onChange={(e) => setTempSettings({ ...tempSettings, yAxisLabel: e.target.value })}
                      placeholder="Ej. Cantidad, Monto"
                      fullWidth
                      variant="outlined"
                      size="small"
                    />
                  </Stack>
                )}

              {/* Limit for list-type widgets */}
              {configuringWidget?.presentationType && (
                configuringWidget.presentationType === 'List'
              ) && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Número máximo de elementos ({tempSettings.limit ?? 5})
                    </Typography>
                    <Slider
                      value={tempSettings.limit ?? 5}
                      min={1}
                      max={10}
                      step={1}
                      marks
                      onChange={(_, val) => setTempSettings({ ...tempSettings, limit: val as number })}
                    />
                  </Box>
                )}

            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3 }}>
          <Button variant="text" onClick={() => setConfiguringWidgetId(null)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveSettings}>
            Guardar configuración
          </Button>
        </DialogActions>
      </Dialog>
      {/* Dialog: Nuevo Tablero */}
      <Dialog open={isAddDialogOpen} onClose={() => !isAddingDashboard && setIsAddDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Tablero</DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Ingresa el nombre para tu nuevo tablero operativo personalizado.
            </Typography>
            <TextField
              label="Nombre del Tablero"
              value={newDashboardName}
              onChange={(e) => setNewDashboardName(e.target.value)}
              placeholder="Ej. Comercial, Siniestros..."
              fullWidth
              autoFocus
              variant="outlined"
              size="small"
              disabled={isAddingDashboard}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="text" onClick={() => setIsAddDialogOpen(false)} disabled={isAddingDashboard}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAddDashboard}
            disabled={!newDashboardName.trim() || isAddingDashboard}
            startIcon={isAddingDashboard ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isAddingDashboard ? 'Creando...' : 'Crear Tablero'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Renombrar Tablero */}
      <Dialog open={isRenameDialogOpen} onClose={() => !isRenamingDashboard && setIsRenameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Renombrar Tablero</DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Modifica el nombre para este tablero operativo personalizado.
            </Typography>
            <TextField
              label="Nuevo Nombre"
              value={renameDashboardName}
              onChange={(e) => setRenameDashboardName(e.target.value)}
              placeholder="Ej. Comercial, Siniestros..."
              fullWidth
              autoFocus
              variant="outlined"
              size="small"
              disabled={isRenamingDashboard}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="text" onClick={() => setIsRenameDialogOpen(false)} disabled={isRenamingDashboard}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleRenameDashboard}
            disabled={!renameDashboardName.trim() || renameDashboardName.trim() === currentDashboardName || isRenamingDashboard}
            startIcon={isRenamingDashboard ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isRenamingDashboard ? 'Renombrando...' : 'Renombrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Confirmar Eliminación */}
      <Dialog open={isDeleteDialogOpen} onClose={() => !isDeletingDashboard && setIsDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar Tablero?</DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            ¿Estás seguro de que deseas eliminar el tablero <strong>"{currentDashboardName}"</strong>? Esta acción no se puede deshacer y borrará permanentemente su configuración.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="text" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletingDashboard}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteDashboard}
            disabled={isDeletingDashboard}
            startIcon={isDeletingDashboard ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isDeletingDashboard ? 'Eliminando...' : 'Eliminar permanentemente'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Confirmar Eliminación de Widget */}
      <Dialog open={!!widgetIdToRemove} onClose={() => setWidgetIdToRemove(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lucide.AlertTriangle color="var(--mui-palette-error-main)" /> ¿Quitar Widget?
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            ¿Estás seguro de que deseas quitar este widget del tablero? Deberás volver a agregarlo y configurarlo desde la librería si deseas recuperarlo.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="text" onClick={() => setWidgetIdToRemove(null)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (widgetIdToRemove) {
                removeWidgetInstance(widgetIdToRemove)
                setWidgetIdToRemove(null)
              }
            }}
          >
            Quitar Widget
          </Button>
        </DialogActions>
      </Dialog>

      {customizeMode ? (
        <Stack
          spacing={2}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1200,
            alignItems: 'flex-end',
          }}
        >
          {/* Sub-actions for Edit Mode (Agregar Widget, Renombrar, Eliminar) */}
          {speedDialActions.slice(1).map((action) => (
            <Stack key={action.name} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 2,
                  borderRadius: 1,
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {action.name}
              </Box>
              <Fab
                size="small"
                onClick={action.onClick}
                sx={{
                  bgcolor: 'background.paper',
                  color: action.color || 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 3,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: action.hoverColor || 'primary.main',
                    transform: 'scale(1.08)',
                    boxShadow: 5,
                  }
                }}
              >
                {action.icon}
              </Fab>
            </Stack>
          ))}

          {/* Main Save FAB at the bottom */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                bgcolor: 'background.paper',
                color: 'text.primary',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 2,
                borderRadius: 1,
                px: 1.5,
                py: 0.5,
                fontSize: '0.85rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              Guardar Cambios
            </Box>
            <Fab
              onClick={speedDialActions[0]?.onClick}
              sx={{
                bgcolor: 'warning.main',
                color: '#fff',
                '&:hover': {
                  bgcolor: 'warning.dark',
                },
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { boxShadow: '0 0 0 0 rgba(237, 108, 2, 0.5)' },
                  '70%': { boxShadow: '0 0 0 12px rgba(237, 108, 2, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(237, 108, 2, 0)' }
                }
              }}
            >
              <Lucide.Save />
            </Fab>
          </Stack>
        </Stack>
      ) : (
        <SpeedDial
          ariaLabel="Acciones de Tablero"
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}
          icon={<SpeedDialIcon icon={<Lucide.LayoutDashboard />} openIcon={<Lucide.LayoutDashboard />} />}
          onOpen={() => setSpeedDialOpen(true)}
          onClose={() => setSpeedDialOpen(false)}
          open={speedDialOpen}
          FabProps={{
            sx: {
              bgcolor: 'primary.main',
              color: '#fff',
              '&:hover': {
                bgcolor: 'primary.dark',
              }
            }
          }}
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              slotProps={{
                tooltip: {
                  title: action.name,
                  open: true
                }
              }}
              onClick={action.onClick}
              sx={{
                '& .MuiSpeedDialAction-staticTooltipLabel': {
                  width: 'auto',
                  minWidth: 120,
                  textAlign: 'right',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 2,
                  borderRadius: 1,
                  px: 1.5,
                  py: 0.5,
                },
                '& .MuiSpeedDialAction-fab': {
                  bgcolor: 'background.paper',
                  color: action.color || 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 3,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: action.hoverColor || 'primary.main',
                    transform: 'scale(1.08)',
                    boxShadow: 5,
                  }
                }
              }}
            />
          ))}
        </SpeedDial>
      )}
    </Stack>
  )
}



const CLIENT_FIELDS = [
  { key: 'displayName', label: 'Nombre' },
  { key: 'type', label: 'Tipo' },
  { key: 'status', label: 'Estado' },
  { key: 'taxId', label: 'NIT / ID' },
  { key: 'email', label: 'Correo' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'city', label: 'Ciudad' },
  { key: 'department', label: 'Departamento' },
]

const POLICY_FIELDS = [
  { key: 'policyNumber', label: 'Número de Póliza' },
  { key: 'status', label: 'Estado' },
  { key: 'startDate', label: 'Fecha Inicio' },
  { key: 'endDate', label: 'Fecha Vence' },
  { key: 'premiumAmount', label: 'Prima' },
  { key: 'insuredAmount', label: 'Monto Asegurado' },
]

const CASE_FIELDS = [
  { key: 'caseNumber', label: 'Número de Caso' },
  { key: 'title', label: 'Título' },
  { key: 'status', label: 'Estado' },
  { key: 'priority', label: 'Prioridad' },
  { key: 'type', label: 'Tipo' },
  { key: 'dueAt', label: 'Fecha Vence' },
]

const AGGREGATE_FUNCTIONS = [
  { value: 'count', label: 'Cantidad de registros', description: 'Cuenta todo lo que cumpla los filtros' },
  { value: 'sum', label: 'Suma', description: 'Suma un campo numerico' },
  { value: 'avg', label: 'Promedio', description: 'Promedia un campo numerico' },
  { value: 'min', label: 'Valor minimo', description: 'Menor valor de un campo numerico' },
  { value: 'max', label: 'Valor maximo', description: 'Mayor valor de un campo numerico' },
  { value: 'distinct_count', label: 'Valores unicos', description: 'Cuenta valores distintos de un campo' },
  { value: 'active_count', label: 'Activos / vigentes', description: 'Clientes activos, polizas vigentes o casos activos' },
  { value: 'inactive_count', label: 'Inactivos / prospectos', description: 'Clientes no activos' },
  { value: 'expired_count', label: 'Vencidos', description: 'Polizas vencidas' },
  { value: 'cancelled_count', label: 'Cancelados', description: 'Registros cancelados' },
  { value: 'open_count', label: 'Abiertos', description: 'Casos o registros no cerrados' },
  { value: 'closed_count', label: 'Cerrados', description: 'Registros completados' },
  { value: 'overdue_count', label: 'Atrasados por fecha', description: 'Vencidos segun fecha limite' },
  { value: 'due_soon_count', label: 'Proximos a vencer', description: 'Vencen dentro de una ventana de dias' },
  { value: 'renewal_due_count', label: 'Renovaciones proximas', description: 'Polizas vigentes o por renovar dentro de la ventana' },
  { value: 'active_rate', label: 'Porcentaje activo', description: 'Activos sobre el total filtrado' },
  { value: 'expiration_rate', label: 'Porcentaje vencido', description: 'Vencidos sobre el total filtrado' },
  { value: 'conversion_rate', label: 'Tasa de conversion', description: 'Activos sobre total filtrado' },
]

const NUMERIC_FIELDS_BY_SOURCE: Record<string, Array<{ key: string; label: string }>> = {
  clientes: [],
  polizas: [
    { key: 'premiumAmount', label: 'Prima' },
    { key: 'insuredAmount', label: 'Monto asegurado' },
  ],
  casos: [],
}

const AGGREGATE_FIELD_REQUIRED = new Set(['sum', 'avg', 'min', 'max'])
const AGGREGATE_FIELD_OPTIONAL = new Set(['distinct_count'])
const AGGREGATE_WINDOW_FUNCTIONS = new Set(['due_soon_count', 'renewal_due_count'])

const DATE_FILTER_FIELDS = new Set(['startDate', 'endDate', 'dueAt'])

function isDateFilterField(field: string) {
  return DATE_FILTER_FIELDS.has(field)
}

function getDefaultFilterValue(dataSource: string, field: string) {
  const options = getFilterFieldOptions(dataSource, field)
  if (options) return options[0].value
  if (isDateFilterField(field)) return dayjs().startOf('day').toISOString()
  return ''
}

const getFilterFieldOptions = (dataSource: string, field: string) => {
  if (field === 'status') {
    if (dataSource === 'clientes') {
      return [
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' },
        { value: 'prospect', label: 'Prospecto' },
      ]
    }
    if (dataSource === 'polizas') {
      return [
        { value: 'active', label: 'Vigente' },
        { value: 'draft', label: 'Borrador' },
        { value: 'pending_renewal', label: 'Pendiente de renovación' },
        { value: 'expired', label: 'Vencida' },
        { value: 'cancelled', label: 'Cancelado' },
      ]
    }
    if (dataSource === 'casos') {
      return [
        { value: 'pending', label: 'Pendiente' },
        { value: 'in_progress', label: 'En proceso' },
        { value: 'closed', label: 'Completado' },
        { value: 'cancelled', label: 'Cancelado' },
      ]
    }
  }

  if (field === 'priority' && dataSource === 'casos') {
    return [
      { value: 'low', label: 'Baja' },
      { value: 'medium', label: 'Media' },
      { value: 'high', label: 'Alta' },
      { value: 'urgent', label: 'Urgente' },
    ]
  }

  if (field === 'type') {
    if (dataSource === 'clientes') {
      return [
        { value: 'individual', label: 'Persona individual' },
        { value: 'company', label: 'Empresa' },
      ]
    }
    if (dataSource === 'casos') {
      return [
        { value: 'claim', label: 'Reclamo' },
        { value: 'renewal', label: 'Renovación' },
        { value: 'endorsement', label: 'Endoso' },
        { value: 'payment', label: 'Pago' },
        { value: 'documentation', label: 'Documentación' },
        { value: 'general_support', label: 'Soporte general' },
      ]
    }
  }

  return null
}
