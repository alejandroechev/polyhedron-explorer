/**
 * Builds every model in the catalog and checks it for structural sanity.
 * Run with `npx tsx scripts/validate-catalog.ts`; also exercised by the tests.
 */
import { buildCatalog } from '../src/domain/catalog'
import { validateSpec } from '../src/domain/catalog/validate'

const catalog = buildCatalog()
let failures = 0

for (const spec of catalog.specs) {
  const problems = validateSpec(spec)
  if (problems.length > 0) {
    failures++
    console.error(`✗ ${spec.id} (${spec.name})`)
    for (const p of problems) console.error(`    ${p}`)
  }
}

console.log(`${catalog.specs.length} models, ${failures} with problems`)
process.exit(failures > 0 ? 1 : 0)
