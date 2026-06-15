import { useCallback, useEffect, useState } from 'react'

export function useApiQuery<TData>(queryKey: string, queryFn: () => Promise<TData>) {
  const [data, setData] = useState<TData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let active = true

    setLoading(true)
    setError(null)

    queryFn()
      .then((nextData) => {
        if (active) setData(nextData)
      })
      .catch((nextError: Error) => {
        if (active) setError(nextError)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, tick])

  return { data, error, loading, refetch }
}
