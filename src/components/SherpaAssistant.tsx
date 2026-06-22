import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Box, Paper, Typography, IconButton, InputBase, Chip, Avatar, Tooltip, Stack, Drawer, Backdrop, Button, TextField, CircularProgress } from '@mui/material'
import { Search, Bot, Eye, CornerDownLeft, Keyboard, ArrowUp, ArrowDown, FileText, ArrowLeft, Database, X, Copy, MessageSquare, Check, Send } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router'
import { fetchCases, fetchClients, fetchPolicies, updateCase, addCommentApi, fetchUsers } from '../api/maintenanceApi'
import type { CaseRaw, ClientRaw, PolicyRaw, UserRaw } from '../api/maintenanceApi'
import { graphqlRequest } from '../api/graphqlClient'
import { graphqlOperationIds } from '../api/graphqlOperationIds'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { normalizeAppRoute } from '../utils/routes'

interface ScreenContext {
  pageTitle: string
  pageRoute: string
  activeEntity?: {
    type: 'case' | 'policy' | 'client' | 'product' | 'provider'
    uuid?: string
    idCode?: string
    title?: string
    status?: string
    clientName?: string
    assignedTo?: string
  }
  visibleTableRowsCount: number
  visibleTableData: Array<Record<string, string>>
  hasOpenForm: boolean
  openFormFields: Array<{
    name: string
    label: string
    type: string
    value: string
  }>
}

interface CommandItem {
  id: string
  title: string
  subtitle: string
  category: 'Navegación' | 'Acción' | 'Datos en Pantalla'
  keywords: string[]
  icon: React.ReactNode
  onExecute: (ctx: ScreenContext | null) => void | Promise<void>
}

type AIViewType = 'commands' | 'ai-loading' | 'ai-result' | 'add-comment' | 'change-status'

interface AIResponse {
  title: string
  summary: string
  type: 'list-clients' | 'list-policies' | 'list-cases' | 'list-users' | 'calculation' | 'text' | 'universal-search' | 'system-health'
  data?: any[]
  clientsData?: ClientRaw[]
  policiesData?: PolicyRaw[]
  casesData?: CaseRaw[]
  stats?: {
    sum: number
    avg: number
    min: number
    max: number
    count: number
    field: string
  }
}

// Feature flag to disable the AI assistant completely for now
const ENABLE_SUMMIT_AI = false;

export function SummitAssistant() {
  if (!ENABLE_SUMMIT_AI) return null;
  return <SummitAssistantInner />;
}

function SummitAssistantInner() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [screenCtx, setScreenCtx] = useState<ScreenContext | null>(null)

  const [activeView, setActiveView] = useState<AIViewType>('commands')
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)

  // Custom states for interactive actions
  const [commentText, setCommentText] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)

  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Summon via hotkey Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Scan screen context whenever route changes or panel is opened
  useEffect(() => {
    if (isOpen) {
      scanScreenContext()
      setActiveIndex(0)
      setActiveView('commands')
      setInputText('')
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 150)
    }
  }, [location.pathname, isOpen])

  // Helper function to render bold markdown ** correctly in React
  const renderMarkdownText = (text: string) => {
    if (!text) return ''
    const parts = text.split('**')
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} style={{ fontWeight: 800, color: 'inherit' }}>{part}</strong>
      }
      return part
    })
  }

  // DOM Scraper for Screen Awareness
  const scanScreenContext = () => {
    const route = window.location.pathname
    let title = document.querySelector('h1')?.textContent || document.title || 'Himalaya Dashboard'

    if (title.includes('Seguros Himalaya')) title = 'Dashboard'

    const context: ScreenContext = {
      pageTitle: title,
      pageRoute: route,
      visibleTableRowsCount: 0,
      visibleTableData: [],
      hasOpenForm: false,
      openFormFields: []
    }

    // Detect open Dialogs / Drawers
    const drawerEl = document.querySelector('.MuiDrawer-root, [role="presentation"]')
    const dialogEl = document.querySelector('[role="dialog"]')
    const activePanel = drawerEl || dialogEl

    if (activePanel) {
      const caseNumberEl = activePanel.querySelector('[data-case-number]')
      const activeCaseNumber = caseNumberEl?.getAttribute('data-case-number')

      if (activeCaseNumber) {
        const headingEl = activePanel.querySelector('h2, h3, .MuiTypography-h5, .MuiTypography-h6')
        const labelsAndValues = Array.from(activePanel.querySelectorAll('.MuiTypography-root'))

        let clientName = ''
        let assignedTo = ''
        let status = ''

        labelsAndValues.forEach((el, index) => {
          const text = el.textContent || ''
          if (text.includes('Cliente') && labelsAndValues[index + 1]) {
            clientName = labelsAndValues[index + 1].textContent || ''
          }
          if (text.includes('Responsable') && labelsAndValues[index + 1]) {
            assignedTo = labelsAndValues[index + 1].textContent || ''
          }
          if (text.includes('Estado') && labelsAndValues[index + 1]) {
            status = labelsAndValues[index + 1].textContent || ''
          }
        })

        context.activeEntity = {
          type: 'case',
          idCode: activeCaseNumber,
          title: headingEl?.textContent || 'Detalle del Caso',
          clientName: clientName.trim() || undefined,
          assignedTo: assignedTo.trim() || undefined,
          status: status.trim() || undefined
        }
      }
    }

    // Scan visible Data Grids (Mui DataGrid)
    const rows = document.querySelectorAll('.MuiDataGrid-row')
    context.visibleTableRowsCount = rows.length
    if (rows.length > 0) {
      const data: Array<Record<string, string>> = []
      rows.forEach((row) => {
        const cells = row.querySelectorAll('.MuiDataGrid-cell')
        const rowData: Record<string, string> = {}
        cells.forEach((cell) => {
          const fieldName = cell.getAttribute('data-field') || ''
          if (fieldName && fieldName !== 'actions') {
            rowData[fieldName] = cell.textContent || ''
          }
        })
        data.push(rowData)
      })
      context.visibleTableData = data
    }

    // Scan open forms and inputs
    const inputs = document.querySelectorAll('form input, form select, form textarea')
    if (inputs.length > 0) {
      context.hasOpenForm = true
      inputs.forEach((inputEl) => {
        const input = inputEl as HTMLInputElement
        const name = input.name || input.id || ''
        const labelEl = document.querySelector(`label[for="${input.id}"]`) || input.closest('.MuiFormControl-root')?.querySelector('label')
        const label = labelEl?.textContent || name

        if (name && !name.startsWith('_')) {
          context.openFormFields.push({
            name,
            label: label.replace('*', '').trim(),
            type: input.type || 'text',
            value: input.value || ''
          })
        }
      })
    }

    setScreenCtx(context)
    return context
  }

  // Copy table data to clipboard
  const handleCopyTableData = () => {
    if (!screenCtx || screenCtx.visibleTableRowsCount === 0) {
      toast.error('No hay datos de tabla para copiar en esta pantalla.')
      return
    }

    try {
      const headers = Object.keys(screenCtx.visibleTableData[0] || {})
      if (headers.length === 0) {
        toast.error('La tabla no posee columnas legibles.')
        return
      }

      // Format as Markdown table
      const headerRow = `| ${headers.join(' | ')} |`
      const dividerRow = `| ${headers.map(() => '---').join(' | ')} |`
      const dataRows = screenCtx.visibleTableData.map(row => {
        return `| ${headers.map(h => row[h] || '').join(' | ')} |`
      })

      const markdownTable = [headerRow, dividerRow, ...dataRows].join('\n')
      navigator.clipboard.writeText(markdownTable)
      toast.success(`Copiadas ${screenCtx.visibleTableRowsCount} filas formateadas en Markdown al portapapeles.`)
    } catch (err) {
      toast.error('No se pudo copiar la tabla al portapapeles.')
    }
  }

  // Submit case comment
  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error('El comentario no puede estar vacío.')
      return
    }

    if (!screenCtx?.activeEntity?.idCode) {
      toast.error('No hay un caso activo seleccionado.')
      return
    }

    setSubmittingAction(true)
    try {
      const casesList = await fetchCases()
      const found = casesList.find(c => c.caseNumber.toUpperCase() === screenCtx.activeEntity?.idCode?.toUpperCase())

      if (!found) {
        toast.error('No se localizó el caso activo en base de datos.')
        setSubmittingAction(false)
        return
      }

      await addCommentApi(found.uuid, commentText, false)
      toast.success('Comentario agregado exitosamente al historial.')
      setCommentText('')
      setActiveView('commands')
      scanScreenContext()
    } catch (err) {
      toast.error('Error al agregar comentario.')
    } finally {
      setSubmittingAction(false)
    }
  }

  // Update active case status
  const handleUpdateStatus = async (newStatus: 'Pending' | 'In Progress' | 'Closed') => {
    if (!screenCtx?.activeEntity?.idCode) {
      toast.error('No hay un caso activo seleccionado.')
      return
    }

    setSubmittingAction(true)
    try {
      const casesList = await fetchCases()
      const found = casesList.find(c => c.caseNumber.toUpperCase() === screenCtx.activeEntity?.idCode?.toUpperCase())

      if (!found) {
        toast.error('No se localizó el caso activo.')
        setSubmittingAction(false)
        return
      }

      await updateCase({ uuid: found.uuid, status: newStatus })
      await addCommentApi(found.uuid, `Estado del caso cambiado a **${newStatus}** por medio del Asistente Summit AI.`, false)
      toast.success(`Estado actualizado a ${newStatus}.`)
      setActiveView('commands')
      scanScreenContext()
    } catch (err) {
      toast.error('Error al actualizar estado del caso.')
    } finally {
      setSubmittingAction(false)
    }
  }

  // Executing systemic action commands returned from AI JSON block
  const executeAICommand = (cmd: { action: string; route?: string; status?: string; caseNumber?: string }) => {
    if (cmd.action === 'navigate' && cmd.route) {
      const route = normalizeAppRoute(cmd.route)
      toast.success(`Redirigiendo a ${route}...`)
      navigate(route)
      setIsOpen(false)
    } else if (cmd.action === 'autofill') {
      executeFormAutofill()
    } else if (cmd.action === 'close-case') {
      const caseCode = cmd.caseNumber || screenCtx?.activeEntity?.idCode
      if (caseCode) {
        closeCaseDirectly(caseCode)
      }
    } else if (cmd.action === 'copy-table') {
      handleCopyTableData()
    } else if (cmd.action === 'change-status' && cmd.status) {
      handleUpdateStatus(cmd.status as any)
    }
  }

  // Secure Backend AI Proxy Integrator
  const callBackendAI = async (queryText: string) => {
    const prompt = `
Eres "Summit AI", el copiloto inteligente oficial del sistema administrativo de seguros "Himalaya".
Tienes acceso a la siguiente información sobre el estado actual de la pantalla (contexto en vivo):
- Ruta actual: ${screenCtx?.pageRoute || '/'}
- Título de la página: ${screenCtx?.pageTitle || 'Dashboard'}
- Entidad activa (detalles del caso en pantalla): ${JSON.stringify(screenCtx?.activeEntity || 'Ninguna')}
- Cantidad de filas de la tabla visible: ${screenCtx?.visibleTableRowsCount || 0}
- Datos de la tabla visible: ${JSON.stringify(screenCtx?.visibleTableData || []).slice(0, 3000)}
- Formulario abierto: ${screenCtx?.hasOpenForm ? 'Sí' : 'No'}
- Campos del formulario abierto: ${JSON.stringify(screenCtx?.openFormFields || [])}

El sistema administrativo de seguros Himalaya permite gestionar:
1. Clientes (Clients): Individuales y corporativos. Tienen NIT/taxId, email, teléfono, dirección, etc.
2. Pólizas (Policies): Pólizas de seguros, primas comerciales (premiumAmount), sumas aseguradas.
3. Casos/Reclamos (Cases/Claims): Siniestros e incidentes de clientes.

Instrucciones de Respuesta:
- Responde en español de manera profesional, concisa y sumamente ejecutiva.
- Usa formato markdown de doble asterisco (**texto**) para resaltar información clave.
- Si el usuario te pide realizar una acción del sistema (como navegar, autocompletar, cerrar caso, copiar tabla, cambiar estado), debes incluir obligatoriamente al final de tu respuesta un bloque JSON en una línea o formateado como bloque \`\`\`json ... \`\`\` que describa la acción:
\`\`\`json
{
  "action": "navigate" | "autofill" | "close-case" | "copy-table" | "change-status",
  "route": "/policies" | "/clients" | "/cases" | "/dashboard",
  "status": "Pending" | "In Progress" | "Closed",
  "caseNumber": "CAS-XXXX-XXXX"
}
\`\`\`

Por favor procesa la siguiente solicitud del usuario:
"${queryText}"
`
    const response = await graphqlRequest<{ askSummitAI: string }>(graphqlOperationIds.askSummitAI, { prompt })
    return response.askSummitAI
  }

  // Main input text query processor (Dual: Backend AI / Fallback command matching engine)
  const processSummitQuery = async (queryText: string) => {
    if (!queryText.trim()) return
    setActiveView('ai-loading')

    // A. Real Backend AI Flow
    try {
      const aiResponseText = await callBackendAI(queryText)

      // 1. Detect and parse systemic JSON commands inside output
      const jsonMatch = aiResponseText.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        try {
          const command = JSON.parse(jsonMatch[1])
          executeAICommand(command)
        } catch (e) {
          // Ignore parse errors
        }
      }

      // 2. Clear command block from visual response
      const cleanSummary = aiResponseText.replace(/```json[\s\S]*?```/g, '').trim()

      setAiResponse({
        title: 'Summit AI Copilot',
        summary: cleanSummary,
        type: 'text'
      })
      setActiveView('ai-result')
      return
    } catch (err) {
      toast.error('Ocurrió un error al consultar AI. Usando motor local de respaldo...')
    }
    const normalized = queryText.toLowerCase().trim()

    // 1. Database Command: List System Users
    if (normalized.includes('usuario') || normalized.includes('usuarios') || normalized === 'listar usuarios') {
      try {
        const usersList = await fetchUsers()
        const queryWords = normalized
          .replace('listar', '')
          .replace('todos', '')
          .replace('los', '')
          .replace('usuarios', '')
          .replace('buscar', '')
          .trim()

        const filtered = queryWords
          ? usersList.filter(u =>
            u.firstName.toLowerCase().includes(queryWords) ||
            u.lastName.toLowerCase().includes(queryWords) ||
            u.email.toLowerCase().includes(queryWords) ||
            u.roles.some(r => r.toLowerCase().includes(queryWords))
          )
          : usersList

        setTimeout(() => {
          setAiResponse({
            title: 'Usuarios del Sistema (Local)',
            summary: queryWords
              ? `Encontré **${filtered.length}** usuarios que coinciden con **"${queryWords}"**.`
              : `Se han recuperado **${filtered.length}** usuarios registrados en el sistema.`,
            type: 'list-users',
            data: filtered
          })
          setActiveView('ai-result')
        }, 600)
        return
      } catch (err) {
        toast.error('No cuentas con permisos suficientes para listar usuarios.')
        setActiveView('commands')
        return
      }
    }

    // 2. Database Command: Server Diagnostic / System Health
    if (normalized.includes('salud') || normalized.includes('health') || normalized.includes('cpu') || normalized.includes('memoria') || normalized.includes('servidor') || normalized.includes('diagnostico')) {
      try {
        const healthData = await graphqlRequest<{ systemHealth: any }>(graphqlOperationIds.systemHealth)
        setTimeout(() => {
          setAiResponse({
            title: 'Salud y Diagnóstico del Servidor (Local)',
            summary: `Estado general: **${healthData.systemHealth.status}**. Base de datos: **${healthData.systemHealth.dbConnected ? 'CONECTADA' : 'DESCONECTADA'}**.`,
            type: 'system-health',
            data: [healthData.systemHealth]
          })
          setActiveView('ai-result')
        }, 650)
        return
      } catch (err) {
        toast.error('Error al consultar salud del sistema.')
        setActiveView('commands')
        return
      }
    }

    // 3. Database Command: List Clients
    if (normalized === 'listar clientes' || normalized === 'listar todos los clientes') {
      try {
        const clientsList = await fetchClients()
        setTimeout(() => {
          setAiResponse({
            title: 'Lista de Clientes (Local)',
            summary: `Se han recuperado **${clientsList.length}** clientes activos.`,
            type: 'list-clients',
            data: clientsList
          })
          setActiveView('ai-result')
        }, 600)
        return
      } catch (err) { }
    }

    // 4. Database Command: List Policies
    if (normalized === 'listar polizas' || normalized === 'listar todas las polizas' || normalized === 'listar pólizas') {
      try {
        const policiesList = await fetchPolicies()
        setTimeout(() => {
          setAiResponse({
            title: 'Lista de Pólizas (Local)',
            summary: `Se han recuperado **${policiesList.length}** pólizas vigentes.`,
            type: 'list-policies',
            data: policiesList
          })
          setActiveView('ai-result')
        }, 600)
        return
      } catch (err) { }
    }

    // 5. Database Command: List Cases
    if (normalized === 'listar casos' || normalized === 'listar todos los casos') {
      try {
        const casesList = await fetchCases()
        setTimeout(() => {
          setAiResponse({
            title: 'Lista de Casos y Siniestros (Local)',
            summary: `Se han recuperado **${casesList.length}** casos en el sistema.`,
            type: 'list-cases',
            data: casesList
          })
          setActiveView('ai-result')
        }, 600)
        return
      } catch (err) { }
    }

    // 6. Math Aggregation Queries
    const isSumQuery = normalized.includes('sumar') || normalized.includes('suma') || normalized.includes('total') || normalized.includes('promedio')
    if (isSumQuery && screenCtx && screenCtx.visibleTableRowsCount > 0) {
      let fieldTarget = 'premiumAmount'
      let fieldLabel = 'Prima Comercial'

      if (normalized.includes('asegura') || normalized.includes('cobertura')) {
        fieldTarget = 'insuredAmount'
        fieldLabel = 'Suma Asegurada'
      }

      const numbers = screenCtx.visibleTableData
        .map(row => row[fieldTarget])
        .filter(val => val)
        .map(val => Number(val.replace(/[^\d.]/g, '')))
        .filter(num => !isNaN(num))

      if (numbers.length > 0) {
        const sum = numbers.reduce((a, b) => a + b, 0)
        const avg = sum / numbers.length
        const min = Math.min(...numbers)
        const max = Math.max(...numbers)

        setTimeout(() => {
          setAiResponse({
            title: `Cálculo de Pantalla (Local): ${fieldLabel}`,
            summary: `He escaneado las **${numbers.length}** pólizas visibles en tu tabla y realizado los cálculos estadísticos correspondientes sobre la columna **${fieldLabel}**.`,
            type: 'calculation',
            stats: { sum, avg, min, max, count: numbers.length, field: fieldLabel }
          })
          setActiveView('ai-result')
        }, 850)
        return
      }
    }

    // 7. Fallback General Action/Response
    setTimeout(async () => {
      if (normalized.includes('autocompletar') || normalized.includes('rellenar')) {
        executeFormAutofill()
        return
      }
      if (normalized.includes('cerrar caso')) {
        const words = normalized.toUpperCase().split(/\s+/)
        try {
          const casesList = await fetchCases()
          const foundCase = casesList.find(c => 
            words.some(w => w === c.caseNumber.toUpperCase())
          )
          if (foundCase) {
            closeCaseDirectly(foundCase.caseNumber)
            return
          }
        } catch (e) {
          // ignore
        }
      }

      setAiResponse({
        title: 'Asistente de Soporte Summit AI',
        summary: `Actualmente me encuentro en la pantalla **${screenCtx?.pageTitle}**. No reconozco el comando exacto para **"${queryText}"**.

Puedes intentar preguntarme:
- **"Listar todos los clientes"** o **"Listar todos los usuarios"** (Consulta a base de datos)
- **"Diagnóstico del servidor"** (Ver telemetría y salud del backend)
- **"Sumar prima"** (Cálculo matemático en pantalla)
- **"Autocompletar"** (Completa formularios abiertos)
- **"Ir a pólizas"**, **"Ir a Dashboard"**, etc.

💡 *Nota: Puedes activar la Inteligencia Artificial avanzada configurando tu API Key de Gemini en el panel de Ajustes (icono de engranaje arriba a la derecha).*`,
        type: 'text'
      })
      setActiveView('ai-result')
    }, 800)
  }

  // Form Autofilling
  const executeFormAutofill = () => {
    const form = document.querySelector('form')
    if (!form) {
      toast.error('No hay un formulario abierto.')
      setActiveView('commands')
      return
    }

    const currentYear = dayjs().year()
    const randomCode = Math.floor(1000 + Math.random() * 9000)
    const route = window.location.pathname
    const formType = route.includes('cases')
      ? 'BillingQuery'
      : route.includes('clients')
        ? 'Individual'
        : 'GeneralSupport'

    const mockData: Record<string, any> = {
      policyNumber: `POL-${currentYear}-${randomCode}`,
      insuredAmount: '150000',
      premiumAmount: '3500',
      currency: 'GTQ',
      notes: 'Autocompletado de pruebas por Summit AI.',
      startDate: dayjs().toISOString().split('T')[0],
      endDate: dayjs().add(1, 'year').toISOString().split('T')[0],
      title: `Caso de soporte técnico #${randomCode}`,
      description: 'Problema crítico reportado por el cliente con su póliza de seguro de gastos médicos. Se requiere revisión urgente.',
      status: 'Pending',
      priority: 'High',
      type: formType,
      displayName: `Cliente Demo ${randomCode}`,
      email: `demo.client.${randomCode}@himalaya.com`,
      phone: '50244332211',
      taxId: `CF-${randomCode}`,
      address: '7ma Avenida 12-30, Zona 9',
      city: 'Guatemala',
      department: 'Guatemala',
      name: `Proveedor Clínico ${randomCode}`,
      contactName: `Dr. Carlos Martínez ${randomCode}`,
      contactEmail: `carlos.martinez.${randomCode}@proveedor.com`,
      contactPhone: '50277889900',
    }

    let fieldsCount = 0
    Object.keys(mockData).forEach((key) => {
      const inputs = document.querySelectorAll(`[name="${key}"], [id="${key}"]`)
      inputs.forEach((inputEl) => {
        const input = inputEl as HTMLInputElement
        if (input.type === 'hidden') return
        input.value = mockData[key]
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
        input.dispatchEvent(new Event('blur', { bubbles: true }))
        fieldsCount++
      })
    })

    if (fieldsCount > 0) {
      toast.success('Formulario autocompletado')
      setIsOpen(false)
    } else {
      toast.error('No se pudo mapear campos del formulario.')
      setActiveView('commands')
    }
  }

  // Dynamic system actions
  const closeCaseDirectly = async (caseNumber: string) => {
    try {
      const casesList = await fetchCases()
      const found = casesList.find(c => c.caseNumber.toUpperCase() === caseNumber.toUpperCase())

      if (!found) {
        toast.error(`No se encontró el caso ${caseNumber}`)
        setActiveView('commands')
        return
      }

      await addCommentApi(found.uuid, 'Caso cerrado mediante el Asistente Summit AI.', false)
      await updateCase({ uuid: found.uuid, status: 'Closed' })
      toast.success(`Caso ${caseNumber} cerrado exitosamente.`)
      setIsOpen(false)
    } catch (err) {
      toast.error('Error de permisos al cerrar el caso.')
      setActiveView('commands')
    }
  }

  // Master Commands Definition
  const baseCommands = useMemo<CommandItem[]>(() => [
    {
      id: 'nav-dashboard',
      title: 'Ir al Dashboard',
      subtitle: 'Volver al panel principal de estadísticas',
      category: 'Navegación',
      keywords: ['dashboard', 'inicio', 'panel', 'principal', 'ver panel'],
      icon: <Bot size={18} />,
      onExecute: () => { navigate('/dashboard'); setIsOpen(false) }
    },
    {
      id: 'nav-policies',
      title: 'Ir a Pólizas',
      subtitle: 'Ver pólizas, vigencias y contratos',
      category: 'Navegación',
      keywords: ['polizas', 'pólizas', 'contratos', 'vigencia', 'seguros'],
      icon: <FileText size={18} />,
      onExecute: () => { navigate('/policies'); setIsOpen(false) }
    },
    {
      id: 'nav-clients',
      title: 'Ir a Clientes',
      subtitle: 'Administrar clientes y contactos',
      category: 'Navegación',
      keywords: ['clientes', 'contactos', 'personas', 'asegurados'],
      icon: <Search size={18} />,
      onExecute: () => { navigate('/clients'); setIsOpen(false) }
    },
    {
      id: 'nav-cases',
      title: 'Ir a Casos / Reclamos',
      subtitle: 'Gestión de siniestros, soporte e incidentes',
      category: 'Navegación',
      keywords: ['casos', 'reclamos', 'siniestros', 'soporte', 'tickets'],
      icon: <CornerDownLeft size={18} />,
      onExecute: () => { navigate('/cases'); setIsOpen(false) }
    },
    {
      id: 'query-users',
      title: '👥 Listar Usuarios del Sistema',
      subtitle: 'Consultar todos los usuarios y sus roles',
      category: 'Acción',
      keywords: ['usuarios', 'usuarios del sistema', 'listar usuarios', 'security', 'roles'],
      icon: <Search size={18} />,
      onExecute: () => {
        processSummitQuery('listar usuarios')
      }
    },
    {
      id: 'query-health',
      title: '🖥️ Diagnóstico y Salud del Servidor',
      subtitle: 'Consultar telemetría de CPU, base de datos y memoria',
      category: 'Acción',
      keywords: ['salud', 'cpu', 'memoria', 'sistema', 'servidor', 'health', 'diagnostico'],
      icon: <Database size={18} />,
      onExecute: () => {
        processSummitQuery('ver salud del sistema')
      }
    },
    {
      id: 'action-new-policy',
      title: 'Crear Nueva Póliza',
      subtitle: 'Abrir formulario de creación de póliza',
      category: 'Acción',
      keywords: ['crear poliza', 'nueva poliza', 'formulario poliza'],
      icon: <PlusIcon />,
      onExecute: () => {
        navigate('/policies')
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sherpa-action', { detail: { type: 'create-policy' } }))
        }, 500)
        setIsOpen(false)
      }
    },
    {
      id: 'action-new-client',
      title: 'Crear Nuevo Cliente',
      subtitle: 'Abrir formulario de creación de cliente',
      category: 'Acción',
      keywords: ['crear cliente', 'nuevo cliente', 'formulario cliente'],
      icon: <PlusIcon />,
      onExecute: () => {
        navigate('/clients')
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sherpa-action', { detail: { type: 'create-client' } }))
        }, 500)
        setIsOpen(false)
      }
    },
    {
      id: 'action-new-case',
      title: 'Crear Nuevo Caso',
      subtitle: 'Abrir formulario de creación de caso',
      category: 'Acción',
      keywords: ['crear caso', 'nuevo caso', 'formulario caso'],
      icon: <PlusIcon />,
      onExecute: () => {
        navigate('/cases')
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sherpa-action', { detail: { type: 'create-case' } }))
        }, 500)
        setIsOpen(false)
      }
    },
    {
      id: 'autofill-form',
      title: '⚡ Autocompletar Formulario',
      subtitle: 'Rellenar el formulario activo con datos de prueba realistas',
      category: 'Datos en Pantalla',
      keywords: ['autocompletar', 'rellenar', 'llenar', 'campos', 'formulario'],
      icon: <Bot size={18} />,
      onExecute: () => executeFormAutofill()
    },
    {
      id: 'calc-premiums',
      title: '📊 Calcular Suma de Primas Visibles',
      subtitle: 'Sumar todas las primas mostradas en la tabla actual',
      category: 'Datos en Pantalla',
      keywords: ['calcular', 'suma', 'total', 'primas', 'montos', 'dinero'],
      icon: <Eye size={18} />,
      onExecute: () => {
        processSummitQuery('sumar prima')
      }
    }
  ], [navigate])

  // Process input and calculate matching scores
  const filteredCommands = useMemo(() => {
    const normalizedInput = inputText.toLowerCase().trim()
    const finalCommands = [...baseCommands]

    // Active Case Context features
    if (screenCtx?.activeEntity?.type === 'case' && screenCtx.activeEntity.idCode) {
      const code = screenCtx.activeEntity.idCode

      // Close active case
      finalCommands.push({
        id: 'action-close-case-screen',
        title: `🔒 Cerrar Caso Activo: ${code}`,
        subtitle: `Cerrar definitivamente el caso de ${screenCtx.activeEntity.clientName || 'Cliente'}`,
        category: 'Acción',
        keywords: ['cerrar caso', 'finalizar caso', 'resolver', code.toLowerCase()],
        icon: <CornerDownLeft size={18} />,
        onExecute: () => closeCaseDirectly(code)
      })

      // Add comment to active case
      finalCommands.push({
        id: 'action-comment-case-screen',
        title: `💬 Comentar Caso Activo: ${code}`,
        subtitle: 'Agregar una anotación en la bitácora del caso',
        category: 'Acción',
        keywords: ['comentar', 'escribir', 'nota', 'bitacora', code.toLowerCase()],
        icon: <MessageSquare size={18} />,
        onExecute: () => {
          setCommentText('')
          setActiveView('add-comment')
        }
      })

      // Change case status directly
      finalCommands.push({
        id: 'action-status-case-screen',
        title: `⚙️ Cambiar Estado: ${code}`,
        subtitle: 'Cambiar estado a Pendiente, En Proceso o Cerrado',
        category: 'Acción',
        keywords: ['estado', 'cambiar estado', 'pendiente', 'proceso', code.toLowerCase()],
        icon: <Check size={18} />,
        onExecute: () => {
          setActiveView('change-status')
        }
      })
    }

    // Active screen visible table copying
    if (screenCtx && screenCtx.visibleTableRowsCount > 0) {
      finalCommands.push({
        id: 'action-copy-table-clipboard',
        title: '📋 Copiar Tabla a Portapapeles',
        subtitle: `Copiar las ${screenCtx.visibleTableRowsCount} filas en formato Markdown`,
        category: 'Datos en Pantalla',
        keywords: ['copiar tabla', 'portapapeles', 'descargar tabla', 'guardar'],
        icon: <Copy size={18} />,
        onExecute: () => handleCopyTableData()
      })
    }

    if (!normalizedInput) {
      return finalCommands
    }

    return finalCommands
      .map(cmd => {
        let score = 0
        if (cmd.title.toLowerCase().includes(normalizedInput)) score += 50
        if (cmd.subtitle.toLowerCase().includes(normalizedInput)) score += 20

        cmd.keywords.forEach(kw => {
          if (normalizedInput.includes(kw)) score += 30
          if (kw.includes(normalizedInput)) score += 10
        })

        return { cmd, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.cmd)
  }, [inputText, baseCommands, screenCtx])

  // Key handlers for navigation within the command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeView === 'commands') {
        if (inputText.trim().length > 0) {
          processSummitQuery(inputText)
        } else if (filteredCommands[activeIndex]) {
          filteredCommands[activeIndex].onExecute(screenCtx)
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  const pulseWave = {
    '@keyframes pulse-wave': {
      '0%': { transform: 'scaleY(0.35)', opacity: 0.5 },
      '50%': { transform: 'scaleY(1.3)', opacity: 1 },
      '100%': { transform: 'scaleY(0.35)', opacity: 0.5 }
    }
  }

  return (
    <>
      {/* Floating launcher tab at Bottom-Left (To avoid colliding with Dashboard catalog FAB on the bottom-right) */}
      <Box sx={{ position: 'fixed', bottom: 24, left: 24, zIndex: 1200 }}>
        <Tooltip title="Summit AI Copilot (Ctrl + K)" placement="right">
          <IconButton
            onClick={() => setIsOpen(true)}
            sx={{
              width: 56,
              height: 56,
              background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                background: 'linear-gradient(135deg, #0369a1 0%, #4338ca 100%)',
                boxShadow: '0 12px 28px rgba(79, 70, 229, 0.45)',
                transform: 'scale(1.08)',
              },
            }}
          >
            <Bot size={24} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Slide-over Right Sidebar Panel (Drawer layout) */}
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 200,
            sx: { backgroundColor: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(5px)' }
          }
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: '430px' },
            background: (theme: any) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(30px)',
            borderLeft: '1px solid',
            borderColor: (theme: any) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            outline: 'none',
            fontFamily: '"Plus Jakarta Sans", "Outfit", sans-serif'
          }
        }}
      >
        {/* Drawer Header */}
        <Box
          sx={{
            p: 2.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: (theme: any) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', color: 'white', width: 32, height: 32 }}>
              <Bot size={18} />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.1 }}>Summit AI</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>Asistente del Sistema</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => setIsOpen(false)} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <X size={16} />
            </IconButton>
          </Stack>
        </Box>

        {/* Search Input Box */}
        <Box
          onKeyDown={handleKeyDown}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: '1px solid',
            borderColor: (theme: any) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'
          }}
        >
          <Search size={18} style={{ opacity: 0.6 }} />
          <InputBase
            inputRef={searchInputRef}
            placeholder="Escribe en lenguaje natural a Summit AI..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value)
              setActiveIndex(0)
              if (activeView === 'ai-result' || activeView === 'add-comment' || activeView === 'change-status') setActiveView('commands')
            }}
            fullWidth
            sx={{ fontSize: '0.95rem', fontWeight: 500 }}
          />

          <Button
            variant="contained"
            size="small"
            onClick={() => processSummitQuery(inputText)}
            sx={{
              textTransform: 'none',
              borderRadius: 4,
              minWidth: 'fit-content',
              px: 2,
              py: 0.75,
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              gap: 1
            }}
          >
            <Send size={14} /> Enviar
          </Button>

          <Chip
            label="ESC"
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.6rem', height: 18, px: 0.5, opacity: 0.6, fontWeight: 700, ml: 1 }}
          />
        </Box>

        {/* Context Status Bar (Tag format, responsive wrap) */}
        {screenCtx && (
          <Box sx={{
            px: 2.5,
            py: 1.25,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            borderBottom: '1px solid',
            borderColor: (theme: any) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
            bgcolor: (theme: any) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.25)' : 'rgba(248, 250, 252, 0.6)'
          }}>
            <Chip
              icon={<Eye size={11} />}
              label={`Viendo: ${screenCtx.pageTitle}`}
              size="small"
              sx={{ fontSize: '0.65rem', fontWeight: 600 }}
            />

            {screenCtx.activeEntity && (
              <Chip
                label={`Caso: ${screenCtx.activeEntity.idCode}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.65rem', fontWeight: 700 }}
              />
            )}

            {screenCtx.hasOpenForm && (
              <Chip
                label="Formulario Activo"
                size="small"
                color="warning"
                sx={{ fontSize: '0.65rem', fontWeight: 700 }}
              />
            )}

            {screenCtx.visibleTableRowsCount > 0 && (
              <Chip
                label={`${screenCtx.visibleTableRowsCount} filas`}
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontSize: '0.65rem', fontWeight: 700 }}
              />
            )}
          </Box>
        )}

        {/* Scrollable Main Area */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>

          {/* VIEW 1: Commands List */}
          {activeView === 'commands' && (
            <>
              <Typography variant="caption" sx={{ fontWeight: 750, opacity: 0.5, letterSpacing: 1, textTransform: 'uppercase', px: 1, mb: 1, display: 'block', fontSize: '0.65rem' }}>
                Comandos Disponibles ({filteredCommands.length})
              </Typography>

              {filteredCommands.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    No hay comandos directos para esta búsqueda.
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => processSummitQuery(inputText)}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Consultar Summit AI
                  </Button>
                </Box>
              ) : (
                <Stack spacing={0.5}>
                  {filteredCommands.map((cmd, idx) => {
                    const isActive = idx === activeIndex
                    return (
                      <Box
                        key={cmd.id}
                        onClick={() => cmd.onExecute(screenCtx)}
                        sx={{
                          p: 1.25,
                          px: 2,
                          borderRadius: 3,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          background: isActive
                            ? (theme: any) => theme.palette.mode === 'dark'
                              ? 'linear-gradient(90deg, rgba(2, 132, 199, 0.16) 0%, rgba(79, 70, 229, 0.2) 100%)'
                              : 'linear-gradient(90deg, rgba(2, 132, 199, 0.06) 0%, rgba(79, 70, 229, 0.08) 100%)'
                            : 'transparent',
                          borderLeft: isActive ? '4px solid #0284c7' : '4px solid transparent',
                          color: 'text.primary',
                          transition: 'all 0.15s ease',
                          border: '1px solid',
                          borderColor: isActive
                            ? (theme: any) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'
                            : 'transparent',
                          '&:hover': {
                            bgcolor: isActive ? 'transparent' : 'action.hover',
                          }
                        }}
                      >
                        <Avatar sx={{
                          bgcolor: isActive ? 'primary.main' : 'action.selected',
                          color: isActive ? 'primary.contrastText' : 'primary.main',
                          width: 28,
                          height: 28
                        }}>
                          {cmd.icon}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: isActive ? 700 : 600, fontSize: '0.8rem' }}>
                            {cmd.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.68rem' }}>
                            {cmd.subtitle}
                          </Typography>
                        </Box>

                        <Chip
                          label={cmd.category}
                          size="small"
                          sx={{
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            height: 16,
                            bgcolor: 'action.selected',
                            color: 'text.secondary'
                          }}
                        />
                      </Box>
                    )
                  })}
                </Stack>
              )}
            </>
          )}

          {/* VIEW 2: AI Loading Pulsing Soundwave */}
          {activeView === 'ai-loading' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 4 }}>
              <Stack direction="row" spacing={0.75} sx={{ justifyContent: 'center', alignItems: 'center', height: 40, mb: 2 }}>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 4,
                      height: 30,
                      borderRadius: 3,
                      background: 'linear-gradient(180deg, #0284c7 0%, #4f46e5 100%)',
                      animation: 'pulse-wave 1s infinite ease-in-out',
                      animationDelay: `${i * 0.12}s`,
                      ...pulseWave
                    }}
                  />
                ))}
              </Stack>

              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                Generando...
              </Typography>
            </Box>
          )}

          {/* VIEW 3: AI Results Panel */}
          {activeView === 'ai-result' && aiResponse && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <IconButton onClick={() => setActiveView('commands')} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <ArrowLeft size={14} />
                </IconButton>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{aiResponse.title}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.75rem', whiteSpace: 'pre-line' }}>
                    {renderMarkdownText(aiResponse.summary)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, mb: 2 }}>

                {/* Clients List */}
                {aiResponse.type === 'list-clients' && aiResponse.data && (
                  <Stack spacing={1.25}>
                    {aiResponse.data.slice(0, 8).map((client: ClientRaw) => (
                      <Paper
                        key={client.uuid}
                        variant="outlined"
                        onClick={() => {
                          navigate('/clients')
                          setIsOpen(false)
                        }}
                        sx={{
                          p: 1.5,
                          borderRadius: 3,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'action.hover'
                          }
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {client.displayName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                          NIT/DPI: {client.taxId || '—'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Email: {client.email || '—'}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                          <Chip label={client.type} size="small" sx={{ fontSize: '0.6rem', height: 16 }} />
                          <Chip label={client.status} size="small" color={client.status === 'Active' ? 'success' : 'default'} sx={{ fontSize: '0.6rem', height: 16 }} />
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}

                {/* Policies List */}
                {aiResponse.type === 'list-policies' && aiResponse.data && (
                  <Stack spacing={1.25}>
                    {aiResponse.data.slice(0, 6).map((policy: PolicyRaw) => (
                      <Paper
                        key={policy.uuid}
                        variant="outlined"
                        onClick={() => {
                          navigate('/policies')
                          setIsOpen(false)
                        }}
                        sx={{
                          p: 1.5,
                          borderRadius: 3,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'action.hover'
                          }
                        }}
                      >
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {policy.policyNumber}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                              Cliente: {policy.client?.displayName || '—'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                              Producto: {policy.product?.name || '—'}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700 }}>
                              Q{Number(policy.premiumAmount).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                            </Typography>
                            <Chip label={policy.status} size="small" color={policy.status === 'Active' ? 'success' : 'default'} sx={{ fontSize: '0.6rem', height: 16, mt: 0.5 }} />
                          </Box>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}

                {/* Cases List */}
                {aiResponse.type === 'list-cases' && aiResponse.data && (
                  <Stack spacing={1.25}>
                    {aiResponse.data.slice(0, 6).map((caseRec: CaseRaw) => (
                      <Paper
                        key={caseRec.uuid}
                        variant="outlined"
                        onClick={() => {
                          navigate('/cases')
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('sherpa-action', { detail: { type: 'open-case', uuid: caseRec.uuid } }))
                          }, 500)
                          setIsOpen(false)
                        }}
                        sx={{
                          p: 1.5,
                          borderRadius: 3,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'action.hover'
                          }
                        }}
                      >
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {caseRec.caseNumber}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
                              {caseRec.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                              Cliente: {caseRec.client?.displayName || '—'}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Chip label={caseRec.status} size="small" color={caseRec.status === 'Closed' ? 'default' : 'warning'} sx={{ fontSize: '0.6rem', height: 16, mb: 0.5 }} />
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.65rem' }}>
                              Prioridad: <strong>{caseRec.priority}</strong>
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}

                {/* Users List */}
                {aiResponse.type === 'list-users' && aiResponse.data && (
                  <Stack spacing={1.25}>
                    {aiResponse.data.slice(0, 10).map((user: UserRaw) => (
                      <Paper
                        key={user.uuid}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 3,
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'action.hover'
                          }
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                          Correo: {user.email}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                          {user.roles.map((role) => (
                            <Chip
                              key={role}
                              label={role}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontSize: '0.6rem', height: 16 }}
                            />
                          ))}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}

                {/* System Health Status Grid */}
                {aiResponse.type === 'system-health' && aiResponse.data && aiResponse.data[0] && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 3.5,
                      background: (theme: any) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : 'rgba(248, 250, 252, 0.8)',
                      borderColor: 'primary.main',
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'success.main', color: 'white', width: 32, height: 32 }}>
                        <Database size={16} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Métricas del Servidor</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                          Estado: <strong style={{ color: '#10b981' }}>{aiResponse.data[0].status}</strong>
                        </Typography>
                      </Box>
                    </Stack>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.68rem' }}>CPU Status</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {aiResponse.data[0].cpuStatus}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.68rem' }}>Conexión DB</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 750, color: aiResponse.data[0].dbConnected ? 'success.main' : 'error.main' }}>
                          {aiResponse.data[0].dbConnected ? 'Conectada' : 'Desconectada'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.68rem' }}>Uso de Memoria</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 750 }}>
                          {aiResponse.data[0].memoryUsage}%
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.68rem' }}>Uso de Disco</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 750 }}>
                          {aiResponse.data[0].diskUsage}%
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                )}

              </Box>

              {/* Result Footer buttons */}
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setActiveView('commands')}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  ← Volver
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setIsOpen(false)}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Listo
                </Button>
              </Box>
            </Box>
          )}

          {/* VIEW 4: Add Comment to Case */}
          {activeView === 'add-comment' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                💬 Agregar Comentario al Caso {screenCtx?.activeEntity?.idCode}
              </Typography>
              <TextField
                placeholder="Escribe el comentario para el historial..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                multiline
                rows={4}
                fullWidth
                size="small"
              />
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                <Button size="small" variant="outlined" onClick={() => setActiveView('commands')}>
                  Cancelar
                </Button>
                <Button size="small" variant="contained" onClick={handleSubmitComment} disabled={submittingAction}>
                  {submittingAction ? <CircularProgress size={16} /> : 'Guardar Comentario'}
                </Button>
              </Box>
            </Box>
          )}

          {/* VIEW 5: Change Case Status */}
          {activeView === 'change-status' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                ⚙️ Cambiar Estado del Caso {screenCtx?.activeEntity?.idCode}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Seleccione el nuevo estado para el siniestro / incidente:
              </Typography>

              <Stack spacing={1}>
                <Button variant="outlined" color="warning" onClick={() => handleUpdateStatus('Pending')} disabled={submittingAction} sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
                  ⏳ Cambiar a Pendiente (Pending)
                </Button>
                <Button variant="outlined" color="primary" onClick={() => handleUpdateStatus('In Progress')} disabled={submittingAction} sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
                  🔄 Cambiar a En Proceso (In Progress)
                </Button>
                <Button variant="outlined" color="success" onClick={() => handleUpdateStatus('Closed')} disabled={submittingAction} sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
                  ✅ Cambiar a Cerrado (Closed)
                </Button>
              </Stack>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button size="small" variant="outlined" onClick={() => setActiveView('commands')}>
                  Volver
                </Button>
              </Box>
            </Box>
          )}

        </Box>

        {/* Spotlight Footer controls */}
        <Box
          sx={{
            p: 1.75,
            px: 2.5,
            borderTop: '1px solid',
            borderColor: (theme: any) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
            bgcolor: (theme: any) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.25)' : 'action.hover',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Keyboard size={12} style={{ opacity: 0.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                Atajo: <code>Cmd/Ctrl + K</code>
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem', opacity: 0.7, fontWeight: 700 }}>
              🧠 Powered by Gemini AI
            </Typography>
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <ArrowUp size={11} style={{ opacity: 0.5 }} />
              <ArrowDown size={11} style={{ opacity: 0.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>Navegar</Typography>
            </Stack>

            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <CornerDownLeft size={11} style={{ opacity: 0.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>Ejecutar</Typography>
            </Stack>
          </Box>
        </Box>
      </Drawer>
    </>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
}
