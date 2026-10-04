import { normalizeScale, type Polyhedron } from '../../geometry/polyhedron'
import { dual } from '../../operations/dual'
import type { CatalogSource, PolyhedronSpec } from '../types'
import { baseSolid } from './dataset'

interface CatalanDef {
  id: string
  name: string
  of: string
  faces: string
  notes?: string
}

const CATALANS: CatalanDef[] = [
  {
    id: 'triakis-tetrahedron',
    name: 'Triakis Tetrahedron',
    of: 'truncated-tetrahedron',
    faces: '12 isosceles triangles',
  },
  {
    id: 'triakis-octahedron',
    name: 'Triakis Octahedron',
    of: 'truncated-cube',
    faces: '24 isosceles triangles',
  },
  {
    id: 'tetrakis-hexahedron',
    name: 'Tetrakis Hexahedron',
    of: 'truncated-octahedron',
    faces: '24 isosceles triangles',
  },
  {
    id: 'triakis-icosahedron',
    name: 'Triakis Icosahedron',
    of: 'truncated-dodecahedron',
    faces: '60 isosceles triangles',
  },
  {
    id: 'pentakis-dodecahedron',
    name: 'Pentakis Dodecahedron',
    of: 'truncated-icosahedron',
    faces: '60 isosceles triangles',
  },
  {
    id: 'rhombic-dodecahedron',
    name: 'Rhombic Dodecahedron',
    of: 'cuboctahedron',
    faces: '12 rhombi',
    notes: 'Space-filling, and the shape of the cell in a honeybee comb base.',
  },
  {
    id: 'disdyakis-dodecahedron',
    name: 'Disdyakis Dodecahedron',
    of: 'truncated-cuboctahedron',
    faces: '48 scalene triangles',
  },
  {
    id: 'deltoidal-icositetrahedron',
    name: 'Deltoidal Icositetrahedron',
    of: 'rhombicuboctahedron',
    faces: '24 kites',
  },
  {
    id: 'pentagonal-icositetrahedron',
    name: 'Pentagonal Icositetrahedron',
    of: 'snub-cube',
    faces: '24 irregular pentagons',
    notes: 'Chiral, like its dual the snub cube.',
  },
  {
    id: 'rhombic-triacontahedron',
    name: 'Rhombic Triacontahedron',
    of: 'icosidodecahedron',
    faces: '30 golden rhombi',
  },
  {
    id: 'disdyakis-triacontahedron',
    name: 'Disdyakis Triacontahedron',
    of: 'truncated-icosidodecahedron',
    faces: '120 scalene triangles',
    notes: 'The Catalan solid with the most faces.',
  },
  {
    id: 'deltoidal-hexecontahedron',
    name: 'Deltoidal Hexecontahedron',
    of: 'rhombicosidodecahedron',
    faces: '60 kites',
  },
  {
    id: 'pentagonal-hexecontahedron',
    name: 'Pentagonal Hexecontahedron',
    of: 'snub-dodecahedron',
    faces: '60 irregular pentagons',
    notes: 'Chiral, like its dual the snub dodecahedron.',
  },
]

export function catalanSolid(archimedeanId: string): Polyhedron {
  return normalizeScale(dual(normalizeScale(baseSolid(archimedeanId), 1), 1), 1)
}

export const catalanSource: CatalogSource = {
  id: 'catalan',
  specs(): PolyhedronSpec[] {
    return CATALANS.map((def) => ({
      id: def.id,
      name: def.name,
      categoryPath: ['Duals', 'Catalan'],
      dualOf: def.of,
      notes: [`${def.faces}.`, def.notes].filter(Boolean).join(' '),
      build: () => catalanSolid(def.of),
    }))
  },
}
