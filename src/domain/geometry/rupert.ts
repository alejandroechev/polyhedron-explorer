import { computeEdges, faceInfos, type Polyhedron } from './polyhedron'
import { dot, length, polygonNormal, sub, type Vec3 } from './vector'

type Point = readonly [number, number]

export interface RupertPassage {
  readonly host: Polyhedron
  readonly traveller: Polyhedron
  readonly opening: readonly Point[]
  readonly clearance: number
}

export type RupertResult =
  | { readonly status: 'available'; readonly passage: RupertPassage }
  | { readonly status: 'unsupported' | 'not-found'; readonly message: string }

// Catalog coordinates are rounded; this is still far below the required gap.
const TOLERANCE = 1e-6
const MIN_CLEARANCE = 0.0002

function turn(a: Point, b: Point, c: Point): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

export function projectionHull(vertices: readonly Vec3[]): Point[] {
  const points = vertices.map(([x, y]): Point => [x, y])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const half = (input: Point[]) => {
    const hull: Point[] = []
    for (const p of input) {
      while (hull.length >= 2 && turn(hull[hull.length - 2], hull[hull.length - 1], p) <= 1e-12) hull.pop()
      hull.push(p)
    }
    return hull.slice(0, -1)
  }
  return [...half(points), ...half([...points].reverse())]
}

/** Positive only when every inner vertex is strictly inside the outer projection. */
export function projectionClearance(outer: readonly Point[], inner: readonly Point[]): number {
  let margin = Infinity
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i]
    const b = outer[(i + 1) % outer.length]
    const edgeLength = Math.hypot(b[0] - a[0], b[1] - a[1])
    for (const p of inner) margin = Math.min(margin, turn(a, b, p) / edgeLength)
  }
  return margin
}

function rotated(poly: Polyhedron, angles: readonly number[], x = 0, y = 0): Polyhedron {
  const [a, b, c] = angles
  const [sa, ca, sb, cb, sc, cc] = [Math.sin(a), Math.cos(a), Math.sin(b), Math.cos(b), Math.sin(c), Math.cos(c)]
  return {
    faces: poly.faces,
    vertices: poly.vertices.map(([vx, vy, vz]): Vec3 => {
      const y1 = ca * vy - sa * vz
      const z1 = sa * vy + ca * vz
      const x2 = cb * vx + sb * z1
      return [cc * x2 - sc * y1 + x, sc * x2 + cc * y1 + y, -sb * vx + cb * z1]
    }),
  }
}

export function isConvexSolid(poly: Polyhedron): boolean {
  if (poly.vertices.length < 4 || poly.faces.length < 4 ||
    poly.vertices.some((v) => v.some((n) => !Number.isFinite(n)))) return false
  const infos = faceInfos(poly)
  if (infos.some((f) => f.density !== 1 || length(f.normal) < 0.9 ||
    poly.vertices.some((v) => dot(f.normal, sub(v, f.center)) > TOLERANCE) ||
    poly.faces[f.index].some((i) => Math.abs(dot(f.normal, sub(poly.vertices[i], f.center))) > TOLERANCE))) return false
  const edges = computeEdges(poly)
  return poly.vertices.length - edges.length + poly.faces.length === 2 &&
    edges.every(({ a, b }) => poly.faces.filter((f) => f.some((v, i) =>
      (v === a && f[(i + 1) % f.length] === b) ||
      (v === b && f[(i + 1) % f.length] === a))).length === 2)
}

/**
 * Search the projection-containment criterion with deterministic, restarted
 * Nelder-Mead optimization. Failure of this bounded search is not a disproof.
 * See https://chrisjones.id.au/Rupert/index.html for the geometric criterion.
 */
export function findRupertPassage(poly: Polyhedron, restarts = 48): RupertResult {
  if (!isConvexSolid(poly)) return {
    status: 'unsupported',
    message: 'Passage search supports closed convex solids, not star shapes, compounds or non-convex models.',
  }
  let seed = 1729
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const evaluate = (p: number[]) => {
    const host = rotated(poly, p.slice(0, 3))
    const traveller = rotated(poly, p.slice(3, 6), p[6], p[7])
    return -projectionClearance(projectionHull(host.vertices), traveller.vertices.map(([x, y]) => [x, y]))
  }
  const candidate = (p: number[]) => ({ p, score: evaluate(p) })
  for (let restart = 0; restart < restarts; restart++) {
    const initial = Array.from({ length: 8 }, (_, i) => i < 6 ? random() * Math.PI * 2 : 0)
    const simplex = [candidate(initial), ...initial.map((_, i) =>
      candidate(initial.map((v, j) => v + (i === j ? (i < 6 ? 0.25 : 0.08) : 0))))]
    for (let step = 0; step < 1000; step++) {
      simplex.sort((a, b) => a.score - b.score)
      const converged = step > 100 && Math.max(...simplex.map((v) => Math.abs(v.score - simplex[0].score))) < 1e-9
      if (simplex[0].score < -0.01 ||
        ((converged || step === 999) && simplex[0].score < -MIN_CLEARANCE)) {
        const p = simplex[0].p
        const host = rotated(poly, p.slice(0, 3))
        const traveller = rotated(poly, p.slice(3, 6), p[6], p[7])
        const hull = projectionHull(traveller.vertices)
        const cx = hull.reduce((sum, [x]) => sum + x, 0) / hull.length
        const cy = hull.reduce((sum, [, y]) => sum + y, 0) / hull.length
        const radius = Math.max(...hull.map(([x, y]) => Math.hypot(x - cx, y - cy)))
        const padding = -simplex[0].score / (4 * radius)
        const opening = hull.map(([x, y]): Point => [
          cx + (x - cx) * (1 + padding),
          cy + (y - cy) * (1 + padding),
        ])
        return { status: 'available', passage: {
          host, traveller, opening,
          clearance: projectionClearance(projectionHull(host.vertices), opening),
        } }
      }
      const best = simplex[0]
      const worst = simplex[8]
      const center = initial.map((_, i) => simplex.slice(0, 8).reduce((sum, v) => sum + v.p[i], 0) / 8)
      const move = (factor: number) => candidate(center.map((v, i) => v + factor * (v - worst.p[i])))
      const reflected = move(1)
      if (reflected.score < best.score) {
        const expanded = move(2)
        simplex[8] = expanded.score < reflected.score ? expanded : reflected
      } else if (reflected.score < simplex[7].score) {
        simplex[8] = reflected
      } else {
        const outside = reflected.score < worst.score
        const contracted = move(outside ? 0.5 : -0.5)
        if (contracted.score < (outside ? reflected.score : worst.score)) simplex[8] = contracted
        else for (let i = 1; i < simplex.length; i++) {
          simplex[i] = candidate(simplex[i].p.map((v, j) => (v + best.p[j]) / 2))
        }
      }
      if (converged) break
    }
  }
  return { status: 'not-found', message: 'No passage found in this bounded search. This does not mean the polyhedron lacks the Rupert property.' }
}

function clip(points: readonly Vec3[], normal: Vec3, limit: number): Vec3[] {
  const result: Vec3[] = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const da = dot(normal, a) - limit
    const db = dot(normal, b) - limit
    if (da <= 0) result.push(a)
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db)
      result.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])])
    }
  }
  return result
}

/** Subtract the infinite convex tunnel, including the newly exposed inner walls. */
export function piercedHost({ host, opening }: RupertPassage): Polyhedron {
  const vertices: Vec3[] = []
  const faces: number[][] = []
  const append = (points: Vec3[]) => {
    if (points.length < 3 || length(polygonNormal(points)) < 0.9) return
    faces.push(points.map((p) => vertices.push(p) - 1))
  }
  const planes = opening.map((a, i) => {
    const b = opening[(i + 1) % opening.length]
    const normal: Vec3 = [b[1] - a[1], a[0] - b[0], 0]
    return { normal, limit: normal[0] * a[0] + normal[1] * a[1] }
  })
  for (const face of host.faces) {
    let remaining = face.map((i) => host.vertices[i])
    for (const { normal, limit } of planes) {
      append(clip(remaining, [-normal[0], -normal[1], 0], -limit))
      remaining = clip(remaining, normal, limit)
    }
  }
  const extent = Math.max(...host.vertices.map((v) => Math.abs(v[2]))) + 1
  const infos = faceInfos(host)
  opening.forEach((a, i) => {
    const b = opening[(i + 1) % opening.length]
    let wall: Vec3[] = [[a[0], a[1], -extent], [a[0], a[1], extent], [b[0], b[1], extent], [b[0], b[1], -extent]]
    for (const info of infos) wall = clip(wall, info.normal, dot(info.normal, info.center))
    append(wall)
  })
  return { vertices, faces }
}

/** A smooth return trip, with both endpoints fully outside the host. */
export function passagePosition(seconds: number): number {
  return -2.5 * Math.cos(seconds * Math.PI / 6)
}
