import { useCallback, useEffect, useRef, useState } from 'react'
import { agentRequest } from './local-print'
import { discoverPrinters } from './print-choice'
import type { PrintConnection } from './print-choice'

export function usePrintClient(printing: boolean) {
  const [connection, setConnection] = useState<PrintConnection>({ status: 'checking', printers: [] })
  const [checking, setChecking] = useState(false)
  const alive = useRef(false), busy = useRef(printing)
  const flight = useRef<{ controller: AbortController; promise: Promise<PrintConnection> } | null>(null)
  useEffect(() => { busy.current = printing }, [printing])
  const refresh = useCallback((): Promise<PrintConnection> => {
    if (flight.current) return flight.current.promise
    const controller = new AbortController()
    if (alive.current) setChecking(true)
    const promise = discoverPrinters(() => agentRequest('printers', undefined, { signal: controller.signal, timeout: 5000 }))
      .then(result => {
        if (alive.current && !controller.signal.aborted) setConnection(result)
        return result
      }).finally(() => {
        if (flight.current?.controller === controller) {
          flight.current = null
          if (alive.current) setChecking(false)
        }
      })
    flight.current = { controller, promise }
    return promise
  }, [])
  useEffect(() => {
    alive.current = true
    void refresh()
    const check = () => { if (document.visibilityState !== 'hidden' && !busy.current) void refresh() }
    const timer = setInterval(check, 15000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      alive.current = false
      flight.current?.controller.abort()
      flight.current = null
      clearInterval(timer)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [refresh])
  return { connection, checking, refresh }
}
