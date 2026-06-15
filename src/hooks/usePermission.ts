import { useEffect, useState, useMemo } from 'react'
import { fetchMySecurityAccessRules } from '../api/securityApi'
import type { SecurityAccessRule } from '../api/securityApi'
import { useAuthStore } from '../store/useAuthStore'

let cachedRules: SecurityAccessRule[] | null = null
let cachedLoading = false
let cachePromise: Promise<SecurityAccessRule[]> | null = null
const listeners = new Set<(state: { data: SecurityAccessRule[] | null; loading: boolean }) => void>()

let lastToken: string | null = null
let lastModuleSlug: string | null = null

function notifyListeners() {
  const state = { data: cachedRules, loading: cachedLoading }
  listeners.forEach((listener) => listener(state))
}

function triggerFetch() {
  if (cachePromise) return cachePromise
  cachedLoading = true
  notifyListeners()

  cachePromise = fetchMySecurityAccessRules()
    .then((rules) => {
      cachedRules = rules
      cachedLoading = false
      cachePromise = null
      notifyListeners()
      return rules
    })
    .catch(() => {
      cachedRules = []
      cachedLoading = false
      cachePromise = null
      notifyListeners()
      return []
    })
  return cachePromise
}

function checkAndResetCache(token: string | null, activeModuleSlug: string | null) {
  if (token !== lastToken || activeModuleSlug !== lastModuleSlug) {
    lastToken = token
    lastModuleSlug = activeModuleSlug
    cachedRules = null
    cachedLoading = false
    cachePromise = null
  }
}

export function clearPermissionCache() {
  cachedRules = null
  cachedLoading = false
  cachePromise = null
  lastToken = null
  lastModuleSlug = null
  notifyListeners()
}

export function usePermission(actionCode: string) {
  const activeModuleSlug = useAuthStore((state) => state.activeModuleSlug)
  const token = useAuthStore((state) => state.token)

  // Ensure stale cache is invalidated before rendering
  checkAndResetCache(token, activeModuleSlug)

  const [state, setState] = useState({ data: cachedRules, loading: cachedLoading })

  useEffect(() => {
    if (!token) {
      cachedRules = null
      cachedLoading = false
      cachePromise = null
      setState({ data: null, loading: false })
      return
    }

    const listener = (nextState: { data: SecurityAccessRule[] | null; loading: boolean }) => {
      setState(nextState)
    }
    listeners.add(listener)

    if (cachedRules === null && !cachedLoading) {
      triggerFetch()
    } else {
      setState({ data: cachedRules, loading: cachedLoading })
    }

    return () => {
      listeners.delete(listener)
    }
  }, [token, activeModuleSlug])

  return useMemo(() => {
    if (state.loading || !state.data) return false

    const matchingRules = state.data.filter((rule) => {
      if (rule.actionCode !== actionCode) return false
      if (!activeModuleSlug) return true
      return !rule.module?.slug || rule.module.slug === activeModuleSlug
    })

    if (matchingRules.length === 0) return false
    return matchingRules.some((rule) => rule.allowed)
  }, [actionCode, activeModuleSlug, state.data, state.loading])
}

export function usePermissionLoading() {
  const activeModuleSlug = useAuthStore((state) => state.activeModuleSlug)
  const token = useAuthStore((state) => state.token)

  // Ensure stale cache is invalidated before rendering
  checkAndResetCache(token, activeModuleSlug)

  const [state, setState] = useState({ data: cachedRules, loading: cachedLoading })

  useEffect(() => {
    if (!token) {
      cachedRules = null
      cachedLoading = false
      cachePromise = null
      setState({ data: null, loading: false })
      return
    }

    const listener = (nextState: { data: SecurityAccessRule[] | null; loading: boolean }) => {
      setState(nextState)
    }
    listeners.add(listener)

    if (cachedRules === null && !cachedLoading) {
      triggerFetch()
    } else {
      setState({ data: cachedRules, loading: cachedLoading })
    }

    return () => {
      listeners.delete(listener)
    }
  }, [token, activeModuleSlug])

  return state.loading || state.data === null
}
