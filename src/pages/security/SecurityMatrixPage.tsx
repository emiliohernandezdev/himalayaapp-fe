import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, ToggleButton, Tooltip, Typography } from '@mui/material'
import { Check, Database, Eye, FileClock, KeyRound, RotateCcw, Save, ShieldCheck, ShieldOff, UserCheck, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { fetchSecurityAccessRules, fetchSecurityCatalog, fetchSecurityRoles, upsertSecurityAccessRules, userRoleLabels } from '../../api/securityApi'
import type { SecurityAccessRule } from '../../api/securityApi'
import { useApiQuery } from '../../api/useApiQuery'
import { PageHeader } from '../../components/PageHeader'

type RuleDraft = {
  allowed: boolean
  requiresSupervisor: boolean
  ownRecordsOnly: boolean
  sensitiveDataAllowed: boolean
  auditEnabled: boolean
}

type PendingSelection = { type: 'instance' | 'role'; value: string } | null

const permissionMeta = [
  { field: 'allowed', title: 'Permitir acción', icon: Check },
  { field: 'requiresSupervisor', title: 'Requiere contraseña de supervisor', icon: KeyRound },
  { field: 'ownRecordsOnly', title: 'Solo registros propios/asignados', icon: UserCheck },
  { field: 'sensitiveDataAllowed', title: 'Permite ver datos sensibles', icon: Eye },
  { field: 'auditEnabled', title: 'Registrar auditoría', icon: FileClock },
] as const

function ruleKey(roleCode: string, nodeUuid: string, moduleUuid: string | null, actionCode: string) {
  return `${roleCode}:${nodeUuid}:${moduleUuid ?? 'node'}:${actionCode}`
}

function normalizeRule(rule: Partial<RuleDraft> | undefined, actionRequiresSupervisor: boolean): RuleDraft {
  return {
    allowed: rule?.allowed ?? true,
    requiresSupervisor: rule?.requiresSupervisor ?? actionRequiresSupervisor,
    ownRecordsOnly: rule?.ownRecordsOnly ?? false,
    sensitiveDataAllowed: rule?.sensitiveDataAllowed ?? false,
    auditEnabled: rule?.auditEnabled ?? true,
  }
}

export function SecurityMatrixPage() {
  const { data: roles, loading: rolesLoading } = useApiQuery('security-roles-matrix', fetchSecurityRoles)
  const { data: catalog, loading: catalogLoading, error: catalogError } = useApiQuery('security-catalog-matrix', fetchSecurityCatalog)
  const { data: rules, loading: rulesLoading, refetch } = useApiQuery('security-access-rules-matrix', fetchSecurityAccessRules)
  const [instanceUuid, setInstanceUuid] = useState('')
  const [roleCode, setRoleCode] = useState('')
  const [draftRules, setDraftRules] = useState<Record<string, RuleDraft>>({})
  const [saving, setSaving] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<PendingSelection>(null)

  const instances = catalog?.securityModuleInstances ?? []
  const activeInstance = instances.find((instance) => instance.uuid === instanceUuid) ?? instances[0]
  const activeRoleCode = roleCode || roles?.[0]?.code || ''
  const loading = rolesLoading || catalogLoading || rulesLoading
  const dirtyCount = Object.keys(draftRules).length
  const hasChanges = dirtyCount > 0

  const ruleMap = useMemo(() => {
    const next = new Map<string, SecurityAccessRule>()
    for (const rule of rules ?? []) {
      if (rule.subjectType === 'Role' && rule.roleCode) {
        next.set(ruleKey(rule.roleCode, rule.nodeUuid, rule.moduleUuid ?? null, rule.actionCode), rule)
      }
    }
    return next
  }, [rules])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasChanges) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  const requestSelectionChange = (nextSelection: PendingSelection) => {
    if (hasChanges) {
      setPendingSelection(nextSelection)
      return
    }
    applySelectionChange(nextSelection)
  }

  const applySelectionChange = (nextSelection: PendingSelection) => {
    if (!nextSelection) return
    if (nextSelection.type === 'instance') setInstanceUuid(nextSelection.value)
    if (nextSelection.type === 'role') setRoleCode(nextSelection.value)
  }

  const discardChanges = () => {
    setDraftRules({})
    applySelectionChange(pendingSelection)
    setPendingSelection(null)
  }

  const currentRule = (actionCode: string, actionRequiresSupervisor: boolean) => {
    if (!activeInstance) return normalizeRule(undefined, actionRequiresSupervisor)
    const key = ruleKey(activeRoleCode, activeInstance.nodeUuid, activeInstance.moduleUuid, actionCode)
    return draftRules[key] ?? normalizeRule(ruleMap.get(key), actionRequiresSupervisor)
  }

  const togglePermission = (actionCode: string, actionRequiresSupervisor: boolean, field: keyof RuleDraft) => {
    if (!activeInstance || !activeRoleCode) return
    const key = ruleKey(activeRoleCode, activeInstance.nodeUuid, activeInstance.moduleUuid, actionCode)
    const current = currentRule(actionCode, actionRequiresSupervisor)
    setDraftRules((currentDrafts) => ({
      ...currentDrafts,
      [key]: {
        ...current,
        [field]: !current[field],
      },
    }))
  }

  const resetDrafts = () => setDraftRules({})

  const saveChanges = async () => {
    if (!activeInstance || !activeRoleCode || !hasChanges) return
    setSaving(true)
    try {
      const inputs = Object.entries(draftRules).map(([key, draft]) => {
        const actionCode = key.split(':').at(-1) ?? ''
        return {
          subjectType: 'Role',
          roleCode: activeRoleCode,
          userUuid: null,
          nodeUuid: activeInstance.nodeUuid,
          moduleUuid: activeInstance.moduleUuid,
          maintenanceSlug: null,
          actionCode,
          ...draft,
        }
      })
      await upsertSecurityAccessRules(inputs)
      toast.success(`${inputs.length} permiso${inputs.length === 1 ? '' : 's'} actualizado${inputs.length === 1 ? '' : 's'}`)
      setDraftRules({})
      refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron guardar los permisos')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={4} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Matriz de seguridad" description="Permisos por instancia, rol y acción del sistema." actionLabel="" icon={KeyRound} />

      {catalogError && <Alert severity="error">No se pudo cargar el catálogo de seguridad.</Alert>}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <FormControl fullWidth>
          <InputLabel>Nodo / módulo</InputLabel>
          <Select label="Nodo / módulo" value={activeInstance?.uuid ?? ''} onChange={(event) => requestSelectionChange({ type: 'instance', value: event.target.value })}>
            {instances.map((instance) => (
              <MenuItem key={instance.uuid} value={instance.uuid}>
                {instance.node.nickname || instance.node.title} / {instance.module.nickname || instance.module.title} - {instance.nickname}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Rol</InputLabel>
          <Select label="Rol" value={activeRoleCode} onChange={(event) => requestSelectionChange({ type: 'role', value: event.target.value })}>
            {(roles ?? []).map((role) => (
              <MenuItem key={role.code} value={role.code}>{role.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {activeInstance && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Chip icon={<UsersRound size={15} />} label={activeInstance.node.nickname || activeInstance.node.title} />
          <Chip icon={<ShieldCheck size={15} />} label={activeInstance.module.nickname || activeInstance.module.title} />
          <Chip icon={<UsersRound size={15} />} label={`Rol: ${userRoleLabels[activeRoleCode] ?? activeRoleCode}`} />
          {hasChanges && <Chip color="warning" icon={<Database size={15} />} label={`${dirtyCount} cambio${dirtyCount === 1 ? '' : 's'} pendiente${dirtyCount === 1 ? '' : 's'}`} />}
        </Stack>
      )}

      {hasChanges && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: 2, border: '1px solid', borderColor: 'warning.main', borderRadius: 2, bgcolor: 'background.paper', alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800 }}>Hay cambios sin guardar.</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RotateCcw size={17} />} onClick={resetDrafts} disabled={saving}>
              Descartar
            </Button>
            <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={17} />} onClick={saveChanges} disabled={saving}>
              Guardar cambios
            </Button>
          </Stack>
        </Stack>
      )}

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <Stack direction="row" sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'flex' } }}>
          <Typography sx={{ flex: 1, fontWeight: 800 }}>Accion</Typography>
          <Typography sx={{ width: 330, fontWeight: 800, textAlign: 'center' }}>Permisos</Typography>
        </Stack>

        {loading ? (
          <Stack sx={{ p: 5, alignItems: 'center' }}>
            <CircularProgress size={26} />
          </Stack>
        ) : (
          <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
            {(catalog?.securityActions ?? []).map((action) => {
              const key = activeInstance ? ruleKey(activeRoleCode, activeInstance.nodeUuid, activeInstance.moduleUuid, action.code) : ''
              const rule = ruleMap.get(key)
              const draft = draftRules[key]
              const values = currentRule(action.code, action.requiresSupervisor)

              return (
                <Stack key={action.code} direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1.5, md: 0 }} sx={{ px: 2, py: 1.5, alignItems: { md: 'center' }, bgcolor: draft ? 'action.hover' : undefined }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 800 }}>{action.name}</Typography>
                      <Chip size="small" label={action.code} />
                      {rule && <Chip size="small" color="primary" variant="outlined" label="Configurado" />}
                      {draft && <Chip size="small" color="warning" variant="outlined" label="Pendiente" />}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">{action.description}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ width: { md: 330 }, justifyContent: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', rowGap: 1 }}>
                    {permissionMeta.map((permission) => {
                      const Icon = permission.icon
                      const selected = values[permission.field]
                      return (
                        <Tooltip key={permission.field} title={permission.title}>
                          <ToggleButton
                            value={permission.field}
                            selected={selected}
                            disabled={!activeInstance || !activeRoleCode || saving}
                            onClick={() => togglePermission(action.code, action.requiresSupervisor, permission.field)}
                            sx={{ width: 48, height: 40, borderRadius: 2 }}
                          >
                            {permission.field === 'allowed' && !selected ? <ShieldOff size={18} /> : <Icon size={18} />}
                          </ToggleButton>
                        </Tooltip>
                      )
                    })}
                  </Stack>
                </Stack>
              )
            })}
          </Stack>
        )}
      </Box>

      <Dialog open={Boolean(pendingSelection)} onClose={() => setPendingSelection(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Descartar cambios</DialogTitle>
        <DialogContent dividers>
          <Typography color="text.secondary">
            Tienes cambios pendientes en la matriz. Si continúas, se perderán los cambios no guardados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingSelection(null)}>Cancelar</Button>
          <Button color="warning" variant="contained" onClick={discardChanges}>
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
