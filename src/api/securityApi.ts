import { graphqlRequest } from './graphqlClient'
import { graphqlOperationIds } from './graphqlOperationIds'

export const userRoles = ['owner', 'administrator', 'manager', 'agent', 'assistant', 'auditor'] as const
export const userStatuses = ['active', 'suspended', 'invited'] as const

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
  securityNodes: { uuid: string; slug: string; title: string; description: string }[]
  securityModules: { uuid: string; slug: string; title: string; description: string; route: string; icon: string }[]
  securityActions: { uuid: string; code: string; name: string; description: string; requiresSupervisor: boolean; sortOrder: number }[]
}

export type SecurityAccessRule = {
  uuid: string
  subjectType: 'user' | 'role'
  userUuid?: string | null
  roleCode?: string | null
  nodeUuid: string
  moduleUuid?: string | null
  maintenanceSlug?: string | null
  actionCode: string
  allowed: boolean
  requiresSupervisor: boolean
  user?: { uuid: string; firstName: string; lastName: string; email: string; roles: string[] } | null
  node: { uuid: string; slug: string; title: string }
  module?: { uuid: string; slug: string; title: string } | null
  action: { code: string; name: string }
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

export function updateSecurityRole(input: Record<string, unknown>) {
  return graphqlRequest<{ updateSecurityRole: SecurityRole }>(graphqlOperationIds.updateSecurityRole, { input }).then((data) => data.updateSecurityRole)
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

export function removeSecurityAccessRule(uuid: string) {
  return graphqlRequest<{ removeSecurityAccessRule: boolean }>(graphqlOperationIds.removeSecurityAccessRule, { uuid }).then((data) => data.removeSecurityAccessRule)
}
