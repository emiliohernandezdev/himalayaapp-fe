import { graphqlRequest } from './graphqlClient'
import { graphqlOperationIds } from './graphqlOperationIds'

export const userRoles = ['Administrator', 'Agent', 'Assistant', 'Auditor', 'Billing', 'Manager', 'Owner', 'Supervisor'] as const
export const userStatuses = ['active', 'suspended', 'invited'] as const
export const userRoleLabels: Record<string, string> = {
  Administrator: 'Administrador',
  Agent: 'Agente',
  Assistant: 'Asistente',
  Auditor: 'Auditor',
  Billing: 'Facturación',
  Manager: 'Gerente',
  Owner: 'Propietario',
  Supervisor: 'Supervisor',
  // Support lowercase fallback
  administrator: 'Administrador',
  agent: 'Agente',
  assistant: 'Asistente',
  auditor: 'Auditor',
  billing: 'Facturación',
  manager: 'Gerente',
  owner: 'Propietario',
  supervisor: 'Supervisor',
}

export type SecurityUser = {
  uuid: string
  email: string
  firstName: string
  lastName: string
  status: string
  roles: string[]
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
}

export type SecurityRole = {
  uuid: string
  code: string
  name: string
  description: string
  hierarchy: number
  elevated: boolean
  enabled: boolean
}

export type SecurityCatalog = {
  securityNodes: { uuid: string; slug: string; title: string; nickname: string; description: string }[]
  securityModules: { uuid: string; slug: string; title: string; nickname: string; description: string; route: string; icon: string }[]
  securityModuleInstances: {
    uuid: string
    slug: string
    nickname: string
    nodeUuid: string
    moduleUuid: string
    node: { uuid: string; slug: string; title: string; nickname: string }
    module: { uuid: string; slug: string; title: string; nickname: string; route: string; icon: string }
  }[]
  securityActions: { uuid: string; code: string; name: string; description: string; requiresSupervisor: boolean; sortOrder: number }[]
}

export type SecurityAccessRule = {
  uuid: string
  subjectType: 'User' | 'Role'
  userUuid?: string | null
  roleCode?: string | null
  nodeUuid: string
  moduleUuid?: string | null
  maintenanceSlug?: string | null
  actionCode: string
  allowed: boolean
  requiresSupervisor: boolean
  ownRecordsOnly: boolean
  sensitiveDataAllowed: boolean
  auditEnabled: boolean
  user?: { uuid: string; firstName: string; lastName: string; email: string; roles: string[] } | null
  node: { uuid: string; slug: string; title: string }
  module?: { uuid: string; slug: string; title: string } | null
  action: { code: string; name: string }
}

export type SecurityAuditLog = {
  uuid: string
  action: string
  entityName: string
  entityUuid?: string | null
  before?: string | null
  after?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
  actor?: { uuid: string; firstName: string; lastName: string; email: string; roles: string[] } | null
}

export function fetchSecurityUsers() {
  return graphqlRequest<{ securityUsers: SecurityUser[] }>(graphqlOperationIds.securityUsers).then((data) => data.securityUsers)
}

export function createSecurityUser(input: Record<string, unknown>) {
  return graphqlRequest<{ createSecurityUser: SecurityUser }>(graphqlOperationIds.createSecurityUser, { input }).then((data) => data.createSecurityUser)
}

export function updateSecurityUser(input: Record<string, unknown>) {
  return graphqlRequest<{ updateSecurityUser: SecurityUser }>(graphqlOperationIds.updateSecurityUser, { input }).then((data) => data.updateSecurityUser)
}

export function removeSecurityUser(uuid: string) {
  return graphqlRequest<{ removeSecurityUser: boolean }>(graphqlOperationIds.removeSecurityUser, { uuid }).then((data) => data.removeSecurityUser)
}

export function fetchSecurityRoles() {
  return graphqlRequest<{ securityRoles: SecurityRole[] }>(graphqlOperationIds.securityRoles).then((data) => data.securityRoles)
}

export function createSecurityRole(input: Record<string, unknown>) {
  return graphqlRequest<{ createSecurityRole: SecurityRole }>(graphqlOperationIds.createSecurityRole, { input }).then((data) => data.createSecurityRole)
}

export function updateSecurityRole(input: Record<string, unknown>) {
  return graphqlRequest<{ updateSecurityRole: SecurityRole }>(graphqlOperationIds.updateSecurityRole, { input }).then((data) => data.updateSecurityRole)
}

export function removeSecurityRole(uuid: string) {
  return graphqlRequest<{ removeSecurityRole: boolean }>(graphqlOperationIds.removeSecurityRole, { uuid }).then((data) => data.removeSecurityRole)
}

export function fetchSecurityCatalog() {
  return graphqlRequest<SecurityCatalog>(graphqlOperationIds.securityCatalog)
}

export function fetchSecurityAccessRules() {
  return graphqlRequest<{ securityAccessRules: SecurityAccessRule[] }>(graphqlOperationIds.securityAccessRules).then((data) => data.securityAccessRules)
}

export function upsertSecurityAccessRule(input: Record<string, unknown>) {
  return graphqlRequest<{ upsertSecurityAccessRule: SecurityAccessRule }>(graphqlOperationIds.upsertSecurityAccessRule, { input }).then((data) => data.upsertSecurityAccessRule)
}

export function upsertSecurityAccessRules(inputs: Array<Record<string, unknown>>) {
  return graphqlRequest<{ upsertSecurityAccessRules: SecurityAccessRule[] }>(graphqlOperationIds.upsertSecurityAccessRules, { inputs }).then((data) => data.upsertSecurityAccessRules)
}

export function removeSecurityAccessRule(uuid: string) {
  return graphqlRequest<{ removeSecurityAccessRule: boolean }>(graphqlOperationIds.removeSecurityAccessRule, { uuid }).then((data) => data.removeSecurityAccessRule)
}

export function fetchSecurityAuditLogs() {
  return graphqlRequest<{ securityAuditLogs: SecurityAuditLog[] }>(graphqlOperationIds.securityAuditLogs).then((data) => data.securityAuditLogs)
}

export function fetchMySecurityAccessRules() {
  return graphqlRequest<{ mySecurityAccessRules: SecurityAccessRule[] }>(graphqlOperationIds.mySecurityAccessRules).then((data) => data.mySecurityAccessRules)
}
