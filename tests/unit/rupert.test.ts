import { describe, expect, it } from 'vitest'
import { baseSolid } from '../../src/domain/catalog/sources/dataset'
import { faceInfos, normalizeScale, volume } from '../../src/domain/geometry/polyhedron'
import { findRupertPassage, isConvexSolid, passagePosition, piercedHost, projectionClearance, projectionHull } from '../../src/domain/geometry/rupert'
import { distance, dot, type Vec3 } from '../../src/domain/geometry/vector'
import * as THREE from 'three'
import { buildRupertObjects } from '../../src/render/rupertMesh'
import { DEFAULT_RENDER_OPTIONS } from '../../src/render/polyhedronMesh'
import { buildCatalog } from '../../src/domain/catalog'

describe('Rupert passages', () => {
  it.each(['tetrahedron', 'cube', 'octahedron', 'dodecahedron', 'icosahedron'])(
    'finds a strictly fitting, congruent passage for the %s', (id) => {
      const poly = normalizeScale(baseSolid(id))
      const result = findRupertPassage(poly)
      expect(result.status).toBe('available')
      if (result.status !== 'available') return
      const { host, traveller, opening, clearance } = result.passage
      expect(clearance).toBeGreaterThan(0)
      expect(projectionClearance(projectionHull(host.vertices), opening)).toBeGreaterThan(0)
      expect(projectionClearance(opening, traveller.vertices.map(([x, y]) => [x, y]))).toBeGreaterThan(0)
      for (let i = 0; i < poly.vertices.length; i++) {
        for (let j = 0; j < i; j++) {
          expect(distance(traveller.vertices[i], traveller.vertices[j])).toBeCloseTo(distance(poly.vertices[i], poly.vertices[j]), 10)
        }
      }
      const cut = piercedHost(result.passage)
      expect(cut.faces.length).toBeGreaterThan(0)
      expect(volume(cut)).toBeGreaterThan(0)
      expect(volume(cut)).toBeLessThan(volume(host))
      expect(cut.vertices.flat().every(Number.isFinite)).toBe(true)
      const walls = faceInfos(cut).slice(-opening.length)
      walls.forEach((wall, i) => {
        const a = opening[i]
        const b = opening[(i + 1) % opening.length]
        const inward: Vec3 = [a[1] - b[1], b[0] - a[0], 0]
        expect(wall.area).toBeGreaterThan(0)
        expect(dot(wall.normal, inward)).toBeCloseTo(Math.hypot(...inward), 6)
      })

      const objects = buildRupertObjects(result.passage, DEFAULT_RENDER_OPTIONS)
      objects.group.updateMatrixWorld(true)
      const hostGroup = objects.group.children[0]
      const surfaces = hostGroup.children.filter((object) => object instanceof THREE.Mesh)
      // Every traveller vertex has an unobstructed path through the entire cut solid.
      for (const [x, y] of traveller.vertices) {
        const ray = new THREE.Raycaster(new THREE.Vector3(x, y, -3), new THREE.Vector3(0, 0, 1))
        expect(ray.intersectObjects(surfaces)).toHaveLength(0)
      }
      expect(surfaces.length).toBeGreaterThan(0)
      objects.dispose()
    }, 30000,
  )

  it('does not claim that a failed search disproves the property', () => {
    expect(findRupertPassage(normalizeScale(baseSolid('cube')), 0).status).toBe('not-found')
  })

  it('rejects open surfaces', () => {
    const poly = normalizeScale(baseSolid('cube'))
    expect(findRupertPassage({ ...poly, faces: poly.faces.slice(1) }).status).toBe('unsupported')
  })

  it('rejects stars and compounds rather than treating them as convex hulls', () => {
    const catalog = buildCatalog()
    for (const id of ['small-stellated-dodecahedron', 'compound-five-cubes']) {
      expect(findRupertPassage(normalizeScale(catalog.byId.get(id)!.build())).status).toBe('unsupported')
    }
  })

  it('accepts the rounded coordinates of every Archimedean solid', () => {
    for (const spec of buildCatalog().specs.filter((s) => s.categoryPath.includes('Archimedean'))) {
      expect(isConvexSolid(normalizeScale(spec.build())), spec.id).toBe(true)
    }
  })

  it('pads around the projection interior even when the origin is outside the solid', () => {
    const cube = baseSolid('cube')
    const shifted = normalizeScale({
      ...cube,
      vertices: cube.vertices.map(([x, y, z]): Vec3 => [x + 2, y, z]),
    })
    const result = findRupertPassage(shifted)
    expect(result.status).toBe('available')
    if (result.status !== 'available') return
    const { opening, traveller } = result.passage
    expect(projectionClearance(opening, projectionHull(traveller.vertices))).toBeGreaterThan(0)
  })

  it('renders edge-only passages without visible faces and disposes both copies', () => {
    const result = findRupertPassage(normalizeScale(baseSolid('cube')))
    if (result.status !== 'available') throw new Error('Missing cube passage')
    const objects = buildRupertObjects(result.passage, { ...DEFAULT_RENDER_OPTIONS, showFaces: false })
    let edges = 0
    objects.group.traverse((object) => {
      if (object instanceof THREE.LineSegments) edges++
      if (object instanceof THREE.Mesh) expect(object.visible).toBe(false)
    })
    expect(edges).toBe(2)
    objects.dispose()
    expect(objects.group.children).toHaveLength(0)
    expect(objects.traveller.children).toHaveLength(0)
  })

  it('loops smoothly through both sides without teleporting', () => {
    expect(passagePosition(0)).toBe(-2.5)
    expect(passagePosition(3)).toBeCloseTo(0)
    expect(passagePosition(6)).toBe(2.5)
    expect(passagePosition(12)).toBe(-2.5)
    expect(passagePosition(12 - 0.001)).toBeCloseTo(passagePosition(0.001), 8)
  })
})
