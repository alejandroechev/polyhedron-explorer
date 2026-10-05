import { normalizeScale, type Polyhedron } from '../../geometry/polyhedron'
import type { Vec3 } from '../../geometry/vector'
import type { CatalogSource, PolyhedronSpec } from '../types'

/**
 * A polyhedron is *noble* when it is both isohedral (one orbit of faces) and
 * isogonal (one orbit of vertices). Besides the nine regular polyhedra -- the
 * five Platonic and four Kepler-Poinsot solids, which live under Uniform in
 * this catalog -- the finite non-exotic noble polyhedra are the disphenoid
 * tetrahedra, the infinite family of stephanoids (crown polyhedra), and 146
 * sporadic facetings first charted by Hess and Bruckner.
 *
 * This source contributes the two infinite families, which are the ones that
 * can be generated exactly from their parameters.
 */

/**
 * Disphenoid: a tetrahedron whose four faces are congruent acute triangles.
 * It is the isosceles ("tetragonal") disphenoid when `p === q` and the scalene
 * ("rhombic") disphenoid otherwise.
 */
export function disphenoid(p: number, q: number, r: number): Polyhedron {
  const vertices: Vec3[] = [
    [p, q, r],
    [p, -q, -r],
    [-p, q, -r],
    [-p, -q, r],
  ]
  const faces = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 1],
    [1, 3, 2],
  ]
  return normalizeScale({ vertices, faces }, 1)
}

export interface StephanoidParams {
  /** Number of vertices in each of the two bases. */
  readonly n: number
  /** Step between the two base vertices of a face on one base. */
  readonly a: number
  /** Step between the two base vertices of a face on the other base. */
  readonly b: number
}

/**
 * Stephanoid (crown polyhedron) S(n; a, b).
 *
 * Two n-gonal rings of vertices, one above the other, carrying 2n butterfly
 * (crossed quadrilateral) faces: each face picks two vertices `a` steps apart
 * on one ring and two vertices `b` steps apart on the other, arranged so the
 * face has a mirror plane. The rings are twisted by half a step when `a - b`
 * is odd, which is what keeps the faces planar.
 *
 * Every stephanoid has V = F = 2n, E = 4n, so Euler characteristic 0: they are
 * self-dual toroids of genus 1.
 */
export function stephanoid({ n, a, b }: StephanoidParams): Polyhedron {
  // Half-step twist between the rings whenever a - b is odd.
  const twist = (a - b) % 2 === 0 ? 0 : 0.5
  // Angular separation of two base positions, folded into [0, n/2].
  const fold = (x: number) => {
    const m = ((x % n) + n) % n
    return Math.min(m, n - m)
  }
  // Rise matched to the wider of the two lateral spans, so the crown is tall
  // enough for its tunnel to be visible.
  const spread = Math.max(fold((a - b) / 2), fold((a + b) / 2))
  const height = Math.max(0.35, Math.sin((Math.PI * spread) / n))

  const vertices: Vec3[] = []
  const ring = (i: number, offset: number, z: number) => {
    const angle = (2 * Math.PI * (i + offset)) / n
    vertices.push([Math.cos(angle), Math.sin(angle), z])
  }
  for (let i = 0; i < n; i++) ring(i, 0, height)
  for (let i = 0; i < n; i++) ring(i, twist, -height)

  const top = (i: number) => ((i % n) + n) % n
  const bottom = (i: number) => n + top(i)

  const faces: number[][] = []
  for (const [s, t] of [
    [a, b],
    [b, a],
  ]) {
    // Mirror-plane condition: the two chosen base pairs must share a bisector.
    const shift = (s - t) / 2 - twist
    for (let k = 0; k < n; k++) {
      const m = k + shift
      faces.push([top(k), bottom(m), top(k + s), bottom(m + t)])
    }
  }
  return normalizeScale({ vertices, faces }, 1)
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** Parameter sets that give a connected, non-degenerate stephanoid. */
export function stephanoidParams(maxN = 10): StephanoidParams[] {
  const out: StephanoidParams[] = []
  const seen = new Set<string>()
  for (let n = 4; n <= maxN; n++) {
    for (let a = 1; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        // a + b === n collapses the butterflies onto the axis; an untwisted
        // figure with a common factor falls apart into separate rings.
        if (a + b === n) continue
        if ((a - b) % 2 === 0 && gcd(gcd(n, a), b) > 1) continue
        // (a, b) and its mirror (n - b, n - a) describe the same solid.
        const key = `${n}:${Math.min(a, n - b)}:${Math.min(b, n - a)}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ n, a, b })
      }
    }
  }
  return out
}

const NOBLE = ['Noble']
const CROWN = ['Noble', 'Stephanoids']

function stephanoidSpec({ n, a, b }: StephanoidParams): PolyhedronSpec {
  return {
    id: `stephanoid-${n}-${a}-${b}`,
    name: `Stephanoid ${n}/${a},${b}`,
    aka: [`Crown polyhedron ${n}/${a},${b}`],
    categoryPath: CROWN,
    symmetry: (a - b) % 2 === 0 ? `D${n}h` : `D${n}d`,
    notes:
      `Butterfly faces spanning ${a} and ${b} steps of the two ${n}-gonal bases. ` +
      `Self-dual toroid with ${2 * n} vertices, ${4 * n} edges and ${2 * n} faces.`,
    build: () => stephanoid({ n, a, b }),
  }
}

export const nobleSource: CatalogSource = {
  id: 'noble',
  specs(): PolyhedronSpec[] {
    return [
      {
        id: 'tetragonal-disphenoid',
        name: 'Tetragonal Disphenoid',
        aka: ['Isosceles tetrahedron'],
        categoryPath: NOBLE,
        symmetry: 'D2d',
        notes:
          'Four congruent isosceles triangles. The simplest noble polyhedron that is not regular.',
        build: () => disphenoid(1, 1, 0.55),
      },
      {
        id: 'rhombic-disphenoid',
        name: 'Rhombic Disphenoid',
        aka: ['Scalene tetrahedron'],
        categoryPath: NOBLE,
        symmetry: 'D2',
        notes:
          'Four congruent scalene triangles; the three edge pairs all differ. Its dual is a stretched disphenoid.',
        build: () => disphenoid(1, 0.78, 0.5),
      },
      ...stephanoidParams().map(stephanoidSpec),
    ]
  },
}
