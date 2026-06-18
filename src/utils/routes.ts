const legacyMaintenancePrefix = /^\/maintenance(?=\/|$)/

export function normalizeAppRoute(route?: string | null) {
  if (!route) return '/dashboard'
  const normalized = route.replace(legacyMaintenancePrefix, '')
  return normalized || '/dashboard'
}

export function caseRoute(caseUuid?: string | null) {
  return caseUuid ? `/cases/${caseUuid}` : '/cases'
}

export const ssmRoutes = ['/providers', '/clients', '/products', '/policies', '/cases', '/tags', '/widgets']

export function isSsmRoute(pathname: string) {
  return ssmRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
