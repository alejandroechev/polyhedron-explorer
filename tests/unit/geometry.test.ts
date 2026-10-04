import { describe, expect, it } from 'vitest'

import {
  computeEdges,
  computeMetrics,
  normalizeScale,
  orientOutward,
  weld,
} from '../../src/domain/geometry/polyhedron'
import { earClip, starOutline, triangulateFace } from '../../src/domain/geometry/triangulate'
import { rotationGroup } from '../../src/domain/geometry/symmetry'
import { componentCount } from '../../src/domain/geometry/components'
import { buildCatalog } from '../../src/domain/catalog'
import { baseSolid } from '../../src/domain/catalog/sources/dataset'
import { dual } from '../../src/domain/operations/dual'
import type { Vec3 } from '../../src/domain/geometry/vector'

describe('metrics', () => {
  it('matches the known counts for the Platonic solids', () => {
    const cases: [string, number, number, number][] = [
      ['tetrahedron', 4, 6, 4],
      ['cube', 8, 12, 6],
      ['octahedron', 6, 12, 8],
      ['dodecahedron', 20, 30, 12],
      ['icosahedron', 12, 30, 20],
    ]
    for (const [id, v, e, f] of cases) {
      const m = computeMetrics(baseSolid(id))
      expect([id, m.vertexCount, m.edgeCount, m.faceCount]).toEqual([id, v, e, f])
      expect(m.eulerCharacteristic).toBe(2)
    }
  })

  it('computes the volume of a unit-circumradius cube', () => {
    const cube = normalizeScale(baseSolid('cube'), 1)
    // Edge = 2/sqrt(3) when the circumradius is 1.
    const edge = 2 / Math.sqrt(3)
    expect(computeMetrics(cube).volume).toBeCloseTo(edge ** 3, 4)
    expect(computeMetrics(cube).surfaceArea).toBeCloseTo(6 * edge ** 2, 4)
  })

  it('reports every Platonic solid as regular faced', () => {
    for (const id of ['tetrahedron', 'cube', 'octahedron', 'dodecahedron', 'icosahedron']) {
      expect(computeMetrics(baseSolid(id)).isRegularFaced).toBe(true)
    }
  })
})

describe('weld', () => {
  it('merges coincident vertices and drops degenerate faces', () => {
    const poly = {
      vertices: [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ] as Vec3[],
      faces: [
        [0, 1, 2],
        [3, 1, 2],
      ],
    }
    const welded = weld(poly)
    expect(welded.vertices).toHaveLength(3)
    expect(welded.faces).toHaveLength(2)
  })
})

describe('orientOutward', () => {
  it('flips inward-facing loops', () => {
    const cube = baseSolid('cube')
    const flipped = { vertices: cube.vertices, faces: cube.faces.map((f) => [...f].reverse()) }
    const fixed = orientOutward(flipped)
    expect(computeMetrics(fixed).volume).toBeCloseTo(computeMetrics(cube).volume, 6)
  })
})

describe('dual', () => {
  it('swaps vertices and faces', () => {
    const cube = normalizeScale(baseSolid('cube'), 1)
    const d = computeMetrics(dual(cube, 1))
    expect([d.vertexCount, d.edgeCount, d.faceCount]).toEqual([6, 12, 8])
  })

  it('is an involution up to scale', () => {
    const ico = normalizeScale(baseSolid('icosahedron'), 1)
    const back = computeMetrics(normalizeScale(dual(normalizeScale(dual(ico, 1), 1), 1), 1))
    expect([back.vertexCount, back.edgeCount, back.faceCount]).toEqual([12, 30, 20])
  })
})

describe('edges', () => {
  it('counts each undirected edge once', () => {
    expect(computeEdges(baseSolid('dodecahedron'))).toHaveLength(30)
  })
})

describe('triangulation', () => {
  it('fans a convex face from its centroid', () => {
    const square: Vec3[] = [
      [1, 1, 0],
      [-1, 1, 0],
      [-1, -1, 0],
      [1, -1, 0],
    ]
    expect(triangulateFace(square, 1)).toHaveLength(12)
  })

  it('traces a pentagram outline into ten points', () => {
    const pts: [number, number][] = []
    for (let i = 0; i < 5; i++) {
      const a = (2 * Math.PI * ((i * 2) % 5)) / 5
      pts.push([Math.cos(a), Math.sin(a)])
    }
    const outline = starOutline(pts)
    expect(outline).toHaveLength(10)
    expect(earClip(outline).length).toBeGreaterThanOrEqual(6)
  })

  it('covers the true area of a pentagram rather than its convex hull', () => {
    const points: Vec3[] = []
    for (let i = 0; i < 5; i++) {
      const a = (2 * Math.PI * ((i * 2) % 5)) / 5
      points.push([Math.cos(a), Math.sin(a), 0])
    }
    const tris = triangulateFace(points, 2)
    let area = 0
    for (let i = 0; i < tris.length; i += 3) {
      const [p, q, r] = [tris[i], tris[i + 1], tris[i + 2]]
      area +=
        Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])) / 2
    }
    // Pentagram area with circumradius 1; the convex hull would be 2.3776.
    expect(area).toBeCloseTo(1.12257, 3)
  })
})

describe('rotationGroup', () => {
  it('finds 24 rotations for the cube and 60 for the dodecahedron', () => {
    expect(rotationGroup(baseSolid('cube'))).toHaveLength(24)
    expect(rotationGroup(baseSolid('dodecahedron'))).toHaveLength(60)
  })
})

describe('components', () => {
  it('counts a single solid as one piece', () => {
    expect(componentCount(baseSolid('cube'))).toBe(1)
  })

  it('separates the pieces of a compound', () => {
    const catalog = buildCatalog()
    expect(componentCount(catalog.byId.get('compound-five-cubes')!.build())).toBe(5)
    expect(componentCount(catalog.byId.get('stella-octangula')!.build())).toBe(2)
    expect(componentCount(catalog.byId.get('compound-ten-tetrahedra')!.build())).toBe(10)
  })
})

describe('face symbols', () => {
  it('reports pentagrams as {5/2}', () => {
    const catalog = buildCatalog()
    const m = computeMetrics(catalog.byId.get('small-stellated-dodecahedron')!.build())
    expect([...m.faceSymbols]).toEqual([['5/2', 12]])
  })

  it('reports ordinary pentagons as {5}', () => {
    const m = computeMetrics(baseSolid('dodecahedron'))
    expect([...m.faceSymbols]).toEqual([['5', 12]])
  })
})
