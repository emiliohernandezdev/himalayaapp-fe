import { useMemo } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
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
import { PoliciesPage } from './pages/PoliciesPage'
import { TasksPage } from './pages/TasksPage'
import { UsersPage } from './pages/UsersPage'
import { createHimalayaTheme } from './theme/himalayaTheme'
import { useThemeModeStore } from './store/useThemeModeStore'

function App() {
  const { mode, toggleMode } = useThemeModeStore()
  const theme = useMemo(() => createHimalayaTheme(mode), [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Toaster theme={mode} position="bottom-right" richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage mode={mode} />} />
            <Route element={<AppShell mode={mode} onToggleMode={toggleMode} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/maintenance/providers" element={<ProvidersMaintenancePage />} />
              <Route path="/maintenance/clients" element={<ClientsMaintenancePage />} />
              <Route path="/maintenance/products" element={<ProductsMaintenancePage />} />
              <Route path="/maintenance/policies" element={<PoliciesMaintenancePage />} />
              <Route path="/maintenance/cases" element={<CasesMaintenancePage />} />
              <Route path="/maintenance/cases/:id" element={<CasesMaintenancePage />} />
              <Route path="/maintenance/tags" element={<TagsMaintenancePage />} />
              <Route path="/maintenance/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/policies" element={<PoliciesPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default App
