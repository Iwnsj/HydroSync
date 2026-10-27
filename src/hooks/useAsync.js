import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Run an async loader with loading / error state.
 * `intervalMs` refreshes silently (keeps showing the previous data).
 */
export function useAsync(fn, deps = [], { intervalMs } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const reqId = useRef(0)

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++reqId.current
    if (!silent) setState((s) => ({ data: s.data, loading: true, error: null }))
    try {
      const data = await fnRef.current()
      if (id === reqId.current) setState({ data, loading: false, error: null })
    } catch (err) {
      if (id === reqId.current) {
        setState((s) => ({ data: silent ? s.data : null, loading: false, error: err?.message || 'Request failed' }))
      }
    }
  }, [])

  useEffect(() => {
    run()
    const timer = intervalMs ? setInterval(() => run({ silent: true }), intervalMs) : null
    return () => {
      reqId.current++
      if (timer) clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, reload: () => run() }
}
