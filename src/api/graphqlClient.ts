import axios, { AxiosError } from 'axios'
import { useAuthStore } from '../store/useAuthStore'
import { useErrorStore } from '../store/useErrorStore'
import { graphqlOperationIds } from './graphqlOperationIds'
import type { GraphqlOperationId } from './graphqlOperationIds'

const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:3000/graphql'
export const sessionExpiredMessage = 'Tu sesiÃ³n expirÃ³.'

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

  let payload: GraphqlResponse<TData>
  try {
    const response = await axios.post<GraphqlResponse<TData>>(
      graphqlEndpoint,
      {
        variables,
        extensions: {
          operationId,
        },
      },
      { headers },
    )
    payload = response.data
  } catch (error) {
    const status = error instanceof AxiosError ? error.response?.status : undefined

    if (status === 401) {
      if (operationId !== graphqlOperationIds.verifySupervisorAuthorization) {
        useAuthStore.getState().logout(true)
        throw new Error(sessionExpiredMessage)
      }
      throw new Error('Credenciales de supervisor incorrectas o no cuenta con permisos.')
    }

    if (status === 404) {
      useErrorStore.getState().setError('404')
      throw new Error('Recurso no encontrado (404)')
    }

    if (status && status >= 500) {
      useErrorStore.getState().setError('500')
      throw new Error('Error interno del servidor (500)')
    }

    if (status) {
      throw new Error('No se pudo completar la solicitud.')
    }

    useErrorStore.getState().setError('500')
    throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servicio estÃ© activo o intÃ©ntalo mÃ¡s tarde.')
  }

  if (payload.errors?.length) {
    if (payload.errors.some((error) => /unauthorized|unauthenticated|jwt|forbidden/i.test(error.message))) {
      if (operationId !== graphqlOperationIds.verifySupervisorAuthorization) {
        useAuthStore.getState().logout(true)
        throw new Error(sessionExpiredMessage)
      }
      throw new Error('Credenciales de supervisor incorrectas o no cuenta con permisos.')
    }

    throw new Error(payload.errors.map((error) => error.message).join('\n'))
  }

  if (!payload.data) {
    throw new Error('No se pudo completar la solicitud.')
  }

  return payload.data
}
