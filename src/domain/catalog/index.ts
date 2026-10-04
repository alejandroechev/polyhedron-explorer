import { catalanSource } from './sources/catalan'
import { compoundsSource } from './sources/compounds'
import { datasetSource } from './sources/dataset'
import { familiesSource } from './sources/families'
import { geodesicSource } from './sources/geodesic'
import { keplerPoinsotSource } from './sources/kepler-poinsot'
import type { CatalogSource, CategoryNode, PolyhedronSpec } from './types'

/**
 * Order the top-level categories the way Stella presents them. Anything not
 * listed is appended alphabetically, so new sources need no change here.
 */
const TOP_LEVEL_ORDER = [
  'Uniform',
  'Duals',
  'Pyramids & Cupolae',
  'Johnson Solids',
  'Compounds',
  'Geodesic',
]

/**
 * Registered catalog sources. Adding a Stella-like feature (stellations,
 * facetings, noble polyhedra, Stewart toroids, ...) means adding a source
 * here; nothing else in the app needs to change.
 */
export const SOURCES: CatalogSource[] = [
  datasetSource,
  keplerPoinsotSource,
  familiesSource,
  catalanSource,
  compoundsSource,
  geodesicSource,
]

export interface Catalog {
  readonly specs: readonly PolyhedronSpec[]
  readonly byId: ReadonlyMap<string, PolyhedronSpec>
  readonly root: CategoryNode
}

function emptyNode(name: string, path: readonly string[]): CategoryNode {
  return { name, path, children: [], specs: [], count: 0 }
}

function insert(root: CategoryNode, spec: PolyhedronSpec): void {
  let node = root
  const path: string[] = []
  for (const part of spec.categoryPath) {
    path.push(part)
    let child = node.children.find((c) => c.name === part)
    if (!child) {
      child = emptyNode(part, [...path])
      node.children.push(child)
    }
    node = child
  }
  node.specs.push(spec)
}

function tally(node: CategoryNode): number {
  node.count = node.specs.length
  for (const child of node.children) node.count += tally(child)
  return node.count
}

function sortTree(node: CategoryNode, depth = 0): void {
  node.children.sort((a, b) => {
    if (depth === 0) {
      const ia = TOP_LEVEL_ORDER.indexOf(a.name)
      const ib = TOP_LEVEL_ORDER.indexOf(b.name)
      if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    }
    return a.name.localeCompare(b.name)
  })
  for (const child of node.children) sortTree(child, depth + 1)
}

let cached: Catalog | null = null

export function buildCatalog(sources: CatalogSource[] = SOURCES): Catalog {
  const specs: PolyhedronSpec[] = []
  for (const source of sources) specs.push(...source.specs())

  const byId = new Map<string, PolyhedronSpec>()
  for (const spec of specs) {
    if (byId.has(spec.id)) {
      throw new Error(`Duplicate polyhedron id: ${spec.id}`)
    }
    byId.set(spec.id, spec)
  }

  const root = emptyNode('All', [])
  for (const spec of specs) insert(root, spec)
  sortTree(root)
  tally(root)

  return { specs, byId, root }
}

export function getCatalog(): Catalog {
  if (!cached) cached = buildCatalog()
  return cached
}

/** Case-insensitive search over names, alternative names and category path. */
export function searchCatalog(
  catalog: Catalog,
  query: string,
): PolyhedronSpec[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const terms = q.split(/\s+/)
  const scored: { spec: PolyhedronSpec; score: number }[] = []

  for (const spec of catalog.specs) {
    const haystack = [
      spec.name,
      spec.id,
      ...(spec.aka ?? []),
      ...spec.categoryPath,
      spec.symmetry ?? '',
      spec.schlafli ?? '',
    ]
      .join(' ')
      .toLowerCase()
    if (!terms.every((t) => haystack.includes(t))) continue

    const name = spec.name.toLowerCase()
    let score = 0
    if (name === q) score += 100
    if (name.startsWith(q)) score += 50
    if (name.includes(q)) score += 25
    score -= spec.name.length / 100
    scored.push({ spec, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.spec)
}

export function findCategory(
  root: CategoryNode,
  path: readonly string[],
): CategoryNode | null {
  let node: CategoryNode = root
  for (const part of path) {
    const child = node.children.find((c) => c.name === part)
    if (!child) return null
    node = child
  }
  return node
}

/** Every spec in a category and all of its descendants. */
export function specsInCategory(node: CategoryNode): PolyhedronSpec[] {
  const out = [...node.specs]
  for (const child of node.children) out.push(...specsInCategory(child))
  return out
}

export type { CategoryNode, PolyhedronSpec } from './types'
