import { graphqlRequest } from './graphqlClient'
import { graphqlOperationIds } from './graphqlOperationIds'
import type { NodeAccess } from '../store/useAuthStore'

export type MaintenanceModuleDto = {
  uuid: string
  slug: string
  title: string
  description: string
  route: string
  icon: string
  tone: string
  sortOrder: number
}

export type MaintenanceRecord = {
  uuid: string
  title: string
  detail: string
  status: string
  eyebrow?: string
}

type MaintenanceModulesResponse = {
  maintenanceModules: MaintenanceModuleDto[]
}

export function fetchMaintenanceModules() {
  return graphqlRequest<MaintenanceModulesResponse>(graphqlOperationIds.maintenanceModules).then((data) => data.maintenanceModules)
}

// ─── Providers ──────────────────────────────────────────

export type ProviderRaw = {
  uuid: string
  name: string
  type: string
  status: string
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  logo?: string | null
  address?: string | null
  taxId?: string | null
}

export function fetchProviders() {
  return graphqlRequest<{ providers: ProviderRaw[] }>(graphqlOperationIds.providers).then((data) => data.providers)
}

export function createProvider(input: Record<string, unknown>) {
  return graphqlRequest<{ createProvider: { uuid: string } }>(
    graphqlOperationIds.createProvider,
    { input }
  )
}

export function updateProvider(input: Record<string, unknown>) {
  return graphqlRequest<{ updateProvider: { uuid: string } }>(
    graphqlOperationIds.updateProvider,
    { input }
  )
}

export function removeProvider(uuid: string) {
  return graphqlRequest<{ removeProvider: boolean }>(
    graphqlOperationIds.removeProvider,
    { uuid }
  )
}

// ─── Products ───────────────────────────────────────────

export type ProductRaw = {
  uuid: string
  name: string
  category: string
  status: string
  lineOfBusiness?: string | null
  description?: string | null
  providerUuid: string
  provider?: { uuid: string; name: string } | null
}

export function fetchProducts() {
  return graphqlRequest<{ products: ProductRaw[] }>(graphqlOperationIds.products).then((data) => data.products)
}

export function createProduct(input: Record<string, unknown>) {
  const { providerUuid, ...rest } = input
  return graphqlRequest<{ createProduct: { uuid: string } }>(
    graphqlOperationIds.createProduct,
    { input: { ...rest, providerId: providerUuid } }
  )
}

export function updateProduct(input: Record<string, unknown>) {
  const { providerUuid, ...rest } = input
  return graphqlRequest<{ updateProduct: { uuid: string } }>(
    graphqlOperationIds.updateProduct,
    { input: { ...rest, providerId: providerUuid } }
  )
}

export function removeProduct(uuid: string) {
  return graphqlRequest<{ removeProduct: boolean }>(
    graphqlOperationIds.removeProduct,
    { uuid }
  )
}

// ─── Clients ────────────────────────────────────────────

export type ClientRaw = {
  uuid: string
  displayName: string
  type: string
  status: string
  taxId?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  department?: string | null
}

export function fetchClients() {
  return graphqlRequest<{ clients: ClientRaw[] }>(graphqlOperationIds.clients).then((data) => data.clients)
}

export function createClient(input: Record<string, unknown>) {
  return graphqlRequest<{ createClient: { uuid: string } }>(
    graphqlOperationIds.createClient,
    { input }
  )
}

export function updateClient(input: Record<string, unknown>) {
  return graphqlRequest<{ updateClient: { uuid: string } }>(
    graphqlOperationIds.updateClient,
    { input }
  )
}

export function removeClient(uuid: string) {
  return graphqlRequest<{ removeClient: boolean }>(
    graphqlOperationIds.removeClient,
    { uuid }
  )
}

// ─── Policies ───────────────────────────────────────────

export type PolicyRaw = {
  uuid: string
  policyNumber: string
  status: string
  startDate: string
  endDate: string
  premiumAmount?: number | null
  insuredAmount?: number | null
  currency: string
  notes?: string | null
  clientUuid: string
  providerUuid: string
  productUuid: string
  client: { uuid: string; displayName: string }
  provider: { uuid: string; name: string }
  product: { uuid: string; name: string }
}

export function fetchPolicies() {
  return graphqlRequest<{ policies: PolicyRaw[] }>(graphqlOperationIds.policies).then((data) => data.policies)
}

// ─── Cases ──────────────────────────────────────────────

export type CaseRaw = {
  uuid: string
  caseNumber: string
  title: string
  status: string
  priority: string
  type: string
  description?: string | null
  clientUuid: string
  client: { uuid: string; displayName: string }
  policyUuid?: string | null
  policy?: { uuid: string; policyNumber: string } | null
  assignedUserUuid?: string | null
  assignedUser?: { uuid: string; firstName: string; lastName: string; email: string } | null
  tags?: { uuid: string; name: string; color: string }[]
}

export function fetchCases() {
  return graphqlRequest<{ cases: CaseRaw[] }>(graphqlOperationIds.cases).then((data) => data.cases)
}

// ─── Tags ───────────────────────────────────────────────

export type TagRaw = {
  uuid: string
  name: string
  color: string
  description?: string | null
}

export function fetchTags() {
  return graphqlRequest<{ tags: TagRaw[] }>(graphqlOperationIds.tags).then((data) => data.tags)
}

export function createTag(input: Record<string, unknown>) {
  return graphqlRequest<{ createTag: { uuid: string } }>(
    graphqlOperationIds.createTag,
    { input }
  )
}

export function updateTag(input: Record<string, unknown>) {
  return graphqlRequest<{ updateTag: { uuid: string } }>(
    graphqlOperationIds.updateTag,
    { input }
  )
}

export function removeTag(uuid: string) {
  return graphqlRequest<{ removeTag: boolean }>(
    graphqlOperationIds.removeTag,
    { uuid }
  )
}

// ─── Case Detail ─────────────────────────────────────────

export type CaseDetail = {
  uuid: string
  caseNumber: string
  title: string
  description?: string | null
  type: string
  status: string
  priority: string
  dueAt?: string | null
  closedAt?: string | null
  createdAt: string
  updatedAt: string
  clientUuid: string
  client: { uuid: string; displayName: string; email?: string | null; phone?: string | null }
  policy?: { uuid: string; policyNumber: string } | null
  assignedUser?: { uuid: string; firstName: string; lastName: string; email: string } | null
  tags: { uuid: string; name: string; color: string }[]
  comments: {
    uuid: string
    body: string
    internalOnly: boolean
    createdAt: string
    author: { uuid: string; firstName: string; lastName: string; email: string }
  }[]
  auditLogs: {
    uuid: string
    action: string
    entityName: string
    before?: string | null
    after?: string | null
    createdAt: string
    actor?: { uuid: string; firstName: string; lastName: string } | null
  }[]
}

export function fetchCaseDetail(uuid: string): Promise<CaseDetail> {
  return graphqlRequest<{ case: CaseDetail }>(
    graphqlOperationIds.caseDetail,
    { uuid }
  ).then((data) => data.case)
}

// ─── Authentication ─────────────────────────────────────

export function loginApi(email: string, password: string, instanceUuid?: string) {
  return graphqlRequest<{ login: { accessToken: string | null; user: any; accessNodes: NodeAccess[]; requiresModuleSelection: boolean } }>(
    graphqlOperationIds.login,
    { email, password, instanceUuid }
  ).then((data) => data.login)
}

export function verifySupervisorAuthorizationApi(email: string, password: string) {
  return graphqlRequest<{ verifySupervisorAuthorization: { authorized: boolean; supervisor: any } }>(
    graphqlOperationIds.verifySupervisorAuthorization,
    { email, password }
  ).then((data) => data.verifySupervisorAuthorization)
}

// ─── Policies CRUD ──────────────────────────────────────

export function createPolicy(input: any) {
  return graphqlRequest<{ createPolicy: any }>(
    graphqlOperationIds.createPolicy,
    { input }
  ).then((data) => data.createPolicy)
}

export function updatePolicy(input: any) {
  return graphqlRequest<{ updatePolicy: any }>(
    graphqlOperationIds.updatePolicy,
    { input }
  ).then((data) => data.updatePolicy)
}

export function removePolicy(uuid: string) {
  return graphqlRequest<{ removePolicy: boolean }>(
    graphqlOperationIds.removePolicy,
    { uuid }
  ).then((data) => data.removePolicy)
}

// ─── Cases CRUD & Comments ──────────────────────────────

export function createCase(input: any) {
  return graphqlRequest<{ createCase: any }>(
    graphqlOperationIds.createCase,
    { input }
  ).then((data) => data.createCase)
}

export function updateCase(input: any) {
  return graphqlRequest<{ updateCase: any }>(
    graphqlOperationIds.updateCase,
    { input }
  ).then((data) => data.updateCase)
}

export function removeCase(uuid: string) {
  return graphqlRequest<{ removeCase: boolean }>(
    graphqlOperationIds.removeCase,
    { uuid }
  ).then((data) => data.removeCase)
}

export function addCommentApi(caseId: string, body: string, internalOnly: boolean) {
  return graphqlRequest<{ addComment: any }>(
    graphqlOperationIds.addComment,
    { caseId, body, internalOnly }
  ).then((data) => data.addComment)
}

export type UserRaw = {
  uuid: string
  firstName: string
  lastName: string
  email: string
  roles: string[]
}

export function fetchUsers() {
  return graphqlRequest<{ users: UserRaw[] }>(graphqlOperationIds.users).then((data) => data.users)
}
