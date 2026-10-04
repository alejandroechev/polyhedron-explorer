import earcut from 'earcut'

import {
  centroid,
  cross,
  dot,
  normalize,
  polygonNormal,
  sub,
  type Vec3,
} from './vector'

export interface PlaneBasis {
  readonly origin: Vec3
  readonly u: Vec3
  readonly v: Vec3
  readonly normal: Vec3
}

/** An orthonormal frame for the plane a face lies in. */
export function planeBasis(points: readonly Vec3[]): PlaneBasis {
  const normal = polygonNormal(points)
  const origin = centroid(points)
  const seed: Vec3 =
    Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  const u = normalize(cross(normal, seed))
  const v = cross(normal, u)
  return { origin, u, v, normal }
}

export function toPlane(p: Vec3, basis: PlaneBasis): [number, number] {
  const d = sub(p, basis.origin)
  return [dot(d, basis.u), dot(d, basis.v)]
}

export function fromPlane(p: readonly [number, number], basis: PlaneBasis): Vec3 {
  return [
    basis.origin[0] + basis.u[0] * p[0] + basis.v[0] * p[1],
    basis.origin[1] + basis.u[1] * p[0] + basis.v[1] * p[1],
    basis.origin[2] + basis.u[2] * p[0] + basis.v[2] * p[1],
  ]
}

type P2 = [number, number]

function segmentIntersection(
  a: P2,
  b: P2,
  c: P2,
  d: P2,
): { t: number; s: number; point: P2 } | null {
  const r: P2 = [b[0] - a[0], b[1] - a[1]]
  const s: P2 = [d[0] - c[0], d[1] - c[1]]
  const denom = r[0] * s[1] - r[1] * s[0]
  if (Math.abs(denom) < 1e-12) return null
  const qp: P2 = [c[0] - a[0], c[1] - a[1]]
  const t = (qp[0] * s[1] - qp[1] * s[0]) / denom
  const u = (qp[0] * r[1] - qp[1] * r[0]) / denom
  const tol = 1e-9
  if (t <= tol || t >= 1 - tol || u <= tol || u >= 1 - tol) return null
  return { t, s: u, point: [a[0] + r[0] * t, a[1] + r[1] * t] }
}

/**
 * Trace the outer boundary of a self-intersecting (star) polygon. At every
 * self-intersection the walk switches to the crossing edge, which is exactly
 * how the visible outline of a regular star polygon is formed.
 */
export function starOutline(points: readonly P2[]): P2[] {
  const n = points.length
  const edge = (i: number): [P2, P2] => [points[i], points[(i + 1) % n]]

  // For each edge, every crossing sorted along the edge.
  const crossings: { t: number; s: number; point: P2; other: number }[][] = []
  for (let i = 0; i < n; i++) crossings.push([])
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue
      const [a, b] = edge(i)
      const [c, d] = edge(j)
      const hit = segmentIntersection(a, b, c, d)
      if (!hit) continue
      crossings[i].push({ t: hit.t, s: hit.s, point: hit.point, other: j })
      crossings[j].push({ t: hit.s, s: hit.t, point: hit.point, other: i })
    }
  }
  for (const list of crossings) list.sort((x, y) => x.t - y.t)

  const outline: P2[] = []
  let currentEdge = 0
  let currentT = 0
  const maxSteps = n * 8
  for (let step = 0; step < maxSteps; step++) {
    const next = crossings[currentEdge].find((c) => c.t > currentT + 1e-9)
    if (!next) {
      // Reached the edge's end vertex; continue on the following edge.
      const endVertex = points[(currentEdge + 1) % n]
      outline.push(endVertex)
      currentEdge = (currentEdge + 1) % n
      currentT = 0
    } else {
      outline.push(next.point)
      currentEdge = next.other
      currentT = next.s
    }
    if (
      outline.length > 2 &&
      Math.abs(outline[0][0] - outline[outline.length - 1][0]) < 1e-9 &&
      Math.abs(outline[0][1] - outline[outline.length - 1][1]) < 1e-9
    ) {
      outline.pop()
      break
    }
    if (currentEdge === 0 && currentT === 0 && step > 0) break
  }
  return outline
}

/**
 * Ear clipping for a simple polygon, delegated to `earcut` so that the
 * near-collinear vertices produced by star outlines are handled robustly.
 * Returns index triples into `poly`.
 */
export function earClip(poly: readonly P2[]): [number, number, number][] {
  if (poly.length < 3) return []
  const flat: number[] = []
  for (const p of poly) flat.push(p[0], p[1])
  const indices = earcut(flat)
  const triangles: [number, number, number][] = []
  for (let i = 0; i < indices.length; i += 3) {
    triangles.push([indices[i], indices[i + 1], indices[i + 2]])
  }
  return triangles
}

/**
 * Triangulate one face into world-space triangle vertex positions.
 *
 * Convex faces are fanned from the centroid. Star faces (density > 1) are
 * first reduced to their visible outline, then ear-clipped, so a pentagram
 * renders as a five-pointed star rather than a filled pentagon.
 */
export function triangulateFace(points: readonly Vec3[], density = 1): Vec3[] {
  if (points.length < 3) return []

  if (density <= 1) {
    const c = centroid(points)
    const out: Vec3[] = []
    for (let i = 0; i < points.length; i++) {
      out.push(c, points[i], points[(i + 1) % points.length])
    }
    return out
  }

  const basis = planeBasis(points)
  const flat = points.map((p) => toPlane(p, basis))
  const outline = starOutline(flat)
  if (outline.length < 3) {
    const c = centroid(points)
    const out: Vec3[] = []
    for (let i = 0; i < points.length; i++) {
      out.push(c, points[i], points[(i + 1) % points.length])
    }
    return out
  }
  const tris = earClip(outline)
  const out: Vec3[] = []
  for (const [a, b, c] of tris) {
    out.push(
      fromPlane(outline[a], basis),
      fromPlane(outline[b], basis),
      fromPlane(outline[c], basis),
    )
  }
  return out
}
