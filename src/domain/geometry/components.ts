import { type Polyhedron } from './polyhedron'

/**
 * Label each face with the index of the connected piece it belongs to, where
 * two faces are connected when they share a vertex. Compounds come out as one
 * label per constituent solid, which lets the viewer colour them separately.
 */
export function faceComponents(poly: Polyhedron): number[] {
  const parent = poly.vertices.map((_, i) => i)
  const find = (x: number): number => {
    let root = x
    while (parent[root] !== root) root = parent[root]
    while (parent[x] !== root) {
      const next = parent[x]
      parent[x] = root
      x = next
    }
    return root
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[rb] = ra
  }

  for (const face of poly.faces) {
    for (let i = 1; i < face.length; i++) union(face[0], face[i])
  }

  const labels = new Map<number, number>()
  return poly.faces.map((face) => {
    const root = find(face[0])
    let label = labels.get(root)
    if (label == null) {
      label = labels.size
      labels.set(root, label)
    }
    return label
  })
}

/** How many disconnected pieces the model is made of. */
export function componentCount(poly: Polyhedron): number {
  const labels = faceComponents(poly)
  return labels.length === 0 ? 0 : Math.max(...labels) + 1
}
