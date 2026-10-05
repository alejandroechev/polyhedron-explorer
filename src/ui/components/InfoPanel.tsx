import type { PolyhedronSpec } from '../../domain/catalog'
import type { Polyhedron, PolyhedronMetrics } from '../../domain/geometry/polyhedron'
import { componentCount } from '../../domain/geometry/components'

const POLYGON_NAMES: Record<number, string> = {
  3: 'triangles',
  4: 'squares',
  5: 'pentagons',
  6: 'hexagons',
  7: 'heptagons',
  8: 'octagons',
  9: 'enneagons',
  10: 'decagons',
  11: 'hendecagons',
  12: 'dodecagons',
}

const STAR_NAMES: Record<string, string> = {
  '5/2': 'pentagrams',
  '6/2': 'hexagrams',
  '7/2': 'heptagrams',
  '7/3': 'heptagrams {7/3}',
  '8/3': 'octagrams',
  '10/3': 'decagrams',
  '12/5': 'dodecagrams',
}

/** Turn a "5" or "5/2" face symbol into readable English. */
function polygonName(symbol: string): string {
  if (symbol.includes('/')) {
    return STAR_NAMES[symbol] ?? `star polygons {${symbol}}`
  }
  return POLYGON_NAMES[Number(symbol)] ?? `${symbol}-gons`
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-right text-sm text-slate-200">{value}</dd>
    </div>
  )
}

interface InfoPanelProps {
  readonly spec: PolyhedronSpec
  readonly polyhedron: Polyhedron
  readonly metrics: PolyhedronMetrics
  readonly isDual: boolean
}

/** Everything known about the model on screen. */
export default function InfoPanel({
  spec,
  polyhedron,
  metrics,
  isDual,
}: InfoPanelProps) {
  const pieces = componentCount(polyhedron)
  const faceBreakdown = [...metrics.faceSymbols]
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .map(([symbol, count]) => `${count} ${polygonName(symbol)}`)
    .join(', ')

  const fmt = (n: number) => (Math.round(n * 10000) / 10000).toLocaleString()

  return (
    <div className="space-y-4 p-4">
      <header>
        <h2 className="text-lg font-semibold text-slate-100">
          {isDual ? `Dual of ${spec.name}` : spec.name}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {spec.categoryPath.join(' › ')}
        </p>
        {spec.aka && spec.aka.length > 0 && (
          <p className="mt-1 text-xs text-slate-400">
            Also known as {spec.aka.join(', ')}.
          </p>
        )}
      </header>

      {spec.notes && !isDual && (
        <p className="text-sm leading-relaxed text-slate-400">{spec.notes}</p>
      )}

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Counts
        </h3>
        <dl className="divide-y divide-white/5">
          <Row label="Vertices" value={metrics.vertexCount} />
          <Row label="Edges" value={metrics.edgeCount} />
          <Row label="Faces" value={metrics.faceCount} />
          <Row label="Faces by type" value={faceBreakdown} />
          {pieces > 1 && <Row label="Pieces" value={pieces} />}
          <Row label="Euler χ" value={metrics.eulerCharacteristic} />
          {metrics.genus != null && metrics.genus > 0 && (
            <Row label="Genus" value={metrics.genus} />
          )}
        </dl>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Measurements
        </h3>
        <p className="mb-1 text-[11px] text-slate-600">
          Normalised to circumradius 1.
        </p>
        <dl className="divide-y divide-white/5">
          <Row
            label="Volume"
            value={metrics.volume > 1e-9 ? fmt(metrics.volume) : 'n/a (crossed faces)'}
          />
          <Row label="Surface area" value={fmt(metrics.surfaceArea)} />
          <Row label="Circumradius" value={fmt(metrics.circumradius)} />
          <Row label="Midradius" value={fmt(metrics.midradius)} />
          <Row label="Inradius" value={fmt(metrics.inradius)} />
          <Row
            label="Edge lengths"
            value={metrics.edgeLengths.slice(0, 4).map(fmt).join(', ')}
          />
          <Row
            label="Regular faced"
            value={metrics.isRegularFaced ? 'yes' : 'no'}
          />
        </dl>
      </section>

      {!isDual &&
        (spec.schlafli ||
          spec.wythoff ||
          spec.vertexConfiguration ||
          spec.symmetry) && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Symbols
            </h3>
            <dl className="divide-y divide-white/5">
              {spec.schlafli && <Row label="Schläfli" value={spec.schlafli} />}
              {spec.wythoff && <Row label="Wythoff" value={spec.wythoff} />}
              {spec.vertexConfiguration && (
                <Row label="Vertex figure" value={spec.vertexConfiguration} />
              )}
              {spec.symmetry && <Row label="Symmetry" value={spec.symmetry} />}
            </dl>
          </section>
        )}
    </div>
  )
}
