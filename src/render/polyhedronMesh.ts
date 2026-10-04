import * as THREE from 'three'

import { faceComponents } from '../domain/geometry/components'
import {
  computeEdges,
  faceInfos,
  type Polyhedron,
} from '../domain/geometry/polyhedron'
import { triangulateFace } from '../domain/geometry/triangulate'
import type { Vec3 } from '../domain/geometry/vector'

export type ColorMode =
  | 'faceType'
  | 'component'
  | 'symmetry'
  | 'single'
  | 'rainbow'

export interface RenderOptions {
  readonly showFaces: boolean
  readonly showEdges: boolean
  readonly showVertices: boolean
  readonly opacity: number
  readonly colorMode: ColorMode
  /** 0 = assembled, 1 = faces pushed one radius outwards. */
  readonly explode: number
  readonly metalness: number
}

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  showFaces: true,
  showEdges: true,
  showVertices: false,
  opacity: 1,
  colorMode: 'faceType',
  explode: 0,
  metalness: 0.25,
}

/**
 * Colours keyed by the number of sides, so a model reads at a glance:
 * triangles warm, squares cool, pentagons green, and so on.
 */
const FACE_TYPE_COLORS: Record<number, number> = {
  3: 0xff7a59,
  4: 0x4fc3f7,
  5: 0x7ed957,
  6: 0xffd166,
  7: 0xc792ea,
  8: 0xef6fa8,
  9: 0x5eead4,
  10: 0xf4a261,
  12: 0x9ad0ff,
}

interface ColorContext {
  readonly sides: number
  readonly index: number
  readonly total: number
  readonly component: number
  readonly componentCount: number
}

function faceColor(mode: ColorMode, ctx: ColorContext): THREE.Color {
  const { sides, index, total, component, componentCount } = ctx
  switch (mode) {
    case 'single':
      return new THREE.Color(0x6ea8ff)
    case 'rainbow':
      return new THREE.Color().setHSL(index / Math.max(1, total), 0.62, 0.58)
    case 'component':
      return new THREE.Color().setHSL(
        component / Math.max(1, componentCount),
        0.6,
        0.58,
      )
    case 'symmetry':
      return new THREE.Color().setHSL((sides * 0.17) % 1, 0.5, 0.6)
    case 'faceType':
    default:
      return new THREE.Color(
        FACE_TYPE_COLORS[sides] ??
          new THREE.Color().setHSL(((sides * 0.31) % 1), 0.55, 0.6).getHex(),
      )
  }
}

export interface PolyhedronObjects {
  readonly group: THREE.Group
  dispose(): void
}

/**
 * Build the three.js objects for a polyhedron. Faces are rendered double-sided
 * with per-vertex colours; star faces are triangulated into their true visible
 * outline so pentagrams look like stars, not pentagons.
 */
export function buildPolyhedronObjects(
  poly: Polyhedron,
  options: RenderOptions,
): PolyhedronObjects {
  const group = new THREE.Group()
  const disposables: { dispose(): void }[] = []
  const infos = faceInfos(poly)
  const components = faceComponents(poly)
  const totalComponents = components.length ? Math.max(...components) + 1 : 1

  if (options.showFaces) {
    const positions: number[] = []
    const normals: number[] = []
    const colors: number[] = []

    infos.forEach((info, i) => {
      const points = poly.faces[i].map((idx) => poly.vertices[idx])
      const offset: Vec3 = [
        info.normal[0] * options.explode,
        info.normal[1] * options.explode,
        info.normal[2] * options.explode,
      ]
      const tris = triangulateFace(points, info.density)
      const color = faceColor(options.colorMode, {
        sides: info.sides,
        index: i,
        total: infos.length,
        component: components[i],
        componentCount: totalComponents,
      })
      for (const p of tris) {
        positions.push(p[0] + offset[0], p[1] + offset[1], p[2] + offset[2])
        normals.push(info.normal[0], info.normal[1], info.normal[2])
        colors.push(color.r, color.g, color.b)
      }
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: options.opacity < 1,
      opacity: options.opacity,
      roughness: 0.42,
      metalness: options.metalness,
      flatShading: true,
      depthWrite: options.opacity >= 1,
    })

    const mesh = new THREE.Mesh(geometry, material)
    group.add(mesh)
    disposables.push(geometry, material)
  }

  if (options.showEdges) {
    const positions: number[] = []
    if (options.explode > 0) {
      // When exploded, draw each face's own boundary so edges travel with it.
      infos.forEach((info, i) => {
        const face = poly.faces[i]
        for (let k = 0; k < face.length; k++) {
          const a = poly.vertices[face[k]]
          const b = poly.vertices[face[(k + 1) % face.length]]
          const o = info.normal
          positions.push(
            a[0] + o[0] * options.explode,
            a[1] + o[1] * options.explode,
            a[2] + o[2] * options.explode,
            b[0] + o[0] * options.explode,
            b[1] + o[1] * options.explode,
            b[2] + o[2] * options.explode,
          )
        }
      })
    } else {
      for (const edge of computeEdges(poly)) {
        const a = poly.vertices[edge.a]
        const b = poly.vertices[edge.b]
        positions.push(a[0], a[1], a[2], b[0], b[1], b[2])
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const material = new THREE.LineBasicMaterial({
      color: 0x0c1226,
      transparent: true,
      opacity: 0.9,
    })
    group.add(new THREE.LineSegments(geometry, material))
    disposables.push(geometry, material)
  }

  if (options.showVertices) {
    const geometry = new THREE.SphereGeometry(0.028, 12, 10)
    const material = new THREE.MeshStandardMaterial({
      color: 0xfff2b2,
      roughness: 0.3,
      metalness: 0.1,
    })
    const mesh = new THREE.InstancedMesh(geometry, material, poly.vertices.length)
    const matrix = new THREE.Matrix4()
    poly.vertices.forEach((v, i) => {
      matrix.makeTranslation(v[0], v[1], v[2])
      mesh.setMatrixAt(i, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    group.add(mesh)
    disposables.push(geometry, material)
  }

  return {
    group,
    dispose() {
      for (const d of disposables) d.dispose()
      group.clear()
    },
  }
}
