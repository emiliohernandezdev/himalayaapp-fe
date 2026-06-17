import { useAuthStore } from '../store/useAuthStore'
import type { GraphqlOperationId } from './graphqlOperationIds'

const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:3000/graphql'
export const sessionExpiredMessage = 'Tu sesión expiró.'

type GraphqlResponse<TData> = {
  data?: TData
  errors?: Array<{ message: string }>
}

export async function graphqlRequest<TData>(operationId: GraphqlOperationId, variables?: Record<string, unknown>) {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        variables,
        extensions: {
          operationId,
        },
      }),
    })
  } catch (error) {
    throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servicio esté activo o inténtalo más tarde.')
  }

  if (response.status === 401) {
    useAuthStore.getState().logout()
    throw new Error(sessionExpiredMessage)
  }

  if (!response.ok) {
    throw new Error('No se pudo completar la solicitud.')
  }

  const payload = (await response.json()) as GraphqlResponse<TData>

  if (payload.errors?.length) {
    if (payload.errors.some((error) => /unauthorized|unauthenticated|jwt|forbidden/i.test(error.message))) {
      useAuthStore.getState().logout()
      throw new Error(sessionExpiredMessage)
    }

    throw new Error(payload.errors.map((error) => error.message).join('\n'))
  }

  if (!payload.data) {
    throw new Error('No se pudo completar la solicitud.')
  }

  return payload.data
}
