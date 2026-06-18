import { useMemo } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import 'dayjs/locale/es'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { CasesMaintenancePage } from './pages/maintenance/CasesMaintenancePage'
import { ClientsMaintenancePage } from './pages/maintenance/ClientsMaintenancePage'
import { PoliciesMaintenancePage } from './pages/maintenance/PoliciesMaintenancePage'
import { ProductsMaintenancePage } from './pages/maintenance/ProductsMaintenancePage'
import { ProvidersMaintenancePage } from './pages/maintenance/ProvidersMaintenancePage'
import { TagsMaintenancePage } from './pages/maintenance/TagsMaintenancePage'
import { WidgetsMaintenancePage } from './pages/maintenance/WidgetsMaintenancePage'
import { TasksPage } from './pages/TasksPage'
import { UsersPage } from './pages/UsersPage'
import { SecurityDashboardPage } from './pages/security/SecurityDashboardPage'
import { SecurityAuditPage } from './pages/security/SecurityAuditPage'
import { SecurityMatrixPage } from './pages/security/SecurityMatrixPage'
import { RolesPage } from './pages/security/RolesPage'
import { createHimalayaTheme } from './theme/himalayaTheme'
import { useThemeModeStore } from './store/useThemeModeStore'
import { ErrorState } from './components/ErrorState'

function App() {
  const { mode, toggleMode } = useThemeModeStore()
  const theme = useMemo(() => createHimalayaTheme(mode), [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <Toaster closeButton theme={mode} position="bottom-right" richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage mode={mode} />} />
            <Route path="/select-module" element={<Navigate to="/login" replace />} />
            <Route element={<AppShell mode={mode} onToggleMode={toggleMode} />}>
              <Route path="/security" element={<SecurityDashboardPage />} />
              <Route path="/security/roles" element={<RolesPage />} />
              <Route path="/security/matrix" element={<SecurityMatrixPage />} />
              <Route path="/security/audit" element={<SecurityAuditPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/providers" element={<ProvidersMaintenancePage />} />
              <Route path="/clients" element={<ClientsMaintenancePage />} />
              <Route path="/products" element={<ProductsMaintenancePage />} />
              <Route path="/policies" element={<PoliciesMaintenancePage />} />
              <Route path="/cases" element={<CasesMaintenancePage />} />
              <Route path="/cases/:id" element={<CasesMaintenancePage />} />
              <Route path="/tags" element={<TagsMaintenancePage />} />
              <Route path="/widgets" element={<WidgetsMaintenancePage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<ErrorState type="404" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default App
