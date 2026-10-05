import {
  centroid,
  cross,
  distance,
  dot,
  EPS,
  length,
  polygonNormal,
  sub,
  type Vec3,
} from './vector'

/**
 * A polyhedron is stored as a vertex list plus faces given as ordered vertex
 * index loops. Faces may be star polygons (e.g. pentagrams), so nothing here
 * assumes convexity.
 */
export interface Polyhedron {
  readonly vertices: readonly Vec3[]
  /** Ordered index loops. Winding is counter-clockwise seen from outside. */
  readonly faces: readonly (readonly number[])[]
}

export interface Edge {
  readonly a: number
  readonly b: number
}

export interface FaceInfo {
  readonly index: number
  readonly sides: number
  readonly normal: Vec3
  readonly center: Vec3
  readonly area: number
  /** Star density: 1 for convex polygons, 2 for pentagrams, etc. */
  readonly density: number
}

export interface PolyhedronMetrics {
  readonly vertexCount: number
  readonly edgeCount: number
  readonly faceCount: number
  readonly eulerCharacteristic: number
  /** Genus for orientable surfaces with V-E+F = 2-2g. Null when non-integral. */
  readonly genus: number | null
  readonly surfaceArea: number
  readonly volume: number
  readonly circumradius: number
  readonly inradius: number
  readonly midradius: number
  /** Map of "number of sides" -> "how many faces have that many sides". */
  readonly faceTypes: ReadonlyMap<number, number>
  /**
   * Face counts keyed by Schläfli-style polygon symbol: "5" for pentagons,
   * "5/2" for pentagrams.
   */
  readonly faceSymbols: ReadonlyMap<string, number>
  /** Distinct edge lengths, rounded, ascending. */
  readonly edgeLengths: readonly number[]
  readonly isRegularFaced: boolean
}

export function edgeKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

/** Unique undirected edges, derived from the face loops. */
export function computeEdges(poly: Polyhedron): Edge[] {
  const seen = new Map<string, Edge>()
  for (const face of poly.faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i]
      const b = face[(i + 1) % face.length]
      if (a === b) continue
      const key = edgeKey(a, b)
      if (!seen.has(key)) seen.set(key, { a: Math.min(a, b), b: Math.max(a, b) })
    }
  }
  return [...seen.values()]
}

/**
 * Area of a (possibly star or crossed) polygon, measured in its own plane by
 * fanning from the centroid and summing the triangle areas without sign. For
 * star polygons this counts overlapped regions with multiplicity, which is the
 * convention used for polyhedral surface area; for crossed quadrilaterals such
 * as the butterfly faces of a stephanoid it gives the sum of the two lobes
 * rather than their signed difference.
 */
export function faceArea(points: readonly Vec3[]): number {
  if (points.length < 3) return 0
  const c = centroid(points)
  let total = 0
  for (let i = 0; i < points.length; i++) {
    const u = sub(points[i], c)
    const v = sub(points[(i + 1) % points.length], c)
    total += length(cross(u, v)) / 2
  }
  return total
}

/**
 * Star density of a face: how many times the polygon winds around its own
 * centre. A pentagon gives 1, a pentagram 2.
 */
export function faceDensity(points: readonly Vec3[]): number {
  if (points.length < 3) return 1
  const c = centroid(points)
  const n = polygonNormal(points)
  let total = 0
  for (let i = 0; i < points.length; i++) {
    const u = sub(points[i], c)
    const v = sub(points[(i + 1) % points.length], c)
    const lu = length(u)
    const lv = length(v)
    if (lu < EPS || lv < EPS) continue
    const cosA = Math.min(1, Math.max(-1, dot(u, v) / (lu * lv)))
    const sign = Math.sign(dot(cross(u, v), n)) || 1
    total += sign * Math.acos(cosA)
  }
  return Math.max(1, Math.round(Math.abs(total) / (2 * Math.PI)))
}

export function faceInfos(poly: Polyhedron): FaceInfo[] {
  return poly.faces.map((face, index) => {
    const points = face.map((i) => poly.vertices[i])
    return {
      index,
      sides: face.length,
      normal: polygonNormal(points),
      center: centroid(points),
      area: faceArea(points),
      density: faceDensity(points),
    }
  })
}

/**
 * Volume via the divergence theorem, summing signed tetrahedra from the
 * origin. Faces are fanned from their centroid so star faces contribute
 * correctly.
 */
export function volume(poly: Polyhedron): number {
  let total = 0
  for (const face of poly.faces) {
    const points = face.map((i) => poly.vertices[i])
    const c = centroid(points)
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      const q = points[(i + 1) % points.length]
      total += dot(c, cross(p, q)) / 6
    }
  }
  return Math.abs(total)
}

function roundTo(value: number, places: number): number {
  const f = 10 ** places
  return Math.round(value * f) / f
}

export function computeMetrics(poly: Polyhedron): PolyhedronMetrics {
  const edges = computeEdges(poly)
  const infos = faceInfos(poly)
  const origin: Vec3 = [0, 0, 0]

  const faceTypes = new Map<number, number>()
  const faceSymbols = new Map<string, number>()
  for (const info of infos) {
    faceTypes.set(info.sides, (faceTypes.get(info.sides) ?? 0) + 1)
    const symbol =
      info.density > 1 ? `${info.sides}/${info.density}` : `${info.sides}`
    faceSymbols.set(symbol, (faceSymbols.get(symbol) ?? 0) + 1)
  }

  const radii = poly.vertices.map((v) => distance(v, origin))
  const circumradius = radii.length ? Math.max(...radii) : 0

  const inradius = infos.length
    ? Math.min(...infos.map((f) => Math.abs(dot(f.normal, f.center))))
    : 0

  const midradii = edges.map((e) => {
    const mid = centroid([poly.vertices[e.a], poly.vertices[e.b]])
    return distance(mid, origin)
  })
  const midradius = midradii.length
    ? midradii.reduce((a, b) => a + b, 0) / midradii.length
    : 0

  // Cluster with a relative tolerance: the source coordinates are only good to
  // about six digits, so exact comparison would split a single edge length.
  const sorted = edges
    .map((e) => distance(poly.vertices[e.a], poly.vertices[e.b]))
    .sort((a, b) => a - b)
  const edgeLengths: number[] = []
  for (const l of sorted) {
    const last = edgeLengths[edgeLengths.length - 1]
    if (last == null || Math.abs(l - last) > 1e-3 * Math.max(1, last)) {
      edgeLengths.push(roundTo(l, 4))
    }
  }

  const euler = poly.vertices.length - edges.length + poly.faces.length
  const genusRaw = (2 - euler) / 2
  const genus = Number.isInteger(genusRaw) ? genusRaw : null

  return {
    vertexCount: poly.vertices.length,
    edgeCount: edges.length,
    faceCount: poly.faces.length,
    eulerCharacteristic: euler,
    genus,
    surfaceArea: infos.reduce((a, f) => a + f.area, 0),
    volume: volume(poly),
    circumradius,
    inradius,
    midradius,
    faceTypes,
    faceSymbols,
    edgeLengths,
    isRegularFaced: edgeLengths.length === 1,
  }
}

/** Uniform scale so the outermost vertex sits at `radius`. */
export function normalizeScale(poly: Polyhedron, radius = 1): Polyhedron {
  const max = poly.vertices.reduce((m, v) => Math.max(m, length(v)), 0)
  if (max < EPS) return poly
  const k = radius / max
  return {
    vertices: poly.vertices.map((v) => [v[0] * k, v[1] * k, v[2] * k] as Vec3),
    faces: poly.faces,
  }
}

/** Translate so the vertex centroid sits at the origin. */
export function center(poly: Polyhedron): Polyhedron {
  const c = centroid(poly.vertices)
  if (length(c) < EPS) return poly
  return {
    vertices: poly.vertices.map((v) => sub(v, c)),
    faces: poly.faces,
  }
}

/**
 * Merge vertices that coincide within `eps` and drop degenerate faces.
 * Generated models (compounds, subdivisions) routinely produce duplicates.
 */
export function weld(poly: Polyhedron, eps = 1e-6): Polyhedron {
  const vertices: Vec3[] = []
  const remap: number[] = []
  const grid = new Map<string, number[]>()
  const cell = (v: Vec3) =>
    `${Math.round(v[0] / eps)}|${Math.round(v[1] / eps)}|${Math.round(v[2] / eps)}`

  for (const v of poly.vertices) {
    let found = -1
    const [cx, cy, cz] = cell(v).split('|').map(Number)
    outer: for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const bucket = grid.get(`${cx + dx}|${cy + dy}|${cz + dz}`)
          if (!bucket) continue
          for (const i of bucket) {
            if (distance(vertices[i], v) < eps) {
              found = i
              break outer
            }
          }
        }
      }
    }
    if (found < 0) {
      found = vertices.length
      vertices.push(v)
      const key = cell(v)
      const bucket = grid.get(key)
      if (bucket) bucket.push(found)
      else grid.set(key, [found])
    }
    remap.push(found)
  }

  const faces: number[][] = []
  for (const face of poly.faces) {
    const mapped: number[] = []
    for (const i of face) {
      const m = remap[i]
      if (mapped.length === 0 || mapped[mapped.length - 1] !== m) mapped.push(m)
    }
    while (mapped.length > 1 && mapped[0] === mapped[mapped.length - 1]) mapped.pop()
    if (mapped.length >= 3) faces.push(mapped)
  }

  return { vertices, faces }
}

/**
 * Flip any face whose winding points inward. Only meaningful for star-shaped
 * (origin-visible) solids, which covers every model the catalog generates.
 */
export function orientOutward(poly: Polyhedron): Polyhedron {
  const faces = poly.faces.map((face) => {
    const points = face.map((i) => poly.vertices[i])
    const n = polygonNormal(points)
    const c = centroid(points)
    return dot(n, c) < 0 ? [...face].reverse() : face
  })
  return { vertices: poly.vertices, faces }
}
