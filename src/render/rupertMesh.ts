import * as THREE from 'three'
import { piercedHost, type RupertPassage } from '../domain/geometry/rupert'
import { buildPolyhedronObjects, type RenderOptions } from './polyhedronMesh'

const HOST_COLOR = 0x67c6f3
const TRAVELLER_COLOR = 0xffb547
const GHOST_OPACITY = 0.16

export function buildRupertObjects(passage: RupertPassage, options: RenderOptions) {
  const settings = { ...options, explode: 0, colorMode: 'single' as const, showFaces: true, showEdges: false }
  const host = buildPolyhedronObjects(piercedHost(passage), settings)
  const traveller = buildPolyhedronObjects(passage.traveller, settings)
  // The uncarved original, so the solid the tunnel was cut from stays readable.
  const ghost = buildPolyhedronObjects(passage.host, {
    ...settings,
    showVertices: false,
    opacity: GHOST_OPACITY,
  })
  const extras: { dispose(): void }[] = []
  for (const [objects, color] of [[host, HOST_COLOR], [traveller, TRAVELLER_COLOR]] as const) {
    for (const child of [...objects.group.children]) {
      if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh) continue
      const material = child.material as THREE.MeshStandardMaterial
      material.vertexColors = false
      material.color.setHex(color)
      child.visible = options.showFaces
      if (options.showEdges) {
        const geometry = new THREE.EdgesGeometry(child.geometry, 1)
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x16243b })
        objects.group.add(new THREE.LineSegments(geometry, lineMaterial))
        extras.push(geometry, lineMaterial)
      }
    }
  }
  for (const child of [...ghost.group.children]) {
    if (!(child instanceof THREE.Mesh)) continue
    const material = child.material as THREE.MeshStandardMaterial
    child.visible = options.showFaces
    material.vertexColors = false
    material.color.setHex(HOST_COLOR)
    material.transparent = true
    material.opacity = GHOST_OPACITY
    material.depthWrite = false
    // Pushed behind the pierced solid, whose faces are coincident with it, so
    // the shell only shows across the carved opening instead of z-fighting.
    material.polygonOffset = true
    material.polygonOffsetFactor = 1
    material.polygonOffsetUnits = 1
    if (options.showEdges) {
      const geometry = new THREE.EdgesGeometry(child.geometry, 1)
      const lineMaterial = new THREE.LineBasicMaterial({
        color: HOST_COLOR,
        transparent: true,
        opacity: 0.35,
      })
      ghost.group.add(new THREE.LineSegments(geometry, lineMaterial))
      extras.push(geometry, lineMaterial)
    }
  }
  const group = new THREE.Group()
  group.add(ghost.group, host.group, traveller.group)
  return {
    group,
    host: host.group,
    ghost: ghost.group,
    traveller: traveller.group,
    dispose() {
      host.dispose()
      traveller.dispose()
      ghost.dispose()
      extras.forEach((resource) => resource.dispose())
      group.clear()
    },
  }
}
