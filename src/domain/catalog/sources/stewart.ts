import {
  center,
  normalizeScale,
  orientOutward,
  type Polyhedron,
} from '../../geometry/polyhedron'
import { ringToroid } from '../../operations/glue'
import type { CatalogSource, PolyhedronSpec } from '../types'
import { baseSolid } from './dataset'

/**
 * Stewart toroids, after Bonnie Stewart's *Adventures Among the Toroids*
 * (1964): polyhedra of positive genus whose faces are all regular and where no
 * two faces sharing an edge are coplanar -- properties (R) and (A) -- obtained
 * from simpler solids by drilling tunnels or joining rods.
 *
 * The family is infinite, so this source contributes the rod-like toroids:
 * copies of one regular-faced convex solid glued face to face into a closed
 * loop (Stewart's "outer-blending"), with the glued faces removed. Every ring
 * below is checked at build time -- the loop has to close on itself exactly,
 * or `ringToroid` refuses to produce a model.
 */

interface RingRecipe {
  readonly id: string
  readonly name: string
  /** Catalog id of the solid that is repeated. */
  readonly solid: string
  /** Index of the face each copy presents to its predecessor. */
  readonly entry: number
  /** Index of the face each copy presents to its successor. */
  readonly exit: number
  /** Which vertex of `exit` receives vertex 0 of `entry`. */
  readonly offset: number
  /** Copies needed to close the loop. */
  readonly count: number
  readonly symmetry?: string
  readonly notes?: string
}

const ARCHIMEDEAN_RINGS: RingRecipe[] = [
  {
    id: 'stewart-ring-4-truncated-octahedra',
    name: 'Ring of 4 Truncated Octahedra',
    solid: 'truncated-octahedron',
    entry: 0,
    exit: 1,
    offset: 0,
    count: 4,
    symmetry: 'D4h',
    notes:
      'Four truncated octahedra joined on square faces. Because the solid tiles space, the ring is a closed loop cut from the bitruncated cubic honeycomb.',
  },
  {
    id: 'stewart-ring-3-truncated-cuboctahedra',
    name: 'Ring of 3 Truncated Cuboctahedra',
    solid: 'truncated-cuboctahedron',
    entry: 0,
    exit: 1,
    offset: 0,
    count: 3,
    symmetry: 'D3h',
  },
  {
    id: 'stewart-ring-4-truncated-cuboctahedra',
    name: 'Ring of 4 Truncated Cuboctahedra',
    solid: 'truncated-cuboctahedron',
    entry: 0,
    exit: 5,
    offset: 0,
    count: 4,
    symmetry: 'D4h',
  },
  {
    id: 'stewart-ring-4-truncated-cuboctahedra-octagonal',
    name: 'Octagonal Ring of 4 Truncated Cuboctahedra',
    solid: 'truncated-cuboctahedron',
    entry: 20,
    exit: 21,
    offset: 0,
    count: 4,
    symmetry: 'D4h',
    notes: 'Joined on octagons rather than squares, which opens a much wider tunnel.',
  },
  {
    id: 'stewart-ring-3-truncated-icosidodecahedra',
    name: 'Ring of 3 Truncated Icosidodecahedra',
    solid: 'truncated-icosidodecahedron',
    entry: 0,
    exit: 6,
    offset: 1,
    count: 3,
    symmetry: 'D3h',
  },
  {
    id: 'stewart-ring-4-truncated-icosidodecahedra',
    name: 'Ring of 4 Truncated Icosidodecahedra',
    solid: 'truncated-icosidodecahedron',
    entry: 0,
    exit: 15,
    offset: 1,
    count: 4,
    symmetry: 'D4h',
  },
  {
    id: 'stewart-ring-5-truncated-icosidodecahedra',
    name: 'Ring of 5 Truncated Icosidodecahedra',
    solid: 'truncated-icosidodecahedron',
    entry: 0,
    exit: 18,
    offset: 1,
    count: 5,
    symmetry: 'D5h',
  },
  {
    id: 'stewart-ring-4-rhombicuboctahedra',
    name: 'Ring of 4 Rhombicuboctahedra',
    solid: 'rhombicuboctahedron',
    entry: 8,
    exit: 18,
    offset: 3,
    count: 4,
    symmetry: 'D4h',
  },
  {
    id: 'stewart-ring-8-rhombicuboctahedra',
    name: 'Ring of 8 Rhombicuboctahedra',
    solid: 'rhombicuboctahedron',
    entry: 8,
    exit: 24,
    offset: 3,
    count: 8,
    symmetry: 'D8',
    notes: 'The copies turn by 45 degrees each, so eight of them close the loop.',
  },
  {
    id: 'stewart-ring-3-rhombicosidodecahedra',
    name: 'Ring of 3 Rhombicosidodecahedra',
    solid: 'rhombicosidodecahedron',
    entry: 20,
    exit: 24,
    offset: 0,
    count: 3,
    symmetry: 'D3',
  },
  {
    id: 'stewart-ring-4-rhombicosidodecahedra',
    name: 'Ring of 4 Rhombicosidodecahedra',
    solid: 'rhombicosidodecahedron',
    entry: 20,
    exit: 33,
    offset: 0,
    count: 4,
    symmetry: 'D4',
  },
  {
    id: 'stewart-ring-5-rhombicosidodecahedra',
    name: 'Ring of 5 Rhombicosidodecahedra',
    solid: 'rhombicosidodecahedron',
    entry: 20,
    exit: 35,
    offset: 0,
    count: 5,
    symmetry: 'D5',
  },
]

const JOHNSON_RINGS: RingRecipe[] = [
  {
    id: 'stewart-ring-4-square-cupolae',
    name: 'Ring of 4 Square Cupolae',
    solid: 'j4',
    entry: 5,
    exit: 7,
    offset: 1,
    count: 4,
    symmetry: 'D4h',
    notes:
      'The smallest ring here: 32 vertices, 64 edges and 32 faces, so Euler characteristic 0.',
  },
  {
    id: 'stewart-ring-3-pentagonal-cupolae',
    name: 'Ring of 3 Pentagonal Cupolae',
    solid: 'j5',
    entry: 5,
    exit: 7,
    offset: 1,
    count: 3,
    symmetry: 'D3',
  },
  {
    id: 'stewart-ring-10-elongated-pentagonal-dipyramids',
    name: 'Ring of 10 Elongated Pentagonal Dipyramids',
    solid: 'j16',
    entry: 11,
    exit: 13,
    offset: 1,
    count: 10,
    symmetry: 'D10',
    notes: 'A spiky necklace: ten copies bend by 36 degrees each.',
  },
  {
    id: 'stewart-ring-4-elongated-square-cupolae',
    name: 'Ring of 4 Elongated Square Cupolae',
    solid: 'j19',
    entry: 5,
    exit: 12,
    offset: 3,
    count: 4,
    symmetry: 'D4h',
  },
  {
    id: 'stewart-ring-8-elongated-square-cupolae',
    name: 'Ring of 8 Elongated Square Cupolae',
    solid: 'j19',
    entry: 5,
    exit: 14,
    offset: 0,
    count: 8,
    symmetry: 'D8',
  },
  {
    id: 'stewart-ring-3-elongated-pentagonal-cupolae',
    name: 'Ring of 3 Elongated Pentagonal Cupolae',
    solid: 'j20',
    entry: 15,
    exit: 17,
    offset: 1,
    count: 3,
    symmetry: 'D3',
  },
  {
    id: 'stewart-ring-5-elongated-pentagonal-cupolae',
    name: 'Ring of 5 Elongated Pentagonal Cupolae',
    solid: 'j20',
    entry: 6,
    exit: 13,
    offset: 3,
    count: 5,
    symmetry: 'D5',
  },
  {
    id: 'stewart-ring-4-gyroelongated-square-cupolae',
    name: 'Ring of 4 Gyroelongated Square Cupolae',
    solid: 'j23',
    entry: 22,
    exit: 24,
    offset: 1,
    count: 4,
    symmetry: 'D4',
  },
  {
    id: 'stewart-ring-3-gyroelongated-pentagonal-cupolae',
    name: 'Ring of 3 Gyroelongated Pentagonal Cupolae',
    solid: 'j24',
    entry: 25,
    exit: 27,
    offset: 1,
    count: 3,
    symmetry: 'D3',
  },
  {
    id: 'stewart-ring-8-square-orthobicupolae',
    name: 'Ring of 8 Square Orthobicupolae',
    solid: 'j28',
    entry: 8,
    exit: 16,
    offset: 1,
    count: 8,
    symmetry: 'D8',
  },
  {
    id: 'stewart-ring-4-square-gyrobicupolae',
    name: 'Ring of 4 Square Gyrobicupolae',
    solid: 'j29',
    entry: 9,
    exit: 11,
    offset: 1,
    count: 4,
    symmetry: 'D4',
  },
  {
    id: 'stewart-ring-3-pentagonal-orthobicupolae',
    name: 'Ring of 3 Pentagonal Orthobicupolae',
    solid: 'j30',
    entry: 10,
    exit: 12,
    offset: 1,
    count: 3,
    symmetry: 'D3',
  },
  {
    id: 'stewart-ring-5-pentagonal-orthocupolarotundae',
    name: 'Ring of 5 Pentagonal Orthocupolarotundae',
    solid: 'j32',
    entry: 0,
    exit: 9,
    offset: 0,
    count: 5,
    symmetry: 'D5',
    notes: 'Joined on triangles, which lets the chain turn through a shallow 72 degrees.',
  },
  {
    id: 'stewart-ring-6-elongated-triangular-orthobicupolae',
    name: 'Ring of 6 Elongated Triangular Orthobicupolae',
    solid: 'j35',
    entry: 14,
    exit: 16,
    offset: 3,
    count: 6,
    symmetry: 'D6',
  },
  {
    id: 'stewart-ring-4-elongated-square-gyrobicupolae',
    name: 'Ring of 4 Elongated Square Gyrobicupolae',
    solid: 'j37',
    entry: 8,
    exit: 12,
    offset: 3,
    count: 4,
    symmetry: 'D4',
    notes: 'Built from the pseudo-rhombicuboctahedron, the one Johnson solid that is not vertex-transitive.',
  },
  {
    id: 'stewart-ring-8-elongated-square-gyrobicupolae',
    name: 'Ring of 8 Elongated Square Gyrobicupolae',
    solid: 'j37',
    entry: 8,
    exit: 21,
    offset: 3,
    count: 8,
    symmetry: 'D8',
  },
  {
    id: 'stewart-ring-4-augmented-truncated-cubes',
    name: 'Ring of 4 Augmented Truncated Cubes',
    solid: 'j66',
    entry: 14,
    exit: 16,
    offset: 1,
    count: 4,
    symmetry: 'D4',
  },
  {
    id: 'stewart-ring-4-biaugmented-truncated-cubes',
    name: 'Ring of 4 Biaugmented Truncated Cubes',
    solid: 'j67',
    entry: 17,
    exit: 25,
    offset: 1,
    count: 4,
    symmetry: 'D4',
  },
  {
    id: 'stewart-ring-3-metabiaugmented-hexagonal-prisms',
    name: 'Ring of 3 Metabiaugmented Hexagonal Prisms',
    solid: 'j56',
    entry: 3,
    exit: 7,
    offset: 2,
    count: 3,
    symmetry: 'D3',
  },
  {
    id: 'stewart-ring-3-triaugmented-hexagonal-prisms',
    name: 'Ring of 3 Triaugmented Hexagonal Prisms',
    solid: 'j57',
    entry: 0,
    exit: 8,
    offset: 2,
    count: 3,
    symmetry: 'D3',
  },
  {
    id: 'stewart-ring-5-triangular-hebesphenorotundae',
    name: 'Ring of 5 Triangular Hebesphenorotundae',
    solid: 'j92',
    entry: 0,
    exit: 3,
    offset: 2,
    count: 5,
    symmetry: 'D5',
  },
]

const ARCHIMEDEAN_PATH = ['Stewart Toroids', 'Archimedean Rings']
const JOHNSON_PATH = ['Stewart Toroids', 'Johnson Rings']

export function buildRing(recipe: RingRecipe): Polyhedron {
  const solid = orientOutward(baseSolid(recipe.solid))
  const toroid = ringToroid({
    solid,
    entry: recipe.entry,
    exit: recipe.exit,
    offset: recipe.offset,
    count: recipe.count,
  })
  if (!toroid) {
    throw new Error(`Ring ${recipe.id} does not close into a toroid`)
  }
  // The chain starts where the first copy sits, so recentre on the ring axis.
  return normalizeScale(center(toroid), 1)
}

function toSpec(recipe: RingRecipe, categoryPath: readonly string[]): PolyhedronSpec {
  return {
    id: recipe.id,
    name: recipe.name,
    categoryPath,
    symmetry: recipe.symmetry,
    notes:
      recipe.notes ??
      `${recipe.count} copies glued face to face into a closed loop, with the glued faces removed. All faces stay regular and the result has genus 1.`,
    build: () => buildRing(recipe),
  }
}

export const RING_RECIPES: readonly RingRecipe[] = [
  ...ARCHIMEDEAN_RINGS,
  ...JOHNSON_RINGS,
]

export const stewartSource: CatalogSource = {
  id: 'stewart',
  specs(): PolyhedronSpec[] {
    return [
      ...ARCHIMEDEAN_RINGS.map((r) => toSpec(r, ARCHIMEDEAN_PATH)),
      ...JOHNSON_RINGS.map((r) => toSpec(r, JOHNSON_PATH)),
    ]
  },
}
