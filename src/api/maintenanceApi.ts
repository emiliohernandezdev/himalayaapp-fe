import { graphqlRequest } from './graphqlClient'
import { graphqlOperationIds } from './graphqlOperationIds'
import type { NodeAccess } from '../store/useAuthStore'
import { publishAppEvent } from '../utils/appEvents'

function publishRecordsChanged(entity: string, action: 'create' | 'update' | 'delete', uuid?: string) {
  publishAppEvent({ type: 'records:changed', source: 'maintenance-api', entity, action, uuid })
}

function publishWidgetsChanged(action: 'create' | 'update' | 'delete', uuid?: string) {
  publishAppEvent({ type: 'widgets:changed', source: 'maintenance-api', entity: 'widget', action, uuid })
}

function publishDashboardChanged(action: 'create' | 'update' | 'delete' | 'refresh', uuid?: string) {
  publishAppEvent({ type: 'dashboard:changed', source: 'maintenance-api', entity: 'dashboard', action, uuid })
}

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

export type DashboardSummary = {
  generatedAt: string
  visibility: {
    canViewClients: boolean
    canViewPolicies: boolean
    canViewCases: boolean
    canViewProviders: boolean
    canViewProducts: boolean
    canViewPremiums: boolean
    canExport: boolean
  }
  metrics: Array<{
    key: string
    label: string
    value: string
    detail: string
    tone: 'primary' | 'success' | 'warning'
  }>
  shortcuts: Array<{
    slug: string
    title: string
    description: string
    route: string
    icon: string
  }>
  renewals: Array<{
    policyUuid: string
    policyNumber: string
    clientName: string
    endDate: string
    daysRemaining: number
    progress: number
    premiumAmount?: number | null
    currency: string
  }>
  followUps: Array<{
    caseUuid: string
    caseNumber: string
    title: string
    clientName: string
    status: string
    priority: string
    dueAt?: string | null
    assignedTo?: string | null
  }>
  caseBuckets: Array<{
    status: string
    label: string
    count: number
  }>
}

type MaintenanceModulesResponse = {
  maintenanceModules: MaintenanceModuleDto[]
}

export function fetchMaintenanceModules() {
  return graphqlRequest<MaintenanceModulesResponse>(graphqlOperationIds.maintenanceModules).then((data) => data.maintenanceModules)
}

export function fetchDashboardSummary() {
  return graphqlRequest<{ dashboardSummary: DashboardSummary }>(graphqlOperationIds.dashboardSummary).then((data) => data.dashboardSummary)
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

export function fetchProviders(page?: number, limit?: number) {
  return graphqlRequest<{ providers: { items: ProviderRaw[]; total: number } }>(
    graphqlOperationIds.providers,
    { page, limit }
  ).then((data) => data.providers)
}

export function createProvider(input: Record<string, unknown>) {
  return graphqlRequest<{ createProvider: { uuid: string } }>(
    graphqlOperationIds.createProvider,
    { input }
  ).then((data) => {
    publishRecordsChanged('provider', 'create', data.createProvider.uuid)
    return data
  })
}

export function updateProvider(input: Record<string, unknown>) {
  return graphqlRequest<{ updateProvider: { uuid: string } }>(
    graphqlOperationIds.updateProvider,
    { input }
  ).then((data) => {
    publishRecordsChanged('provider', 'update', data.updateProvider.uuid)
    return data
  })
}

export function removeProvider(uuid: string) {
  return graphqlRequest<{ removeProvider: boolean }>(
    graphqlOperationIds.removeProvider,
    { uuid }
  ).then((data) => {
    publishRecordsChanged('provider', 'delete', uuid)
    return data
  })
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

export function fetchProducts(page?: number, limit?: number) {
  return graphqlRequest<{ products: { items: ProductRaw[]; total: number } }>(
    graphqlOperationIds.products,
    { page, limit }
  ).then((data) => data.products)
}

export function createProduct(input: Record<string, unknown>) {
  const { providerUuid, ...rest } = input
  return graphqlRequest<{ createProduct: { uuid: string } }>(
    graphqlOperationIds.createProduct,
    { input: { ...rest, providerId: providerUuid } }
  ).then((data) => {
    publishRecordsChanged('product', 'create', data.createProduct.uuid)
    return data
  })
}

export function updateProduct(input: Record<string, unknown>) {
  const { providerUuid, ...rest } = input
  return graphqlRequest<{ updateProduct: { uuid: string } }>(
    graphqlOperationIds.updateProduct,
    { input: { ...rest, providerId: providerUuid } }
  ).then((data) => {
    publishRecordsChanged('product', 'update', data.updateProduct.uuid)
    return data
  })
}

export function removeProduct(uuid: string) {
  return graphqlRequest<{ removeProduct: boolean }>(
    graphqlOperationIds.removeProduct,
    { uuid }
  ).then((data) => {
    publishRecordsChanged('product', 'delete', uuid)
    return data
  })
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

export function fetchClients(page?: number, limit?: number) {
  return graphqlRequest<{ clients: { items: ClientRaw[]; total: number } }>(
    graphqlOperationIds.clients,
    { page, limit }
  ).then((data) => data.clients)
}

export function createClient(input: Record<string, unknown>) {
  return graphqlRequest<{ createClient: { uuid: string } }>(
    graphqlOperationIds.createClient,
    { input }
  ).then((data) => {
    publishRecordsChanged('client', 'create', data.createClient.uuid)
    return data
  })
}

export function updateClient(input: Record<string, unknown>) {
  return graphqlRequest<{ updateClient: { uuid: string } }>(
    graphqlOperationIds.updateClient,
    { input }
  ).then((data) => {
    publishRecordsChanged('client', 'update', data.updateClient.uuid)
    return data
  })
}

export function removeClient(uuid: string) {
  return graphqlRequest<{ removeClient: boolean }>(
    graphqlOperationIds.removeClient,
    { uuid }
  ).then((data) => {
    publishRecordsChanged('client', 'delete', uuid)
    return data
  })
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
  paymentMethod?: string | null
  cardBrand?: string | null
  cardLastFour?: string | null
  billingFrequency?: string | null
  billingInstallments?: number | null
  installmentAmount?: number | null
  clientUuid: string
  providerUuid: string
  productUuid: string
  client: { uuid: string; displayName: string }
  provider: { uuid: string; name: string }
  product: { uuid: string; name: string }
}

export function fetchPolicies(page?: number, limit?: number) {
  return graphqlRequest<{ policies: { items: PolicyRaw[]; total: number } }>(
    graphqlOperationIds.policies,
    { page, limit }
  ).then((data) => data.policies)
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

export function fetchCases(page?: number, limit?: number) {
  return graphqlRequest<{ cases: { items: CaseRaw[]; total: number } }>(
    graphqlOperationIds.cases,
    { page, limit }
  ).then((data) => data.cases)
}

// ─── Tags ───────────────────────────────────────────────

export type TagRaw = {
  uuid: string
  name: string
  color: string
  description?: string | null
}

export function fetchTags(page?: number, limit?: number) {
  return graphqlRequest<{ tags: { items: TagRaw[]; total: number } }>(
    graphqlOperationIds.tags,
    { page, limit }
  ).then((data) => data.tags)
}

export function createTag(input: Record<string, unknown>) {
  return graphqlRequest<{ createTag: { uuid: string } }>(
    graphqlOperationIds.createTag,
    { input }
  ).then((data) => {
    publishRecordsChanged('tag', 'create', data.createTag.uuid)
    return data
  })
}

export function updateTag(input: Record<string, unknown>) {
  return graphqlRequest<{ updateTag: { uuid: string } }>(
    graphqlOperationIds.updateTag,
    { input }
  ).then((data) => {
    publishRecordsChanged('tag', 'update', data.updateTag.uuid)
    return data
  })
}

export function removeTag(uuid: string) {
  return graphqlRequest<{ removeTag: boolean }>(
    graphqlOperationIds.removeTag,
    { uuid }
  ).then((data) => {
    publishRecordsChanged('tag', 'delete', uuid)
    return data
  })
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
  ).then((data) => {
    publishRecordsChanged('policy', 'create', data.createPolicy?.uuid)
    return data.createPolicy
  })
}

export function updatePolicy(input: any) {
  return graphqlRequest<{ updatePolicy: any }>(
    graphqlOperationIds.updatePolicy,
    { input }
  ).then((data) => {
    publishRecordsChanged('policy', 'update', data.updatePolicy?.uuid ?? input.uuid)
    return data.updatePolicy
  })
}

export function removePolicy(uuid: string) {
  return graphqlRequest<{ removePolicy: boolean }>(
    graphqlOperationIds.removePolicy,
    { uuid }
  ).then((data) => {
    publishRecordsChanged('policy', 'delete', uuid)
    return data.removePolicy
  })
}

// ─── Cases CRUD & Comments ──────────────────────────────

export function createCase(input: any) {
  return graphqlRequest<{ createCase: any }>(
    graphqlOperationIds.createCase,
    { input }
  ).then((data) => {
    publishRecordsChanged('case', 'create', data.createCase?.uuid)
    publishAppEvent({ type: 'notifications:refresh', source: 'maintenance-api', entity: 'notification', action: 'refresh' })
    return data.createCase
  })
}

export function updateCase(input: any) {
  return graphqlRequest<{ updateCase: any }>(
    graphqlOperationIds.updateCase,
    { input }
  ).then((data) => {
    publishRecordsChanged('case', 'update', data.updateCase?.uuid ?? input.uuid)
    publishAppEvent({ type: 'notifications:refresh', source: 'maintenance-api', entity: 'notification', action: 'refresh' })
    return data.updateCase
  })
}

export function removeCase(uuid: string) {
  return graphqlRequest<{ removeCase: boolean }>(
    graphqlOperationIds.removeCase,
    { uuid }
  ).then((data) => {
    publishRecordsChanged('case', 'delete', uuid)
    return data.removeCase
  })
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

// ─── User Dashboards ────────────────────────────────────

export type UserDashboardDto = {
  uuid: string
  name: string
  config: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export function fetchUserDashboards() {
  return graphqlRequest<{ userDashboards: UserDashboardDto[] }>(graphqlOperationIds.userDashboards).then((data) => data.userDashboards)
}

export function saveUserDashboardApi(name: string, config: string) {
  return graphqlRequest<{ saveUserDashboard: UserDashboardDto }>(
    graphqlOperationIds.saveUserDashboard,
    { name, config }
  ).then((data) => {
    publishDashboardChanged('update', data.saveUserDashboard.uuid)
    return data.saveUserDashboard
  })
}

export function removeUserDashboardApi(name: string) {
  return graphqlRequest<{ removeUserDashboard: boolean }>(
    graphqlOperationIds.removeUserDashboard,
    { name }
  ).then((data) => {
    publishDashboardChanged('delete')
    return data.removeUserDashboard
  })
}

// ─── Widgets CRUD ───────────────────────────────────────

export type WidgetRaw = {
  uuid: string
  slug: string
  title: string
  description: string
  icon: string
  category: string
  presentationType: string
  defaultLayout: string
  enabled: boolean
}

export function fetchWidgets(page?: number, limit?: number) {
  return graphqlRequest<{ widgets: { items: WidgetRaw[]; total: number } }>(
    graphqlOperationIds.widgets,
    { page, limit }
  ).then((data) => data.widgets)
}

export function createWidget(input: Record<string, unknown>) {
  return graphqlRequest<{ createWidget: { uuid: string } }>(
    graphqlOperationIds.createWidget,
    { input }
  ).then((data) => {
    publishWidgetsChanged('create', data.createWidget.uuid)
    return data
  })
}

export function updateWidget(input: Record<string, unknown>) {
  return graphqlRequest<{ updateWidget: { uuid: string } }>(
    graphqlOperationIds.updateWidget,
    { input }
  ).then((data) => {
    publishWidgetsChanged('update', data.updateWidget.uuid)
    return data
  })
}

export function removeWidget(uuid: string) {
  return graphqlRequest<{ removeWidget: boolean }>(
    graphqlOperationIds.removeWidget,
    { uuid }
  ).then((data) => {
    publishWidgetsChanged('delete', uuid)
    return data
  })
}

export function setPrimaryDashboardApi(name: string) {
  return graphqlRequest<{ setPrimaryDashboard: { uuid: string; name: string; isPrimary: boolean } }>(
    graphqlOperationIds.setPrimaryDashboard,
    { name }
  ).then((data) => {
    publishDashboardChanged('update', data.setPrimaryDashboard.uuid)
    return data.setPrimaryDashboard
  })
}

export type SystemHealthDto = {
  status: string
  dbConnected: boolean
  memoryUsage: number
  diskUsage: number
  uptime: number
  cpuStatus: string
}

export function fetchSystemHealth() {
  return graphqlRequest<{ systemHealth: SystemHealthDto }>(graphqlOperationIds.systemHealth).then((data) => data.systemHealth)
}

export type DashboardWidgetDataInput = {
  dataSource: 'clientes' | 'polizas' | 'casos'
  fieldsToShow?: string[]
  filtersJson?: string | null
  groupByField?: string | null
  aggregateFunction?: string | null
  aggregateField?: string | null
  daysWindow?: number | null
  limit?: number | null
}

export type DashboardWidgetDataDto = {
  dataSource: string
  totalRows: number
  aggregateLabel: string
  aggregateValue: string
  rowsJson: string
  chartDataJson: string
}

export function fetchDashboardWidgetData(input: DashboardWidgetDataInput) {
  return graphqlRequest<{ dashboardWidgetData: DashboardWidgetDataDto }>(
    graphqlOperationIds.dashboardWidgetData,
    { input },
  ).then((data) => data.dashboardWidgetData)
}
