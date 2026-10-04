import { computeMetrics } from '../geometry/polyhedron'
import type { PolyhedronSpec } from './types'

/**
 * Structural checks shared by the test suite and the standalone validation
 * script: a model must build, be non-degenerate, and close up into a surface.
 */
export function validateSpec(spec: PolyhedronSpec): string[] {
  const problems: string[] = []
  let poly
  try {
    poly = spec.build()
  } catch (error) {
    return [`build threw: ${(error as Error).message}`]
  }

  if (poly.vertices.length < 4) problems.push('fewer than 4 vertices')
  if (poly.faces.length < 4) problems.push('fewer than 4 faces')

  for (const [i, face] of poly.faces.entries()) {
    if (face.length < 3) problems.push(`face ${i} has ${face.length} vertices`)
    if (new Set(face).size !== face.length) problems.push(`face ${i} repeats a vertex`)
    for (const v of face) {
      if (v < 0 || v >= poly.vertices.length) problems.push(`face ${i} index ${v} out of range`)
    }
  }

  for (const [i, v] of poly.vertices.entries()) {
    if (!v.every(Number.isFinite)) problems.push(`vertex ${i} is not finite`)
  }

  const metrics = computeMetrics(poly)
  if (metrics.volume <= 0) problems.push('non-positive volume')
  if (metrics.surfaceArea <= 0) problems.push('non-positive surface area')
  if (metrics.circumradius <= 0) problems.push('non-positive circumradius')

  return problems
}
