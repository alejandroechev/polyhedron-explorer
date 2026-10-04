import {
  normalizeScale,
  orientOutward,
  type Polyhedron,
} from '../../geometry/polyhedron'
import {
  distinctOrbit,
  merge,
  rotationGroup,
} from '../../geometry/symmetry'
import type { Vec3 } from '../../geometry/vector'
import type { CatalogSource, PolyhedronSpec } from '../types'
import { baseSolid } from './dataset'

const PHI = (1 + Math.sqrt(5)) / 2

/** Axis-aligned cube with vertices (±1, ±1, ±1). */
function unitCube(): Polyhedron {
  const vertices: Vec3[] = []
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    vertices.push([x, y, z])
  }
  const idx = (x: number, y: number, z: number) =>
    vertices.findIndex((v) => v[0] === x && v[1] === y && v[2] === z)
  const faces = [
    [idx(1, 1, 1), idx(1, -1, 1), idx(1, -1, -1), idx(1, 1, -1)],
    [idx(-1, 1, 1), idx(-1, 1, -1), idx(-1, -1, -1), idx(-1, -1, 1)],
    [idx(1, 1, 1), idx(1, 1, -1), idx(-1, 1, -1), idx(-1, 1, 1)],
    [idx(1, -1, 1), idx(-1, -1, 1), idx(-1, -1, -1), idx(1, -1, -1)],
    [idx(1, 1, 1), idx(-1, 1, 1), idx(-1, -1, 1), idx(1, -1, 1)],
    [idx(1, 1, -1), idx(1, -1, -1), idx(-1, -1, -1), idx(-1, 1, -1)],
  ]
  return orientOutward({ vertices, faces })
}

/** One of the two tetrahedra inscribed in the unit cube. */
function cubeTetrahedron(mirror = false): Polyhedron {
  const s = mirror ? -1 : 1
  const vertices: Vec3[] = [
    [s, s, s],
    [s, -s, -s],
    [-s, s, -s],
    [-s, -s, s],
  ]
  const faces = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 1],
    [1, 3, 2],
  ]
  return orientOutward({ vertices, faces })
}

/**
 * Dodecahedron positioned so that (±1, ±1, ±1) are among its vertices. This
 * alignment is what makes the five inscribed cubes fall out of its rotation
 * group.
 */
function alignedDodecahedron(): Polyhedron {
  const vertices: Vec3[] = []
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    vertices.push([x, y, z])
  }
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    vertices.push([0, (a * 1) / PHI, b * PHI])
    vertices.push([(a * 1) / PHI, b * PHI, 0])
    vertices.push([a * PHI, 0, (b * 1) / PHI])
  }
  const faces = pentagonFaces(vertices)
  return orientOutward({ vertices, faces })
}

/** Find the twelve pentagonal faces of a dodecahedron vertex cloud. */
function pentagonFaces(vertices: readonly Vec3[]): number[][] {
  const edgeLen = 2 / PHI
  const adjacency = vertices.map((v, i) =>
    vertices
      .map((w, j) => ({ j, d: Math.hypot(v[0] - w[0], v[1] - w[1], v[2] - w[2]) }))
      .filter((x) => x.j !== i && Math.abs(x.d - edgeLen) < 1e-6)
      .map((x) => x.j),
  )

  const faces: number[][] = []
  const seen = new Set<string>()
  for (let a = 0; a < vertices.length; a++) {
    for (const b of adjacency[a]) {
      // Walk a 5-cycle starting a -> b, always turning the same way.
      const loop = [a, b]
      let ok = true
      for (let step = 0; step < 3; step++) {
        const prev = loop[loop.length - 2]
        const cur = loop[loop.length - 1]
        const options = adjacency[cur].filter((x) => x !== prev)
        const next = options.find((x) =>
          isCoplanar([...loop, x].map((i) => vertices[i])),
        )
        if (next == null) {
          ok = false
          break
        }
        loop.push(next)
      }
      if (!ok || loop.length !== 5) continue
      if (!adjacency[loop[4]].includes(loop[0])) continue
      const key = [...loop].sort((x, y) => x - y).join(',')
      if (seen.has(key)) continue
      seen.add(key)
      faces.push(loop)
    }
  }
  return faces
}

function isCoplanar(points: readonly Vec3[]): boolean {
  if (points.length < 4) return true
  const [p0, p1, p2] = points
  const u: Vec3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]
  const v: Vec3 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]]
  const n: Vec3 = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ]
  const len = Math.hypot(...n)
  if (len < 1e-9) return false
  for (let i = 3; i < points.length; i++) {
    const d: Vec3 = [
      points[i][0] - p0[0],
      points[i][1] - p0[1],
      points[i][2] - p0[2],
    ]
    if (Math.abs((n[0] * d[0] + n[1] * d[1] + n[2] * d[2]) / len) > 1e-6) return false
  }
  return true
}

let cachedIcosahedralRotations: ReturnType<typeof rotationGroup> | null = null
function icosahedralRotations() {
  if (!cachedIcosahedralRotations) {
    cachedIcosahedralRotations = rotationGroup(alignedDodecahedron())
  }
  return cachedIcosahedralRotations
}

export function stellaOctangula(): Polyhedron {
  return normalizeScale(
    merge([cubeTetrahedron(false), cubeTetrahedron(true)]),
    1,
  )
}

export function compoundOfFiveCubes(): Polyhedron {
  const parts = distinctOrbit(unitCube(), icosahedralRotations())
  return normalizeScale(merge(parts), 1)
}

export function compoundOfFiveTetrahedra(mirror = false): Polyhedron {
  const parts = distinctOrbit(cubeTetrahedron(mirror), icosahedralRotations())
  return normalizeScale(merge(parts), 1)
}

export function compoundOfTenTetrahedra(): Polyhedron {
  const rotations = icosahedralRotations()
  const parts = [
    ...distinctOrbit(cubeTetrahedron(false), rotations),
    ...distinctOrbit(cubeTetrahedron(true), rotations),
  ]
  return normalizeScale(merge(parts), 1)
}

export function compoundOfFiveOctahedra(): Polyhedron {
  const octahedron = baseSolid('octahedron')
  const parts = distinctOrbit(octahedron, icosahedralRotations())
  return normalizeScale(merge(parts), 1)
}

function dualPairCompound(aId: string, bId: string): Polyhedron {
  const a = normalizeScale(baseSolid(aId), 1)
  const b = normalizeScale(baseSolid(bId), 1)
  return normalizeScale(merge([a, b]), 1)
}

const COMPOUNDS = ['Compounds']

export const compoundsSource: CatalogSource = {
  id: 'compounds',
  specs(): PolyhedronSpec[] {
    return [
      {
        id: 'stella-octangula',
        name: 'Stella Octangula',
        aka: ['Compound of Two Tetrahedra'],
        categoryPath: COMPOUNDS,
        symmetry: 'Oh',
        notes:
          "Kepler's compound of two dual tetrahedra; also the first stellation of the octahedron.",
        build: stellaOctangula,
      },
      {
        id: 'compound-five-cubes',
        name: 'Compound of Five Cubes',
        categoryPath: COMPOUNDS,
        symmetry: 'Ih',
        notes:
          'Five cubes inscribed in a dodecahedron. Its dual is the compound of five octahedra.',
        build: compoundOfFiveCubes,
      },
      {
        id: 'compound-five-octahedra',
        name: 'Compound of Five Octahedra',
        categoryPath: COMPOUNDS,
        symmetry: 'Ih',
        notes: 'Dual of the compound of five cubes.',
        build: compoundOfFiveOctahedra,
      },
      {
        id: 'compound-five-tetrahedra',
        name: 'Compound of Five Tetrahedra',
        categoryPath: COMPOUNDS,
        symmetry: 'I',
        notes: 'A chiral compound; its mirror image is a different model.',
        build: () => compoundOfFiveTetrahedra(false),
      },
      {
        id: 'compound-five-tetrahedra-mirror',
        name: 'Compound of Five Tetrahedra (Mirror)',
        categoryPath: COMPOUNDS,
        symmetry: 'I',
        notes: 'The opposite enantiomorph of the compound of five tetrahedra.',
        build: () => compoundOfFiveTetrahedra(true),
      },
      {
        id: 'compound-ten-tetrahedra',
        name: 'Compound of Ten Tetrahedra',
        categoryPath: COMPOUNDS,
        symmetry: 'Ih',
        notes: 'Both enantiomorphs of the five-tetrahedra compound together.',
        build: compoundOfTenTetrahedra,
      },
      {
        id: 'compound-cube-octahedron',
        name: 'Compound of Cube and Octahedron',
        categoryPath: COMPOUNDS,
        symmetry: 'Oh',
        notes: 'A dual pair sharing a centre; its intersection is a cuboctahedron.',
        build: () => dualPairCompound('cube', 'octahedron'),
      },
      {
        id: 'compound-dodecahedron-icosahedron',
        name: 'Compound of Dodecahedron and Icosahedron',
        categoryPath: COMPOUNDS,
        symmetry: 'Ih',
        notes: 'A dual pair; its intersection is an icosidodecahedron.',
        build: () => dualPairCompound('dodecahedron', 'icosahedron'),
      },
    ]
  },
}
