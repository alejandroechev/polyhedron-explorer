import {
  centroid,
  dot,
  EPS,
  polygonNormal,
  scale,
  type Vec3,
} from '../geometry/vector'
import {
  edgeKey,
  orientOutward,
  type Polyhedron,
} from '../geometry/polyhedron'

/**
 * Polar reciprocal (dual) about a sphere of radius `radius` centred at the
 * origin.
 *
 * Each face of the original becomes a vertex of the dual, placed at
 * `n * r^2 / d` where `n` is the face normal and `d` the plane's distance from
 * the centre. Each original vertex becomes a dual face, whose vertex loop is
 * recovered by walking the faces around that vertex through shared edges. The
 * edge walk — rather than an angular sort — keeps star polyhedra correct.
 */
export function dual(poly: Polyhedron, radius = 1): Polyhedron {
  const faceCount = poly.faces.length
  const dualVertices: Vec3[] = []

  for (const face of poly.faces) {
    const points = face.map((i) => poly.vertices[i])
    const n = polygonNormal(points)
    const d = dot(n, centroid(points))
    if (Math.abs(d) < EPS) {
      // Face plane passes through the centre; the dual vertex is at infinity.
      dualVertices.push([0, 0, 0])
    } else {
      dualVertices.push(scale(n, (radius * radius) / d))
    }
  }

  // For each original vertex: the incident faces keyed by the edge they use.
  const incident = new Map<number, Map<string, number[]>>()
  for (let f = 0; f < faceCount; f++) {
    const face = poly.faces[f]
    for (let i = 0; i < face.length; i++) {
      const v = face[i]
      const prev = face[(i + face.length - 1) % face.length]
      const next = face[(i + 1) % face.length]
      let byEdge = incident.get(v)
      if (!byEdge) {
        byEdge = new Map()
        incident.set(v, byEdge)
      }
      for (const other of [prev, next]) {
        const key = edgeKey(v, other)
        const bucket = byEdge.get(key)
        if (bucket) bucket.push(f)
        else byEdge.set(key, [f])
      }
    }
  }

  const dualFaces: number[][] = []
  for (let v = 0; v < poly.vertices.length; v++) {
    const byEdge = incident.get(v)
    if (!byEdge) continue
    const allFaces = new Set<number>()
    for (const bucket of byEdge.values()) for (const f of bucket) allFaces.add(f)
    if (allFaces.size < 3) continue

    const start = [...allFaces][0]
    const loop: number[] = [start]
    const visited = new Set<number>([start])
    let current = start
    let guard = 0
    while (guard++ < allFaces.size + 2) {
      let nextFace = -1
      for (const bucket of byEdge.values()) {
        if (bucket.length !== 2) continue
        if (bucket[0] === current && !visited.has(bucket[1])) nextFace = bucket[1]
        else if (bucket[1] === current && !visited.has(bucket[0])) nextFace = bucket[0]
        if (nextFace >= 0) break
      }
      if (nextFace < 0) break
      loop.push(nextFace)
      visited.add(nextFace)
      current = nextFace
    }
    if (loop.length >= 3) dualFaces.push(loop)
  }

  return orientOutward({ vertices: dualVertices, faces: dualFaces })
}
