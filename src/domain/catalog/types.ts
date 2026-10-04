import type { Polyhedron } from '../geometry/polyhedron'

/**
 * Describes one entry in the catalog. Geometry is built lazily so that large
 * families (prisms up to n=40, geodesic spheres, ...) cost nothing until the
 * user actually opens them.
 */
export interface PolyhedronSpec {
  readonly id: string
  readonly name: string
  /** Alternative names, shown in the info panel and matched when searching. */
  readonly aka?: readonly string[]
  /** Hierarchical path, mirroring Stella's category tree. */
  readonly categoryPath: readonly string[]
  readonly wythoff?: string
  readonly vertexConfiguration?: string
  readonly symmetry?: string
  readonly schlafli?: string
  readonly notes?: string
  /** Id of the polyhedron this one is the dual of, when applicable. */
  readonly dualOf?: string
  readonly build: () => Polyhedron
}

export interface CategoryNode {
  readonly name: string
  readonly path: readonly string[]
  readonly children: CategoryNode[]
  readonly specs: PolyhedronSpec[]
  /** Total models in this node and everything beneath it. */
  count: number
}

/**
 * A catalog source contributes a group of specs. New Stella-like features
 * (stellations, facetings, noble polyhedra, ...) plug in by adding a source.
 */
export interface CatalogSource {
  readonly id: string
  readonly specs: () => PolyhedronSpec[]
}
