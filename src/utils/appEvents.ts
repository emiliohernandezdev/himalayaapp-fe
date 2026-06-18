export type AppEventType =
  | 'notifications:refresh'
  | 'widgets:changed'
  | 'dashboard:changed'
  | 'records:changed'

export type AppEventPayload = {
  type: AppEventType
  source?: string
  entity?: string
  action?: 'create' | 'update' | 'delete' | 'refresh'
  uuid?: string
  at: number
}

const channelName = 'himalaya-app-events'
const localEventName = 'himalaya-app:event'

let broadcastChannel: BroadcastChannel | null = null

function getBroadcastChannel() {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(channelName)
  }
  return broadcastChannel
}

export function publishAppEvent(event: Omit<AppEventPayload, 'at'>) {
  const payload: AppEventPayload = { ...event, at: Date.now() }
  window.dispatchEvent(new CustomEvent(localEventName, { detail: payload }))
  getBroadcastChannel()?.postMessage(payload)
}

export function subscribeAppEvent(type: AppEventType, handler: (event: AppEventPayload) => void) {
  const handleLocalEvent = (event: Event) => {
    const payload = (event as CustomEvent<AppEventPayload>).detail
    if (payload?.type === type) handler(payload)
  }

  const channel = getBroadcastChannel()
  const handleChannelEvent = (event: MessageEvent<AppEventPayload>) => {
    if (event.data?.type === type) handler(event.data)
  }

  window.addEventListener(localEventName, handleLocalEvent)
  channel?.addEventListener('message', handleChannelEvent)

  return () => {
    window.removeEventListener(localEventName, handleLocalEvent)
    channel?.removeEventListener('message', handleChannelEvent)
  }
}
