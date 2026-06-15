import { graphqlRequest } from './graphqlClient'

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

const maintenanceModulesQuery = `
  query MaintenanceModules {
    maintenanceModules {
      uuid
      slug
      title
      description
      route
      icon
      tone
      sortOrder
    }
  }
`

export function fetchMaintenanceModules() {
  return graphqlRequest<MaintenanceModulesResponse>(maintenanceModulesQuery).then((data) => data.maintenanceModules)
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
  return graphqlRequest<{ providers: ProviderRaw[] }>(`
    query Providers {
      providers {
        uuid name type status contactName contactEmail contactPhone logo address taxId
      }
    }
  `).then((data) => data.providers)
}

export function createProvider(input: Record<string, unknown>) {
  return graphqlRequest<{ createProvider: { uuid: string } }>(
    `mutation CreateProvider($input: CreateProviderInput!) { createProvider(input: $input) { uuid } }`,
    { input }
  )
}

export function updateProvider(input: Record<string, unknown>) {
  return graphqlRequest<{ updateProvider: { uuid: string } }>(
    `mutation UpdateProvider($input: UpdateProviderInput!) { updateProvider(input: $input) { uuid } }`,
    { input }
  )
}

export function removeProvider(uuid: string) {
  return graphqlRequest<{ removeProvider: boolean }>(
    `mutation RemoveProvider($uuid: String!) { removeProvider(uuid: $uuid) }`,
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
  return graphqlRequest<{ products: ProductRaw[] }>(`
    query Products {
      products {
        uuid name category status lineOfBusiness description providerUuid
        provider { uuid name }
      }
    }
  `).then((data) => data.products)
}

export function createProduct(input: Record<string, unknown>) {
  return graphqlRequest<{ createProduct: { uuid: string } }>(
    `mutation CreateProduct($input: CreateProductInput!) { createProduct(input: $input) { uuid } }`,
    { input }
  )
}

export function updateProduct(input: Record<string, unknown>) {
  return graphqlRequest<{ updateProduct: { uuid: string } }>(
    `mutation UpdateProduct($input: UpdateProductInput!) { updateProduct(input: $input) { uuid } }`,
    { input }
  )
}

export function removeProduct(uuid: string) {
  return graphqlRequest<{ removeProduct: boolean }>(
    `mutation RemoveProduct($uuid: String!) { removeProduct(uuid: $uuid) }`,
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
  return graphqlRequest<{ clients: ClientRaw[] }>(`
    query Clients {
      clients {
        uuid displayName type status taxId email phone address city department
      }
    }
  `).then((data) => data.clients)
}

export function createClient(input: Record<string, unknown>) {
  return graphqlRequest<{ createClient: { uuid: string } }>(
    `mutation CreateClient($input: CreateClientInput!) { createClient(input: $input) { uuid } }`,
    { input }
  )
}

export function updateClient(input: Record<string, unknown>) {
  return graphqlRequest<{ updateClient: { uuid: string } }>(
    `mutation UpdateClient($input: UpdateClientInput!) { updateClient(input: $input) { uuid } }`,
    { input }
  )
}

export function removeClient(uuid: string) {
  return graphqlRequest<{ removeClient: boolean }>(
    `mutation RemoveClient($uuid: String!) { removeClient(uuid: $uuid) }`,
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
  return graphqlRequest<{ policies: PolicyRaw[] }>(`
    query Policies {
      policies {
        uuid policyNumber status startDate endDate premiumAmount insuredAmount currency notes
        clientUuid providerUuid productUuid
        client { uuid displayName }
        provider { uuid name }
        product { uuid name }
      }
    }
  `).then((data) => data.policies)
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
}

export function fetchCases() {
  return graphqlRequest<{ cases: CaseRaw[] }>(`
    query Cases {
      cases {
        uuid caseNumber title status priority type description
        clientUuid
        client { uuid displayName }
      }
    }
  `).then((data) => data.cases)
}

// ─── Tags ───────────────────────────────────────────────

export type TagRaw = {
  uuid: string
  name: string
  color: string
  description?: string | null
}

export function fetchTags() {
  return graphqlRequest<{ tags: TagRaw[] }>(`
    query Tags {
      tags { uuid name color description }
    }
  `).then((data) => data.tags)
}

export function createTag(input: Record<string, unknown>) {
  return graphqlRequest<{ createTag: { uuid: string } }>(
    `mutation CreateTag($input: CreateTagInput!) { createTag(input: $input) { uuid } }`,
    { input }
  )
}

export function updateTag(input: Record<string, unknown>) {
  return graphqlRequest<{ updateTag: { uuid: string } }>(
    `mutation UpdateTag($input: UpdateTagInput!) { updateTag(input: $input) { uuid } }`,
    { input }
  )
}

export function removeTag(uuid: string) {
  return graphqlRequest<{ removeTag: boolean }>(
    `mutation RemoveTag($uuid: String!) { removeTag(uuid: $uuid) }`,
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
    `query CaseDetail($uuid: String!) {
      case(uuid: $uuid) {
        uuid caseNumber title description type status priority dueAt closedAt createdAt updatedAt clientUuid
        client { uuid displayName email phone }
        policy { uuid policyNumber }
        assignedUser { uuid firstName lastName email }
        tags { uuid name color }
        comments {
          uuid body internalOnly createdAt
          author { uuid firstName lastName email }
        }
        auditLogs {
          uuid action entityName before after createdAt
          actor { uuid firstName lastName }
        }
      }
    }`,
    { uuid }
  ).then((data) => data.case)
}

// ─── Authentication ─────────────────────────────────────

export function loginApi(email: string, password: string) {
  return graphqlRequest<{ login: { accessToken: string; user: any } }>(
    `mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        accessToken
        user {
          uuid
          email
          firstName
          lastName
          roles
        }
      }
    }`,
    { email, password }
  ).then((data) => data.login)
}

// ─── Policies CRUD ──────────────────────────────────────

export function createPolicy(input: any) {
  return graphqlRequest<{ createPolicy: any }>(
    `mutation CreatePolicy($input: CreatePolicyInput!) {
      createPolicy(input: $input) {
        uuid
        policyNumber
      }
    }`,
    { input }
  ).then((data) => data.createPolicy)
}

export function updatePolicy(input: any) {
  return graphqlRequest<{ updatePolicy: any }>(
    `mutation UpdatePolicy($input: UpdatePolicyInput!) {
      updatePolicy(input: $input) {
        uuid
        policyNumber
      }
    }`,
    { input }
  ).then((data) => data.updatePolicy)
}

export function removePolicy(uuid: string) {
  return graphqlRequest<{ removePolicy: boolean }>(
    `mutation RemovePolicy($uuid: String!) {
      removePolicy(uuid: $uuid)
    }`,
    { uuid }
  ).then((data) => data.removePolicy)
}

// ─── Cases CRUD & Comments ──────────────────────────────

export function createCase(input: any) {
  return graphqlRequest<{ createCase: any }>(
    `mutation CreateCase($input: CreateCaseInput!) {
      createCase(input: $input) {
        uuid
        caseNumber
      }
    }`,
    { input }
  ).then((data) => data.createCase)
}

export function updateCase(input: any) {
  return graphqlRequest<{ updateCase: any }>(
    `mutation UpdateCase($input: UpdateCaseInput!) {
      updateCase(input: $input) {
        uuid
        caseNumber
      }
    }`,
    { input }
  ).then((data) => data.updateCase)
}

export function removeCase(uuid: string) {
  return graphqlRequest<{ removeCase: boolean }>(
    `mutation RemoveCase($uuid: String!) {
      removeCase(uuid: $uuid)
    }`,
    { uuid }
  ).then((data) => data.removeCase)
}

export function addCommentApi(caseId: string, body: string, internalOnly: boolean) {
  return graphqlRequest<{ addComment: any }>(
    `mutation AddComment($caseId: String!, $body: String!, $internalOnly: Boolean!) {
      addComment(caseId: $caseId, body: $body, internalOnly: $internalOnly) {
        uuid
        body
        internalOnly
        createdAt
        author {
          uuid
          firstName
          lastName
          email
        }
      }
    }`,
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
  return graphqlRequest<{ users: UserRaw[] }>(`
    query Users {
      users {
        uuid firstName lastName email roles
      }
    }
  `).then((data) => data.users)
}
