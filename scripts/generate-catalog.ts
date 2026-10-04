/**
 * Regenerates `src/data/polyhedra.json` from the Encyclopedia of Polyhedra
 * mathematical data (see NOTICE for attribution and terms).
 *
 * Only the Platonic, Archimedean and Johnson solids are sourced here. Every
 * other family in the catalog is generated from first principles at runtime.
 *
 *   npm run gen:catalog
 */
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import {
  center,
  normalizeScale,
  orientOutward,
  weld,
  type Polyhedron,
} from '../src/domain/geometry/polyhedron'
import type { Vec3 } from '../src/domain/geometry/vector'

const require = createRequire(import.meta.url)

interface HartModel {
  name: string
  category: string[]
  vertex: number[][]
  edge: number[][]
  face: number[][]
}

type HartFile = Record<string, HartModel>

const platonic = require('polyhedra/data/platonic.json') as HartFile
const archimedean = require('polyhedra/data/archimedean.json') as HartFile
const johnson = require('polyhedra/data/johnson.json') as HartFile

/** Hart's spellings differ from the conventional ones in a few places. */
const NAME_FIXES: Record<string, string> = {
  TruncatedCubocahedron: 'Truncated Cuboctahedron',
  Rhombicubocahedron: 'Rhombicuboctahedron',
  SnubCuboctahedron: 'Snub Cube',
  SnubIcosidodecahedron: 'Snub Dodecahedron',
  TruncatedIcosidodecahedron: 'Truncated Icosidodecahedron',
  Rhombicosidodecahedron: 'Rhombicosidodecahedron',
}

function titleise(key: string, fallback: string): string {
  if (NAME_FIXES[key]) return NAME_FIXES[key]
  return fallback.replace(/\s*\(J\d+\)\s*$/, '').trim()
}

function round(value: number): number {
  return Math.round(value * 1e7) / 1e7
}

function prepare(model: HartModel): Polyhedron {
  const raw: Polyhedron = {
    vertices: model.vertex.map((v) => [v[0], v[1], v[2]] as Vec3),
    faces: model.face,
  }
  return orientOutward(normalizeScale(center(weld(raw, 1e-5)), 1))
}

interface Entry {
  id: string
  name: string
  group: 'platonic' | 'archimedean' | 'johnson'
  index?: number
  vertices: number[][]
  faces: number[][]
}

const entries: Entry[] = []

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

for (const [key, model] of Object.entries(platonic)) {
  const name = titleise(key, model.name)
  const poly = prepare(model)
  entries.push({
    id: slug(name),
    name,
    group: 'platonic',
    vertices: poly.vertices.map((v) => v.map(round)),
    faces: poly.faces.map((f) => [...f]),
  })
}

for (const [key, model] of Object.entries(archimedean)) {
  const name = titleise(key, model.name)
  const poly = prepare(model)
  entries.push({
    id: slug(name),
    name,
    group: 'archimedean',
    vertices: poly.vertices.map((v) => v.map(round)),
    faces: poly.faces.map((f) => [...f]),
  })
}

for (const [key, model] of Object.entries(johnson)) {
  const index = Number(key.slice(1))
  const name = titleise(key, model.name)
  const poly = prepare(model)
  entries.push({
    id: `j${index}`,
    name,
    group: 'johnson',
    index,
    vertices: poly.vertices.map((v) => v.map(round)),
    faces: poly.faces.map((f) => [...f]),
  })
}

entries.sort((a, b) => {
  if (a.group !== b.group) return a.group.localeCompare(b.group)
  if (a.index != null && b.index != null) return a.index - b.index
  return a.name.localeCompare(b.name)
})

const out = {
  attribution:
    'Mathematical data derived from the Encyclopedia of Polyhedra by George W. Hart. ' +
    'Reproduced for non-commercial use. See NOTICE.',
  generated: new Date().toISOString().slice(0, 10),
  entries,
}

const target = resolve(import.meta.dirname, '../src/data/polyhedra.json')
writeFileSync(target, `${JSON.stringify(out)}\n`)
console.log(`Wrote ${entries.length} models to ${target}`)
