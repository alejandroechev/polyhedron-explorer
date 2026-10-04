/**
 * Renders the app icon from the catalog itself: an orthographic projection of
 * a polyhedron with back-face culling and simple Lambert shading.
 *
 *   npx tsx scripts/generate-icon.ts
 *
 * Writes `src-tauri/icons/icon.svg`; `npx tauri icon` turns the PNG into every
 * platform size.
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { getCatalog } from '../src/domain/catalog'
import { faceInfos, normalizeScale } from '../src/domain/geometry/polyhedron'
import { dot, normalize, type Vec3 } from '../src/domain/geometry/vector'
import { applyMat, type Mat3 } from '../src/domain/geometry/symmetry'

const SIZE = 1024
const MODEL = 'icosidodecahedron'

function rotationX(a: number): Mat3 {
  return [
    [1, 0, 0],
    [0, Math.cos(a), -Math.sin(a)],
    [0, Math.sin(a), Math.cos(a)],
  ]
}

function rotationY(a: number): Mat3 {
  return [
    [Math.cos(a), 0, Math.sin(a)],
    [0, 1, 0],
    [-Math.sin(a), 0, Math.cos(a)],
  ]
}

function compose(a: Mat3, b: Mat3): Mat3 {
  const out = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) out[i][j] += a[i][k] * b[k][j]
  return out as unknown as Mat3
}

const PALETTE: Record<number, [number, number, number]> = {
  3: [255, 122, 89],
  4: [79, 195, 247],
  5: [126, 217, 87],
  6: [255, 209, 102],
  8: [239, 111, 168],
  10: [244, 162, 97],
}

const catalog = getCatalog()
const poly = normalizeScale(catalog.byId.get(MODEL)!.build(), 1)
const rotation = compose(rotationY(0.62), rotationX(-0.42))
const rotated = {
  vertices: poly.vertices.map((v) => applyMat(rotation, v)),
  faces: poly.faces,
}

const light = normalize([0.45, 0.8, 0.75] as Vec3)
const infos = faceInfos(rotated)

const visible = infos
  .map((info, i) => ({ info, i }))
  .filter(({ info }) => info.normal[2] > 0.001)
  .sort((a, b) => a.info.center[2] - b.info.center[2])

const margin = SIZE * 0.14
const scale = (SIZE - 2 * margin) / 2
const project = (v: Vec3) => [
  SIZE / 2 + v[0] * scale,
  SIZE / 2 - v[1] * scale,
]

const parts: string[] = []
for (const { info, i } of visible) {
  const points = rotated.faces[i]
    .map((idx) => project(rotated.vertices[idx]))
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ')
  const base = PALETTE[info.sides] ?? [154, 208, 255]
  const lambert = 0.45 + 0.55 * Math.max(0, dot(info.normal, light))
  const rgb = base.map((c) => Math.round(Math.min(255, c * lambert)))
  parts.push(
    `<polygon points="${points}" fill="rgb(${rgb.join(',')})" stroke="#0b1020" stroke-width="5" stroke-linejoin="round"/>`,
  )
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#121a33"/>
      <stop offset="100%" stop-color="#070b16"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" rx="${SIZE * 0.2}" fill="url(#bg)"/>
  ${parts.join('\n  ')}
</svg>
`

const target = resolve(import.meta.dirname, '../src-tauri/icons/icon.svg')
writeFileSync(target, svg)
console.log(`Wrote ${target}`)
