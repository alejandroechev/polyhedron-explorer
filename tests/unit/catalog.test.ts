import { describe, expect, it } from 'vitest'

import { buildCatalog, searchCatalog, specsInCategory } from '../../src/domain/catalog'
import { validateSpec } from '../../src/domain/catalog/validate'
import { computeMetrics } from '../../src/domain/geometry/polyhedron'

const catalog = buildCatalog()

describe('catalog', () => {
  it('has unique ids and a populated tree', () => {
    expect(catalog.specs.length).toBeGreaterThan(200)
    expect(catalog.byId.size).toBe(catalog.specs.length)
    expect(catalog.root.count).toBe(catalog.specs.length)
  })

  it('contains all 92 Johnson solids', () => {
    const johnson = catalog.specs.filter((s) => s.categoryPath[0] === 'Johnson Solids')
    expect(johnson).toHaveLength(92)
    for (let i = 1; i <= 92; i++) expect(catalog.byId.has(`j${i}`)).toBe(true)
  })

  it('contains the 5 Platonic, 13 Archimedean, 4 Kepler-Poinsot and 13 Catalan solids', () => {
    const count = (path: string) =>
      catalog.specs.filter((s) => s.categoryPath.join('/') === path).length
    expect(count('Uniform/Regular/Platonic')).toBe(5)
    expect(count('Uniform/Semi-Regular/Archimedean')).toBe(13)
    expect(count('Uniform/Regular/Kepler-Poinsot')).toBe(4)
    expect(count('Duals/Catalan')).toBe(13)
  })

  it('builds every model without structural problems', () => {
    for (const spec of catalog.specs) {
      expect([spec.id, validateSpec(spec)]).toEqual([spec.id, []])
    }
  })

  it('searches by name, alias and category', () => {
    expect(searchCatalog(catalog, 'buckyball')[0].id).toBe('truncated-icosahedron')
    expect(searchCatalog(catalog, 'icosahedron')[0].id).toBe('icosahedron')
    expect(searchCatalog(catalog, 'kepler')).toHaveLength(4)
    expect(searchCatalog(catalog, '')).toEqual([])
  })

  it('rolls child specs up into parent categories', () => {
    const uniform = catalog.root.children.find((c) => c.name === 'Uniform')!
    expect(specsInCategory(uniform).length).toBe(uniform.count)
  })
})

describe('known models', () => {
  const expected: Record<string, [number, number, number]> = {
    'small-stellated-dodecahedron': [12, 30, 12],
    'great-dodecahedron': [12, 30, 12],
    'great-stellated-dodecahedron': [20, 30, 12],
    'great-icosahedron': [12, 30, 20],
    'rhombic-triacontahedron': [32, 60, 30],
    'rhombic-dodecahedron': [14, 24, 12],
    'stella-octangula': [8, 12, 8],
    'compound-five-cubes': [40, 60, 30],
    'compound-ten-tetrahedra': [40, 60, 40],
    'prism-6': [12, 18, 8],
    'antiprism-5': [10, 20, 12],
    'geodesic-sphere-3v': [92, 270, 180],
    'truncated-icosahedron': [60, 90, 32],
    j1: [5, 8, 5],
    j92: [18, 36, 20],
  }

  for (const [id, counts] of Object.entries(expected)) {
    it(`${id} has the expected V/E/F`, () => {
      const m = computeMetrics(catalog.byId.get(id)!.build())
      expect([m.vertexCount, m.edgeCount, m.faceCount]).toEqual(counts)
    })
  }

  it('gives the uniform prisms and antiprisms equal edge lengths', () => {
    for (const id of ['prism-7', 'prism-12', 'antiprism-6', 'antiprism-11']) {
      expect(computeMetrics(catalog.byId.get(id)!.build()).isRegularFaced).toBe(true)
    }
  })

  it('keeps every Johnson solid regular faced', () => {
    for (let i = 1; i <= 92; i++) {
      const m = computeMetrics(catalog.byId.get(`j${i}`)!.build())
      expect([`j${i}`, m.isRegularFaced]).toEqual([`j${i}`, true])
    }
  })
})
