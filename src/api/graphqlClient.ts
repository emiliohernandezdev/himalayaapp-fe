import type { GraphqlOperationId } from './graphqlOperationIds'

const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:3000/graphql'

type GraphqlResponse<TData> = {
  data?: TData
  errors?: Array<{ message: string }>
}

export async function graphqlRequest<TData>(operationId: GraphqlOperationId, variables?: Record<string, unknown>) {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      variables,
      extensions: {
        operationId,
      },
    }),
  })

  if (!response.ok) {
    throw new Error('No se pudo completar la solicitud.')
  }

  const payload = (await response.json()) as GraphqlResponse<TData>

  if (payload.errors?.length) {
    throw new Error('No se pudo completar la solicitud.')
  }

  if (!payload.data) {
    throw new Error('No se pudo completar la solicitud.')
  }

  return payload.data
}
