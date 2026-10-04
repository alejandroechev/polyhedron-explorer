import { useCallback, useEffect, useState } from 'react'

/** State mirrored into localStorage, so settings survive a restart. */
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw == null) return initial
      return { ...(initial as object), ...JSON.parse(raw) } as T
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage can be unavailable (private mode, embedded webviews).
    }
  }, [key, value])

  return [value, setValue]
}

/** Two-way binding between the selected model and the URL hash. */
export function useHashRoute(fallback: string): [string, (id: string) => void] {
  const read = () => decodeURIComponent(window.location.hash.replace(/^#\/?/, ''))
  const [id, setId] = useState(() => read() || fallback)

  useEffect(() => {
    const onHashChange = () => {
      const next = read()
      if (next) setId(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: string) => {
    setId(next)
    const target = `#/${encodeURIComponent(next)}`
    if (window.location.hash !== target) window.location.hash = target
  }, [])

  useEffect(() => {
    const target = `#/${encodeURIComponent(id)}`
    if (window.location.hash !== target) {
      window.history.replaceState(null, '', target)
    }
  }, [id])

  return [id, navigate]
}

/** True while the viewport is narrow enough to use the phone layout. */
export function useIsNarrow(breakpoint = 1024): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint,
  )
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setNarrow(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [breakpoint])
  return narrow
}
