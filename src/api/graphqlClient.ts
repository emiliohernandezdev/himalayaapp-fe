const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:3000/graphql'

type GraphqlResponse<TData> = {
  data?: TData
  errors?: Array<{ message: string }>
}

export async function graphqlRequest<TData>(query: string, variables?: Record<string, unknown>) {
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
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`)
  }

  const payload = (await response.json()) as GraphqlResponse<TData>

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('\n'))
  }

  if (!payload.data) {
    throw new Error('GraphQL response did not include data')
  }

  return payload.data
}
