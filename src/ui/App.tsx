import { useCallback, useMemo, useRef, useState } from 'react'

import { getCatalog } from '../domain/catalog'
import {
  computeMetrics,
  normalizeScale,
  type Polyhedron,
} from '../domain/geometry/polyhedron'
import { dual } from '../domain/operations/dual'
import {
  DEFAULT_RENDER_OPTIONS,
  type RenderOptions,
} from '../render/polyhedronMesh'
import Browser from './components/Browser'
import Controls from './components/Controls'
import InfoPanel from './components/InfoPanel'
import Viewer from './components/Viewer'
import { useHashRoute, useIsNarrow, usePersistentState } from './hooks'

declare const __APP_VERSION__: string

type MobileTab = 'view' | 'browse' | 'info' | 'options'

const DEFAULT_MODEL = 'icosahedron'

export default function App() {
  const catalog = useMemo(() => getCatalog(), [])
  const [selectedId, setSelectedId] = useHashRoute(DEFAULT_MODEL)
  const [options, setOptions] = usePersistentState<RenderOptions>(
    'polyhedron-explorer.render',
    DEFAULT_RENDER_OPTIONS,
  )
  const [autoRotate, setAutoRotate] = usePersistentState<{ on: boolean }>(
    'polyhedron-explorer.spin',
    { on: true },
  )
  const [showDual, setShowDual] = useState(false)
  const [tab, setTab] = useState<MobileTab>('view')
  const narrow = useIsNarrow()
  const resetRef = useRef<() => void>(() => {})

  const spec = catalog.byId.get(selectedId) ?? catalog.byId.get(DEFAULT_MODEL)!

  const polyhedron: Polyhedron = useMemo(() => {
    const base = normalizeScale(spec.build(), 1)
    return showDual ? normalizeScale(dual(base, 1), 1) : base
  }, [spec, showDual])

  const metrics = useMemo(() => computeMetrics(polyhedron), [polyhedron])

  const patchOptions = useCallback(
    (patch: Partial<RenderOptions>) => setOptions((prev) => ({ ...prev, ...patch })),
    [setOptions],
  )

  const select = useCallback(
    (id: string) => {
      setSelectedId(id)
      setShowDual(false)
      if (narrow) setTab('view')
    },
    [narrow, setSelectedId],
  )

  const step = useCallback(
    (delta: number) => {
      const index = catalog.specs.findIndex((s) => s.id === spec.id)
      const next =
        catalog.specs[(index + delta + catalog.specs.length) % catalog.specs.length]
      select(next.id)
    },
    [catalog.specs, select, spec.id],
  )

  const onResetRef = useCallback((reset: () => void) => {
    resetRef.current = reset
  }, [])

  const controls = (
    <Controls
      options={options}
      onChange={patchOptions}
      autoRotate={autoRotate.on}
      onAutoRotateChange={(on) => setAutoRotate({ on })}
      showDual={showDual}
      onShowDualChange={setShowDual}
      onReset={() => resetRef.current()}
    />
  )

  const viewer = (
    <Viewer
      polyhedron={polyhedron}
      options={options}
      autoRotate={autoRotate.on}
      onResetRef={onResetRef}
    />
  )

  const header = (
    <header className="flex shrink-0 items-center gap-2 border-b border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-3 py-2">
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous polyhedron"
        className="rounded-md border border-[var(--color-surface-border)] px-2.5 py-1 text-slate-300 hover:bg-white/10"
      >
        ‹
      </button>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-sm font-semibold text-slate-100">
          {showDual ? `Dual of ${spec.name}` : spec.name}
        </p>
        <p className="truncate text-[11px] text-slate-500">
          {spec.categoryPath.join(' › ')}
        </p>
      </div>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next polyhedron"
        className="rounded-md border border-[var(--color-surface-border)] px-2.5 py-1 text-slate-300 hover:bg-white/10"
      >
        ›
      </button>
    </header>
  )

  if (narrow) {
    return (
      <div className="flex h-full flex-col bg-[var(--color-surface)]">
        {header}
        <main className="relative min-h-0 flex-1">
          <div className={tab === 'view' ? 'h-full w-full' : 'hidden'}>{viewer}</div>
          {tab === 'browse' && (
            <div className="h-full overflow-hidden">
              <Browser catalog={catalog} selectedId={spec.id} onSelect={select} />
            </div>
          )}
          {tab === 'info' && (
            <div className="h-full overflow-y-auto">
              <InfoPanel
          spec={spec}
          polyhedron={polyhedron}
          metrics={metrics}
          isDual={showDual}
        />
            </div>
          )}
          {tab === 'options' && (
            <div className="h-full overflow-y-auto">{controls}</div>
          )}
        </main>
        <nav className="flex shrink-0 border-t border-[var(--color-surface-border)] bg-[var(--color-surface-raised)]">
          {(['view', 'browse', 'info', 'options'] as MobileTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-medium capitalize ${
                tab === t ? 'text-sky-300' : 'text-slate-500'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-[var(--color-surface)]">
      <aside className="flex w-72 shrink-0 flex-col border-r border-[var(--color-surface-border)] bg-[var(--color-surface-raised)]">
        <div className="shrink-0 border-b border-[var(--color-surface-border)] px-4 py-3">
          <h1 className="text-sm font-semibold tracking-wide text-slate-100">
            Polyhedron Explorer
          </h1>
          <p className="text-[11px] text-slate-500">v{__APP_VERSION__}</p>
        </div>
        <Browser catalog={catalog} selectedId={spec.id} onSelect={select} />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        {header}
        <div className="min-h-0 flex-1">{viewer}</div>
      </main>

      <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-[var(--color-surface-border)] bg-[var(--color-surface-raised)]">
        <InfoPanel
          spec={spec}
          polyhedron={polyhedron}
          metrics={metrics}
          isDual={showDual}
        />
        <div className="border-t border-[var(--color-surface-border)]">{controls}</div>
      </aside>
    </div>
  )
}
