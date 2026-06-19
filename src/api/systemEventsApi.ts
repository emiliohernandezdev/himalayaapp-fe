import { useAuthStore } from '../store/useAuthStore'
import { publishAppEvent } from '../utils/appEvents'

const apiEndpoint = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'
const sseEnabled = import.meta.env.VITE_ENABLE_SSE !== 'false'

type BackendSystemEvent = {
  type: 'notification.created'
  userUuid: string
  notification?: {
    uuid: string
    type?: string
    relatedEntityUuid?: string
  }
}

function dispatchBackendEvent(event: BackendSystemEvent) {
  if (event.type === 'notification.created') {
    publishAppEvent({ type: 'notifications:refresh', source: 'sse', entity: 'notification', action: 'create', uuid: event.notification?.uuid })
    if (event.notification?.relatedEntityUuid && event.notification.type?.startsWith('case_')) {
      publishAppEvent({ type: 'records:changed', source: 'sse', entity: 'case', action: 'refresh', uuid: event.notification.relatedEntityUuid })
    }
  }
}

export function connectSystemEvents(signal: AbortSignal) {
  if (!sseEnabled) return Promise.resolve()

  const token = useAuthStore.getState().token
  if (!token) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const url = new URL(`${apiEndpoint}/system/events`)
    url.searchParams.set('access_token', token)

    const source = new EventSource(url.toString())
    let opened = false

    const close = () => {
      source.close()
      resolve()
    }

    source.onopen = () => {
      opened = true
    }

    source.onmessage = (message) => {
      if (!message.data) return
      dispatchBackendEvent(JSON.parse(message.data) as BackendSystemEvent)
    }

    source.onerror = () => {
      source.close()
      if (opened || signal.aborted) {
        resolve()
      } else {
        reject(new Error('No se pudo abrir el stream de eventos.'))
      }
    }

    if (signal.aborted) {
      close()
      return
    }

    signal.addEventListener('abort', close, { once: true })
  })
}
