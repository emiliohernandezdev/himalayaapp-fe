import { graphqlRequest } from './graphqlClient'
import { graphqlOperationIds } from './graphqlOperationIds'

export type SystemNotification = {
  uuid: string
  userUuid: string
  title: string
  body: string
  type?: string
  relatedEntityUuid?: string
  isRead: boolean
  createdAt: string
}

export function fetchMyNotifications() {
  return graphqlRequest<{ myNotifications: SystemNotification[] }>(graphqlOperationIds.myNotifications).then((data) => data.myNotifications)
}

export function markNotificationRead(uuid: string) {
  return graphqlRequest<{ markNotificationRead: SystemNotification }>(graphqlOperationIds.markNotificationRead, { uuid }).then((data) => data.markNotificationRead)
}

export function markAllNotificationsRead() {
  return graphqlRequest<{ markAllNotificationsRead: boolean }>(graphqlOperationIds.markAllNotificationsRead).then((data) => data.markAllNotificationsRead)
}
