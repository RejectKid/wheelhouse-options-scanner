import { useCallback, useEffect, useState } from 'react'
import type { LiveScanMeta, StockOpportunity } from '../types'

type ScanResponse = { meta: LiveScanMeta; opportunities: StockOpportunity[] }

export function useLiveScanner() {
  const [data, setData] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/scan${force ? '?refresh=true' : ''}`)
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Live scan failed')
      setData(body)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Live scan failed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load(false) }, [load])
  return { data, loading, error, refresh: () => load(true) }
}
