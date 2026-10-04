import {
  orientOutward,
  weld,
  type Polyhedron,
} from '../../geometry/polyhedron'
import { normalize, type Vec3 } from '../../geometry/vector'
import type { CatalogSource, PolyhedronSpec } from '../types'
import { baseSolid } from './dataset'

/**
 * Class I geodesic sphere: each face of the base solid is divided into a
 * triangular grid of frequency `frequency`, then every vertex is pushed out
 * onto the circumscribed sphere.
 */
export function geodesicSphere(frequency: number, baseId = 'icosahedron'): Polyhedron {
  const base = baseSolid(baseId)
  const vertices: Vec3[] = []
  const faces: number[][] = []

  for (const face of base.faces) {
    // Fan non-triangular faces so the subdivision works on any base solid.
    for (let t = 1; t < face.length - 1; t++) {
      const a = base.vertices[face[0]]
      const b = base.vertices[face[t]]
      const c = base.vertices[face[t + 1]]

      const grid: number[][] = []
      for (let i = 0; i <= frequency; i++) {
        const row: number[] = []
        for (let j = 0; j <= i; j++) {
          const u = i / frequency
          const v = i === 0 ? 0 : j / i
          const p: Vec3 = [
            a[0] + (b[0] - a[0]) * u * (1 - v) + (c[0] - a[0]) * u * v,
            a[1] + (b[1] - a[1]) * u * (1 - v) + (c[1] - a[1]) * u * v,
            a[2] + (b[2] - a[2]) * u * (1 - v) + (c[2] - a[2]) * u * v,
          ]
          row.push(vertices.push(normalize(p)) - 1)
        }
        grid.push(row)
      }

      for (let i = 0; i < frequency; i++) {
        for (let j = 0; j <= i; j++) {
          faces.push([grid[i][j], grid[i + 1][j], grid[i + 1][j + 1]])
          if (j < i) faces.push([grid[i][j], grid[i + 1][j + 1], grid[i][j + 1]])
        }
      }
    }
  }

  return orientOutward(weld({ vertices, faces }, 1e-6))
}

/** The upper half of a geodesic sphere, closed off with a polygonal base. */
export function geodesicDome(frequency: number): Polyhedron {
  const sphere = geodesicSphere(frequency)
  const keep = sphere.faces.filter((face) => {
    const z = face.reduce((s, i) => s + sphere.vertices[i][2], 0) / face.length
    return z > -1e-6
  })
  return orientOutward(weld({ vertices: sphere.vertices, faces: keep }, 1e-6))
}

export const geodesicSource: CatalogSource = {
  id: 'geodesic',
  specs(): PolyhedronSpec[] {
    const specs: PolyhedronSpec[] = []
    for (let f = 1; f <= 8; f++) {
      specs.push({
        id: `geodesic-sphere-${f}v`,
        name: `Geodesic Sphere ${f}V`,
        categoryPath: ['Geodesic', 'Spheres'],
        symmetry: 'Ih',
        notes: `Icosahedral class I geodesic sphere, frequency ${f}.`,
        build: () => geodesicSphere(f),
      })
    }
    for (let f = 2; f <= 6; f++) {
      specs.push({
        id: `geodesic-dome-${f}v`,
        name: `Geodesic Dome ${f}V`,
        categoryPath: ['Geodesic', 'Domes'],
        notes: `Upper hemisphere of the frequency ${f} geodesic sphere.`,
        build: () => geodesicDome(f),
      })
    }
    return specs
  },
}
