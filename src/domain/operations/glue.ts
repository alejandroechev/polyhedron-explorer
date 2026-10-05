import { weld, type Polyhedron } from '../geometry/polyhedron'
import { applyMat, determinant, type Mat3 } from '../geometry/symmetry'
import {
  add,
  centroid,
  cross,
  distance,
  normalize,
  polygonNormal,
  sub,
  type Vec3,
} from '../geometry/vector'

/** A rigid motion `v -> m v + t`. */
export interface Rigid {
  readonly m: Mat3
  readonly t: Vec3
}

export const IDENTITY: Rigid = {
  m: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  t: [0, 0, 0],
}

export function applyRigid(r: Rigid, v: Vec3): Vec3 {
  return add(applyMat(r.m, v), r.t)
}

/** The motion that applies `b` first and then `a`. */
export function composeRigid(a: Rigid, b: Rigid): Rigid {
  const m: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) m[i][j] += a.m[i][k] * b.m[k][j]
    }
  }
  return {
    m: m.map((row) => row as unknown as Vec3) as unknown as Mat3,
    t: add(applyMat(a.m, b.t), a.t),
  }
}

export function transformPoly(poly: Polyhedron, r: Rigid): Polyhedron {
  const vertices = poly.vertices.map((v) => applyRigid(r, v))
  // A reflection flips every loop's winding, so undo it to keep normals out.
  const faces =
    determinant(r.m) < 0 ? poly.faces.map((f) => [...f].reverse()) : poly.faces
  return { vertices, faces }
}

/** Right-handed frame with `e1` towards `ref` and `e3` along `normal`. */
function frameOf(origin: Vec3, ref: Vec3, normal: Vec3): Mat3 {
  const e3 = normalize(normal)
  const e1 = normalize(sub(ref, origin))
  const e2 = cross(e3, e1)
  // Column-major: the columns are e1, e2, e3.
  return [
    [e1[0], e2[0], e3[0]],
    [e1[1], e2[1], e3[1]],
    [e1[2], e2[2], e3[2]],
  ]
}

function transposeMat(m: Mat3): Mat3 {
  return [
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]],
  ]
}

function multiply(a: Mat3, b: Mat3): Mat3 {
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
  return out.map((row) => row as unknown as Vec3) as unknown as Mat3
}

/**
 * The rigid motion that lands face `a` of `poly` exactly on face `b`, with the
 * two loops running opposite ways so the copies sit on opposite sides of the
 * shared polygon. `offset` picks which vertex of `b` receives vertex 0 of `a`,
 * which is what lets a chain of copies turn at different angles.
 *
 * Returns null when the two faces are not congruent under that pairing.
 */
export function faceMatchTransform(
  poly: Polyhedron,
  a: number,
  b: number,
  offset = 0,
  tol = 1e-6,
): Rigid | null {
  const fa = poly.faces[a]
  const fb = poly.faces[b]
  if (fa.length !== fb.length) return null
  const k = fa.length

  const pa = fa.map((i) => poly.vertices[i])
  // Face b walked backwards, so the glued loops cancel.
  const target: Vec3[] = []
  for (let i = 0; i < k; i++) {
    target.push(poly.vertices[fb[(((offset - i) % k) + k) % k]])
  }

  const ca = centroid(pa)
  const ct = centroid(target)
  const fromFrame = frameOf(ca, pa[0], polygonNormal(pa))
  const toFrame = frameOf(ct, target[0], polygonNormal(target))
  const m = multiply(toFrame, transposeMat(fromFrame))
  const t = sub(ct, applyMat(m, ca))
  const motion: Rigid = { m, t }

  for (let i = 0; i < k; i++) {
    if (distance(applyRigid(motion, pa[i]), target[i]) > tol) return null
  }
  return motion
}

export function isIdentity(r: Rigid, tol = 1e-6): boolean {
  for (let i = 0; i < 3; i++) {
    if (Math.abs(r.t[i]) > tol) return false
    for (let j = 0; j < 3; j++) {
      if (Math.abs(r.m[i][j] - (i === j ? 1 : 0)) > tol) return false
    }
  }
  return true
}

export interface RingSpec {
  /** The regular-faced solid that is repeated. */
  readonly solid: Polyhedron
  /** Face each copy is glued to its predecessor by. */
  readonly entry: number
  /** Face each copy hands on to its successor. */
  readonly exit: number
  /** Which vertex of `exit` receives vertex 0 of `entry`. */
  readonly offset?: number
  /** How many copies close the ring. */
  readonly count: number
}

/**
 * Place `count` copies of a solid nose-to-tail, each glued to the previous by
 * its entry face. Returns null when the chain fails to close into a ring.
 */
export function ringPlacements(spec: RingSpec, tol = 1e-6): Polyhedron[] | null {
  const { solid, entry, exit, offset = 0, count } = spec
  const step = faceMatchTransform(solid, entry, exit, offset, tol)
  if (!step) return null

  let motion = IDENTITY
  const parts: Polyhedron[] = []
  for (let copy = 0; copy < count; copy++) {
    parts.push(transformPoly(solid, motion))
    motion = composeRigid(motion, step)
  }
  return isIdentity(motion, 1e-4) ? parts : null
}

/**
 * Glue `count` copies of a solid nose-to-tail into a closed ring and drop the
 * glued faces, giving a toroid. Returns null when the chain fails to close up
 * exactly, or when copies collide instead of meeting face to face.
 */
export function ringToroid(spec: RingSpec, tol = 1e-6): Polyhedron | null {
  const { solid, entry, exit } = spec
  const parts = ringPlacements(spec, tol)
  if (!parts) return null

  const vertices: Vec3[] = []
  const faces: number[][] = []
  for (const placed of parts) {
    const base = vertices.length
    vertices.push(...placed.vertices)
    for (const [index, face] of placed.faces.entries()) {
      // The entry and exit faces end up buried inside the ring.
      if (index === entry || index === exit) continue
      faces.push(face.map((i) => i + base))
    }
  }

  const welded = weld({ vertices, faces }, 1e-4)
  // Each junction fuses one face's worth of vertices; anything more means two
  // copies overlapped, which would not be a valid surface.
  const expected = parts.length * (solid.vertices.length - solid.faces[entry].length)
  if (welded.vertices.length !== expected) return null
  return welded
}
