import {
  center,
  normalizeScale,
  orientOutward,
  type Polyhedron,
} from '../../geometry/polyhedron'
import type { Vec3 } from '../../geometry/vector'
import { dual } from '../../operations/dual'
import type { CatalogSource, PolyhedronSpec } from '../types'

/** Edge length of a regular n-gon inscribed in a unit circle. */
function sideLength(n: number): number {
  return 2 * Math.sin(Math.PI / n)
}

function ring(n: number, z: number, phase = 0, radius = 1): Vec3[] {
  return Array.from({ length: n }, (_, i): Vec3 => {
    const a = (2 * Math.PI * i) / n + phase
    return [radius * Math.cos(a), radius * Math.sin(a), z]
  })
}

/** Uniform n-gonal prism: two regular n-gons joined by squares. */
export function prism(n: number): Polyhedron {
  const h = sideLength(n) / 2
  const vertices = [...ring(n, h), ...ring(n, -h)]
  const faces: number[][] = [
    Array.from({ length: n }, (_, i) => i),
    Array.from({ length: n }, (_, i) => 2 * n - 1 - i),
  ]
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    faces.push([i, j, n + j, n + i])
  }
  return orientOutward(normalizeScale({ vertices, faces }, 1))
}

/** Uniform n-gonal antiprism: two twisted n-gons joined by 2n triangles. */
export function antiprism(n: number): Polyhedron {
  const s = sideLength(n)
  // Lateral edges must also have length s.
  const planar = 2 * Math.sin(Math.PI / (2 * n))
  const h2 = s * s - planar * planar
  const h = Math.sqrt(Math.max(h2, 1e-9)) / 2
  const vertices = [...ring(n, h), ...ring(n, -h, Math.PI / n)]
  const faces: number[][] = [
    Array.from({ length: n }, (_, i) => i),
    Array.from({ length: n }, (_, i) => 2 * n - 1 - i),
  ]
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    faces.push([i, j, n + i])
    faces.push([j, n + j, n + i])
  }
  return orientOutward(normalizeScale({ vertices, faces }, 1))
}

/** n-gonal pyramid with equilateral sides (real only for n = 3, 4, 5). */
export function pyramid(n: number): Polyhedron {
  const s = sideLength(n)
  const apexHeight = Math.sqrt(Math.max(s * s - 1, 1e-9))
  const vertices: Vec3[] = [...ring(n, 0), [0, 0, apexHeight]]
  const faces: number[][] = [Array.from({ length: n }, (_, i) => n - 1 - i)]
  for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n])
  return orientOutward(normalizeScale(center({ vertices, faces }), 1))
}

/**
 * n-gonal cupola: a regular n-gon above a regular 2n-gon, joined by
 * alternating triangles and squares. Real for n = 3, 4, 5.
 */
export function cupola(n: number): Polyhedron {
  const s = 1 // bottom 2n-gon edge length
  const bottomRadius = s / (2 * Math.sin(Math.PI / (2 * n)))
  const topRadius = s / (2 * Math.sin(Math.PI / n))
  // Squared horizontal offset between a top vertex and its nearest bottom one.
  const horizontal =
    bottomRadius * bottomRadius +
    topRadius * topRadius -
    2 * bottomRadius * topRadius * Math.cos(Math.PI / (2 * n))
  const h = Math.sqrt(Math.max(s * s - horizontal, 1e-9))

  const bottom = ring(2 * n, 0, Math.PI / (2 * n), bottomRadius)
  const top = ring(n, h, Math.PI / n + Math.PI / (2 * n), topRadius)
  const vertices: Vec3[] = [...bottom, ...top]
  const b = (i: number) => ((i % (2 * n)) + 2 * n) % (2 * n)
  const t = (i: number) => 2 * n + (((i % n) + n) % n)

  const faces: number[][] = [
    Array.from({ length: 2 * n }, (_, i) => 2 * n - 1 - i),
    Array.from({ length: n }, (_, i) => t(i)),
  ]
  for (let i = 0; i < n; i++) {
    faces.push([b(2 * i), b(2 * i + 1), t(i)])
    faces.push([b(2 * i + 1), b(2 * i + 2), t(i + 1), t(i)])
  }
  return orientOutward(normalizeScale(center({ vertices, faces }), 1))
}

/** n-gonal bipyramid: the dual of the n-gonal prism. */
export function bipyramid(n: number): Polyhedron {
  return normalizeScale(dual(prism(n), 1), 1)
}

/** n-gonal trapezohedron: the dual of the n-gonal antiprism. */
export function trapezohedron(n: number): Polyhedron {
  return normalizeScale(dual(antiprism(n), 1), 1)
}

const ORDINALS: Record<number, string> = {
  3: 'Triangular',
  4: 'Square',
  5: 'Pentagonal',
  6: 'Hexagonal',
  7: 'Heptagonal',
  8: 'Octagonal',
  9: 'Enneagonal',
  10: 'Decagonal',
  11: 'Hendecagonal',
  12: 'Dodecagonal',
  13: 'Tridecagonal',
  14: 'Tetradecagonal',
  15: 'Pentadecagonal',
  16: 'Hexadecagonal',
  17: 'Heptadecagonal',
  18: 'Octadecagonal',
  19: 'Enneadecagonal',
  20: 'Icosagonal',
}

export function ordinal(n: number): string {
  return ORDINALS[n] ?? `${n}-gonal`
}

export const MAX_FAMILY_SIDES = 20

export const familiesSource: CatalogSource = {
  id: 'families',
  specs(): PolyhedronSpec[] {
    const specs: PolyhedronSpec[] = []

    for (let n = 3; n <= MAX_FAMILY_SIDES; n++) {
      specs.push({
        id: `prism-${n}`,
        name: `${ordinal(n)} Prism`,
        categoryPath: ['Uniform', 'Prisms & Antiprisms', 'Prisms'],
        wythoff: `2 ${n} | 2`,
        vertexConfiguration: `4.4.${n}`,
        symmetry: `D${n}h`,
        notes:
          n === 4
            ? 'The square prism is the cube.'
            : `Two regular ${n}-gons joined by ${n} squares.`,
        build: () => prism(n),
      })
      specs.push({
        id: `antiprism-${n}`,
        name: `${ordinal(n)} Antiprism`,
        categoryPath: ['Uniform', 'Prisms & Antiprisms', 'Antiprisms'],
        wythoff: `| 2 2 ${n}`,
        vertexConfiguration: `3.3.3.${n}`,
        symmetry: `D${n}d`,
        notes:
          n === 3
            ? 'The triangular antiprism is the octahedron.'
            : `Two twisted regular ${n}-gons joined by ${2 * n} triangles.`,
        build: () => antiprism(n),
      })
      specs.push({
        id: `bipyramid-${n}`,
        name: `${ordinal(n)} Bipyramid`,
        categoryPath: ['Duals', 'Bipyramids'],
        symmetry: `D${n}h`,
        notes: `Dual of the ${ordinal(n).toLowerCase()} prism.`,
        build: () => bipyramid(n),
      })
      specs.push({
        id: `trapezohedron-${n}`,
        name: `${ordinal(n)} Trapezohedron`,
        categoryPath: ['Duals', 'Trapezohedra'],
        symmetry: `D${n}d`,
        notes: `Dual of the ${ordinal(n).toLowerCase()} antiprism.`,
        build: () => trapezohedron(n),
      })
    }

    for (const n of [3, 4, 5]) {
      specs.push({
        id: `pyramid-${n}`,
        name: `${ordinal(n)} Pyramid`,
        categoryPath: ['Pyramids & Cupolae', 'Pyramids'],
        symmetry: `C${n}v`,
        notes: 'Regular-faced pyramid.',
        build: () => pyramid(n),
      })
      specs.push({
        id: `cupola-${n}`,
        name: `${ordinal(n)} Cupola`,
        categoryPath: ['Pyramids & Cupolae', 'Cupolae'],
        symmetry: `C${n}v`,
        notes: `A regular ${n}-gon above a regular ${2 * n}-gon.`,
        build: () => cupola(n),
      })
    }

    return specs
  },
}
