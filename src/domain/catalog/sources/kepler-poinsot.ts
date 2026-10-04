import {
  normalizeScale,
  orientOutward,
  type Polyhedron,
} from '../../geometry/polyhedron'
import {
  cross,
  distance,
  dot,
  normalize,
  sub,
  type Vec3,
} from '../../geometry/vector'
import { dual } from '../../operations/dual'
import type { CatalogSource, PolyhedronSpec } from '../types'
import { baseSolid } from './dataset'

/** Cyclically order coplanar `points` around `center`, seen along `axis`. */
function orderAround(
  points: readonly number[],
  vertices: readonly Vec3[],
  center: Vec3,
  axis: Vec3,
): number[] {
  const n = normalize(axis)
  const ref = normalize(sub(vertices[points[0]], center))
  const side = cross(n, ref)
  return [...points].sort((a, b) => {
    const da = sub(vertices[a], center)
    const db = sub(vertices[b], center)
    const angle = (d: Vec3) => Math.atan2(dot(d, side), dot(d, ref))
    return angle(da) - angle(db)
  })
}

/** All index pairs whose separation matches `target` within tolerance. */
function neighboursAt(
  vertices: readonly Vec3[],
  index: number,
  target: number,
  tol = 1e-3,
): number[] {
  const out: number[] = []
  for (let i = 0; i < vertices.length; i++) {
    if (i === index) continue
    if (Math.abs(distance(vertices[i], vertices[index]) - target) < tol) out.push(i)
  }
  return out
}

/** The sorted set of distinct distances occurring between vertices. */
function distanceSpectrum(vertices: readonly Vec3[], tol = 1e-3): number[] {
  const all: number[] = []
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      all.push(distance(vertices[i], vertices[j]))
    }
  }
  all.sort((a, b) => a - b)
  const out: number[] = []
  for (const d of all) {
    if (out.length === 0 || d - out[out.length - 1] > tol) out.push(d)
  }
  return out
}

/**
 * Small stellated dodecahedron {5/2, 5}.
 *
 * Shares the icosahedron's twelve vertices. Each face is the pentagram drawn
 * through the five neighbours of one icosahedral vertex.
 */
export function smallStellatedDodecahedron(): Polyhedron {
  const ico = baseSolid('icosahedron')
  const v = ico.vertices
  const [d1] = distanceSpectrum(v)
  const faces: number[][] = []
  for (let i = 0; i < v.length; i++) {
    const ring = orderAround(neighboursAt(v, i, d1), v, v[i], v[i])
    // Step by two to turn the pentagon into a pentagram.
    faces.push([0, 2, 4, 1, 3].map((k) => ring[k]))
  }
  return orientOutward(normalizeScale({ vertices: v, faces }, 1))
}

/**
 * Great dodecahedron {5, 5/2}. Same vertices and edges as the icosahedron,
 * with the neighbour rings taken as convex pentagons instead of pentagrams.
 */
export function greatDodecahedron(): Polyhedron {
  const ico = baseSolid('icosahedron')
  const v = ico.vertices
  const [d1] = distanceSpectrum(v)
  const faces: number[][] = []
  for (let i = 0; i < v.length; i++) {
    faces.push(orderAround(neighboursAt(v, i, d1), v, v[i], v[i]))
  }
  return orientOutward(normalizeScale({ vertices: v, faces }, 1))
}

/**
 * Great icosahedron {3, 5/2}. Icosahedral vertices joined at the second
 * distance; the twenty triangles of that graph are the faces.
 */
export function greatIcosahedron(): Polyhedron {
  const ico = baseSolid('icosahedron')
  const v = ico.vertices
  const d2 = distanceSpectrum(v)[1]
  const adjacency = v.map((_, i) => new Set(neighboursAt(v, i, d2)))
  const faces: number[][] = []
  for (let a = 0; a < v.length; a++) {
    for (const b of adjacency[a]) {
      if (b <= a) continue
      for (const c of adjacency[b]) {
        if (c <= b) continue
        if (adjacency[a].has(c)) faces.push([a, b, c])
      }
    }
  }
  return orientOutward(normalizeScale({ vertices: v, faces }, 1))
}

/** Great stellated dodecahedron {5/2, 3}: the dual of the great icosahedron. */
export function greatStellatedDodecahedron(): Polyhedron {
  return normalizeScale(dual(greatIcosahedron(), 1), 1)
}

const KP = ['Uniform', 'Regular', 'Kepler-Poinsot']

export const keplerPoinsotSource: CatalogSource = {
  id: 'kepler-poinsot',
  specs(): PolyhedronSpec[] {
    return [
      {
        id: 'small-stellated-dodecahedron',
        name: 'Small Stellated Dodecahedron',
        categoryPath: KP,
        schlafli: '{5/2,5}',
        wythoff: '5 | 2 5/2',
        vertexConfiguration: '(5/2)^5',
        symmetry: 'Ih',
        notes:
          'Twelve pentagram faces, five to a vertex. Density 3. Dual of the great dodecahedron.',
        build: smallStellatedDodecahedron,
      },
      {
        id: 'great-dodecahedron',
        name: 'Great Dodecahedron',
        categoryPath: KP,
        schlafli: '{5,5/2}',
        wythoff: '5/2 | 2 5',
        vertexConfiguration: '(5)^(5/2)',
        symmetry: 'Ih',
        notes:
          'Twelve pentagons meeting five at a vertex in a pentagrammic figure. Density 3.',
        build: greatDodecahedron,
      },
      {
        id: 'great-stellated-dodecahedron',
        name: 'Great Stellated Dodecahedron',
        categoryPath: KP,
        schlafli: '{5/2,3}',
        wythoff: '3 | 2 5/2',
        vertexConfiguration: '(5/2)^3',
        symmetry: 'Ih',
        notes: 'Twelve pentagrams, three to a vertex. Density 7.',
        build: greatStellatedDodecahedron,
      },
      {
        id: 'great-icosahedron',
        name: 'Great Icosahedron',
        categoryPath: KP,
        schlafli: '{3,5/2}',
        wythoff: '5/2 | 2 3',
        vertexConfiguration: '(3)^(5/2)',
        symmetry: 'Ih',
        notes: 'Twenty triangles meeting in pentagrams. Density 7.',
        build: greatIcosahedron,
      },
    ]
  },
}
