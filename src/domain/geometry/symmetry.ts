import { computeEdges, type Polyhedron } from './polyhedron'
import {
  cross,
  distance,
  dot,
  normalize,
  sub,
  type Vec3,
} from './vector'

export type Mat3 = readonly [Vec3, Vec3, Vec3]

export function applyMat(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ]
}

export function multiplyMat(a: Mat3, b: Mat3): Mat3 {
  const out: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) out[i][j] += a[i][k] * b[k][j]
    }
  }
  return out.map((r) => r as unknown as Vec3) as unknown as Mat3
}

export function determinant(m: Mat3): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  )
}

export function transpose(m: Mat3): Mat3 {
  return [
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]],
  ]
}

/** An orthonormal frame anchored at `a` and oriented towards `b`. */
function frame(a: Vec3, b: Vec3): Mat3 | null {
  const e1 = normalize(a)
  const t = sub(b, a)
  const proj = sub(t, [e1[0] * dot(t, e1), e1[1] * dot(t, e1), e1[2] * dot(t, e1)])
  if (Math.hypot(...proj) < 1e-9) return null
  const e2 = normalize(proj)
  const e3 = cross(e1, e2)
  // Column-major: the columns are e1, e2, e3.
  return [
    [e1[0], e2[0], e3[0]],
    [e1[1], e2[1], e3[1]],
    [e1[2], e2[2], e3[2]],
  ]
}

function mapsVertexSet(m: Mat3, vertices: readonly Vec3[], tol: number): boolean {
  for (const v of vertices) {
    const w = applyMat(m, v)
    let found = false
    for (const u of vertices) {
      if (distance(u, w) < tol) {
        found = true
        break
      }
    }
    if (!found) return false
  }
  return true
}

function matKey(m: Mat3): string {
  return m
    .flatMap((row) => row.map((x) => (Math.abs(x) < 1e-6 ? 0 : x).toFixed(5)))
    .join(',')
}

/**
 * All rotations (proper, det = +1) that map the polyhedron's vertex set onto
 * itself. Found by matching orthonormal frames anchored at an edge, which is
 * exact enough for every model the catalog builds.
 *
 * Used to form compounds as orbits of a sub-solid, and available for future
 * symmetry-driven features such as stellation and faceting.
 */
export function rotationGroup(poly: Polyhedron, tol = 1e-4): Mat3[] {
  const v = poly.vertices
  if (v.length < 3) return []
  const edges = computeEdges(poly)
  const adjacency = v.map(() => new Set<number>())
  for (const e of edges) {
    adjacency[e.a].add(e.b)
    adjacency[e.b].add(e.a)
  }

  const a0 = 0
  const b0 = [...adjacency[a0]][0]
  const base = frame(v[a0], v[b0])
  if (!base) return []
  const baseInv = transpose(base)

  const found = new Map<string, Mat3>()
  for (let a = 0; a < v.length; a++) {
    if (Math.abs(Math.hypot(...v[a]) - Math.hypot(...v[a0])) > tol) continue
    for (const b of adjacency[a]) {
      for (const c of adjacency[a]) {
        if (c === b) continue
        const f = frame(v[a], v[b])
        if (!f) continue
        const m = multiplyMat(f, baseInv)
        if (determinant(m) < 0) continue
        if (!mapsVertexSet(m, v, tol * 10)) continue
        const key = matKey(m)
        if (!found.has(key)) found.set(key, m)
      }
    }
  }
  return [...found.values()]
}

export function transform(poly: Polyhedron, m: Mat3): Polyhedron {
  return {
    vertices: poly.vertices.map((v) => applyMat(m, v)),
    faces: poly.faces,
  }
}

/** Combine several polyhedra into one model, offsetting face indices. */
export function merge(parts: readonly Polyhedron[]): Polyhedron {
  const vertices: Vec3[] = []
  const faces: number[][] = []
  for (const part of parts) {
    const offset = vertices.length
    vertices.push(...part.vertices)
    for (const f of part.faces) faces.push(f.map((i) => i + offset))
  }
  return { vertices, faces }
}

/**
 * Distinct images of `piece` under `rotations`, compared by vertex set so that
 * a copy mapped onto itself is counted only once.
 */
export function distinctOrbit(
  piece: Polyhedron,
  rotations: readonly Mat3[],
  tol = 1e-4,
): Polyhedron[] {
  const out: Polyhedron[] = []
  const keys = new Set<string>()
  for (const m of rotations) {
    const moved = transform(piece, m)
    const key = moved.vertices
      .map((v) => v.map((x) => (Math.abs(x) < tol ? 0 : x).toFixed(4)).join(','))
      .sort()
      .join(';')
    if (keys.has(key)) continue
    keys.add(key)
    out.push(moved)
  }
  return out
}
