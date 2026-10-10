import * as THREE from 'three'
import { piercedHost, type RupertPassage } from '../domain/geometry/rupert'
import { buildPolyhedronObjects, type RenderOptions } from './polyhedronMesh'

export function buildRupertObjects(passage: RupertPassage, options: RenderOptions) {
  const settings = { ...options, explode: 0, colorMode: 'single' as const, showFaces: true, showEdges: false }
  const host = buildPolyhedronObjects(piercedHost(passage), settings)
  const traveller = buildPolyhedronObjects(passage.traveller, settings)
  const extras: { dispose(): void }[] = []
  for (const [objects, color] of [[host, 0x67c6f3], [traveller, 0xffb547]] as const) {
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
  const group = new THREE.Group()
  group.add(host.group, traveller.group)
  return {
    group,
    traveller: traveller.group,
    dispose() {
      host.dispose()
      traveller.dispose()
      extras.forEach((resource) => resource.dispose())
      group.clear()
    },
  }
}
