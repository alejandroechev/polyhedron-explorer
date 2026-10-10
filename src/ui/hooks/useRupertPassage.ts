import { useEffect, useState } from 'react'
import type { Polyhedron } from '../../domain/geometry/polyhedron'
import type { RupertResult } from '../../domain/geometry/rupert'

type SearchState = RupertResult | { readonly status: 'checking' | 'error'; readonly message: string }

export function useRupertPassage(polyhedron: Polyhedron): SearchState {
  const [result, setResult] = useState<{ polyhedron: Polyhedron; state: SearchState } | null>(null)

  useEffect(() => {
    let worker: Worker | undefined
    const fail = (message: string) => {
      setResult({ polyhedron, state: { status: 'error', message } })
      worker?.terminate()
    }
    const timer = window.setTimeout(() => {
      fail('Passage search exceeded its time limit. No conclusion about the Rupert property was reached.')
    }, 10000)
    try {
      worker = new Worker(new URL('../../domain/geometry/rupert.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<RupertResult>) => {
        clearTimeout(timer)
        setResult({ polyhedron, state: event.data })
        worker?.terminate()
      }
      worker.onerror = () => {
        clearTimeout(timer)
        fail('Passage search failed. Reselect the model to retry.')
      }
      worker.postMessage(polyhedron)
    } catch (error) {
      clearTimeout(timer)
      fail(`Unable to start passage search: ${error instanceof Error ? error.message : String(error)}`)
    }
    return () => {
      clearTimeout(timer)
      worker?.terminate()
    }
  }, [polyhedron])

  return result?.polyhedron === polyhedron ? result.state :
    { status: 'checking', message: 'Checking for an equal-sized passage...' }
}
