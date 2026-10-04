import rawData from '../../../data/polyhedra.json'
import type { Polyhedron } from '../../geometry/polyhedron'
import type { Vec3 } from '../../geometry/vector'
import type { CatalogSource, PolyhedronSpec } from '../types'

interface RawEntry {
  id: string
  name: string
  group: string
  index?: number
  vertices: number[][]
  faces: number[][]
}

const data = rawData as { entries: RawEntry[]; attribution: string }

export const DATA_ATTRIBUTION = data.attribution

function toPolyhedron(entry: RawEntry): Polyhedron {
  return {
    vertices: entry.vertices.map((v) => [v[0], v[1], v[2]] as Vec3),
    faces: entry.faces,
  }
}

interface Meta {
  categoryPath: string[]
  wythoff?: string
  vertexConfiguration?: string
  symmetry?: string
  schlafli?: string
  aka?: string[]
  notes?: string
}

const UNIFORM = ['Uniform', 'Regular', 'Platonic']
const SEMI = ['Uniform', 'Semi-Regular', 'Archimedean']

const PLATONIC_META: Record<string, Meta> = {
  tetrahedron: {
    categoryPath: UNIFORM,
    wythoff: '3 | 2 3',
    vertexConfiguration: '3.3.3',
    symmetry: 'Td',
    schlafli: '{3,3}',
    notes: 'Self-dual. The simplest polyhedron: four triangles, four vertices.',
  },
  cube: {
    categoryPath: UNIFORM,
    wythoff: '3 | 2 4',
    vertexConfiguration: '4.4.4',
    symmetry: 'Oh',
    schlafli: '{4,3}',
    aka: ['Hexahedron'],
    notes: 'Dual of the octahedron, and the only space-filling Platonic solid.',
  },
  octahedron: {
    categoryPath: UNIFORM,
    wythoff: '4 | 2 3',
    vertexConfiguration: '3.3.3.3',
    symmetry: 'Oh',
    schlafli: '{3,4}',
    notes: 'Dual of the cube. Also the triangular antiprism and square bipyramid.',
  },
  dodecahedron: {
    categoryPath: UNIFORM,
    wythoff: '3 | 2 5',
    vertexConfiguration: '5.5.5',
    symmetry: 'Ih',
    schlafli: '{5,3}',
    notes: 'Dual of the icosahedron. Twelve regular pentagons.',
  },
  icosahedron: {
    categoryPath: UNIFORM,
    wythoff: '5 | 2 3',
    vertexConfiguration: '3.3.3.3.3',
    symmetry: 'Ih',
    schlafli: '{3,5}',
    notes: 'Dual of the dodecahedron. Twenty equilateral triangles.',
  },
}

const ARCHIMEDEAN_META: Record<string, Meta> = {
  'truncated-tetrahedron': {
    categoryPath: SEMI,
    wythoff: '2 3 | 3',
    vertexConfiguration: '3.6.6',
    symmetry: 'Td',
  },
  'truncated-cube': {
    categoryPath: SEMI,
    wythoff: '2 3 | 4',
    vertexConfiguration: '3.8.8',
    symmetry: 'Oh',
  },
  'truncated-octahedron': {
    categoryPath: SEMI,
    wythoff: '2 4 | 3',
    vertexConfiguration: '4.6.6',
    symmetry: 'Oh',
    notes: 'The only Archimedean solid that tiles space on its own.',
  },
  'truncated-dodecahedron': {
    categoryPath: SEMI,
    wythoff: '2 3 | 5',
    vertexConfiguration: '3.10.10',
    symmetry: 'Ih',
  },
  'truncated-icosahedron': {
    categoryPath: SEMI,
    wythoff: '2 5 | 3',
    vertexConfiguration: '5.6.6',
    symmetry: 'Ih',
    aka: ['Buckyball', 'Football'],
  },
  cuboctahedron: {
    categoryPath: SEMI,
    wythoff: '2 | 3 4',
    vertexConfiguration: '3.4.3.4',
    symmetry: 'Oh',
    aka: ['Vector equilibrium'],
  },
  'truncated-cuboctahedron': {
    categoryPath: SEMI,
    wythoff: '2 3 4 |',
    vertexConfiguration: '4.6.8',
    symmetry: 'Oh',
    aka: ['Great rhombicuboctahedron'],
  },
  rhombicuboctahedron: {
    categoryPath: SEMI,
    wythoff: '3 4 | 2',
    vertexConfiguration: '3.4.4.4',
    symmetry: 'Oh',
    aka: ['Small rhombicuboctahedron'],
  },
  'snub-cube': {
    categoryPath: SEMI,
    wythoff: '| 2 3 4',
    vertexConfiguration: '3.3.3.3.4',
    symmetry: 'O',
    notes: 'Chiral: it is not the mirror image of itself.',
  },
  icosidodecahedron: {
    categoryPath: SEMI,
    wythoff: '2 | 3 5',
    vertexConfiguration: '3.5.3.5',
    symmetry: 'Ih',
  },
  'truncated-icosidodecahedron': {
    categoryPath: SEMI,
    wythoff: '2 3 5 |',
    vertexConfiguration: '4.6.10',
    symmetry: 'Ih',
    aka: ['Great rhombicosidodecahedron'],
  },
  rhombicosidodecahedron: {
    categoryPath: SEMI,
    wythoff: '3 5 | 2',
    vertexConfiguration: '3.4.5.4',
    symmetry: 'Ih',
    aka: ['Small rhombicosidodecahedron'],
  },
  'snub-dodecahedron': {
    categoryPath: SEMI,
    wythoff: '| 2 3 5',
    vertexConfiguration: '3.3.3.3.5',
    symmetry: 'I',
    notes: 'Chiral, and the Archimedean solid with the most faces.',
  },
}

function johnsonMeta(index: number): Meta {
  return { categoryPath: ['Johnson Solids'], notes: `Johnson solid J${index}.` }
}

export const datasetSource: CatalogSource = {
  id: 'dataset',
  specs(): PolyhedronSpec[] {
    return data.entries.map((entry) => {
      const meta =
        entry.group === 'platonic'
          ? PLATONIC_META[entry.id]
          : entry.group === 'archimedean'
            ? ARCHIMEDEAN_META[entry.id]
            : johnsonMeta(entry.index ?? 0)

      const resolved: Meta = meta ?? { categoryPath: ['Other'] }
      return {
        id: entry.id,
        name:
          entry.group === 'johnson'
            ? `${entry.name} (J${entry.index})`
            : entry.name,
        aka: resolved.aka,
        categoryPath: resolved.categoryPath,
        wythoff: resolved.wythoff,
        vertexConfiguration: resolved.vertexConfiguration,
        symmetry: resolved.symmetry,
        schlafli: resolved.schlafli,
        notes: resolved.notes,
        build: () => toPolyhedron(entry),
      }
    })
  },
}

/** Direct access for generators that build on top of a known base solid. */
export function baseSolid(id: string): Polyhedron {
  const entry = data.entries.find((e) => e.id === id)
  if (!entry) throw new Error(`Unknown base solid: ${id}`)
  return toPolyhedron(entry)
}
