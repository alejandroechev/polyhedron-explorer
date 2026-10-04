/** Minimal 3D vector maths used by every geometry routine in the app. */

export type Vec3 = readonly [number, number, number]

export const EPS = 1e-6

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k]
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

export function length(a: Vec3): number {
  return Math.sqrt(dot(a, a))
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b))
}

export function normalize(a: Vec3): Vec3 {
  const l = length(a)
  return l < EPS ? [0, 0, 0] : scale(a, 1 / l)
}

export function centroid(points: readonly Vec3[]): Vec3 {
  if (points.length === 0) return [0, 0, 0]
  let x = 0
  let y = 0
  let z = 0
  for (const p of points) {
    x += p[0]
    y += p[1]
    z += p[2]
  }
  return [x / points.length, y / points.length, z / points.length]
}

/**
 * Newell's method: a numerically stable normal for an arbitrary (possibly
 * non-planar or star) polygon.
 */
export function polygonNormal(points: readonly Vec3[]): Vec3 {
  let nx = 0
  let ny = 0
  let nz = 0
  for (let i = 0; i < points.length; i++) {
    const c = points[i]
    const n = points[(i + 1) % points.length]
    nx += (c[1] - n[1]) * (c[2] + n[2])
    ny += (c[2] - n[2]) * (c[0] + n[0])
    nz += (c[0] - n[0]) * (c[1] + n[1])
  }
  return normalize([nx, ny, nz])
}

export function approxEquals(a: Vec3, b: Vec3, eps = 1e-5): boolean {
  return (
    Math.abs(a[0] - b[0]) < eps &&
    Math.abs(a[1] - b[1]) < eps &&
    Math.abs(a[2] - b[2]) < eps
  )
}

/** Rotate `v` around unit axis `axis` by `angle` radians (Rodrigues). */
export function rotateAround(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const k = normalize(axis)
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return add(
    add(scale(v, c), scale(cross(k, v), s)),
    scale(k, dot(k, v) * (1 - c)),
  )
}
