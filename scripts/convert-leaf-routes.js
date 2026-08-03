/**
 * Convert simple molecule leaf routes to moleculeLeafGet (free-API agent policy).
 * Only converts the common pattern:
 *   molecule = await getMoleculeById(cid)
 *   if (!molecule) return { key: [] }
 *   const x = await getFooByName(molecule.name)
 *   return { key: x }
 */
const fs = require('fs')
const path = require('path')

const apiRoot = path.join(__dirname, '..', 'src', 'app', 'api')
let n = 0
const skip = new Set(['hazards']) // cid-based, special

for (const ent of fs.readdirSync(apiRoot, { withFileTypes: true })) {
  if (!ent.isDirectory()) continue
  const d = ent.name
  if (skip.has(d)) continue
  const route = path.join(apiRoot, d, '[id]', 'route.ts')
  if (!fs.existsSync(route)) continue
  let s = fs.readFileSync(route, 'utf8')
  if (s.includes('moleculeLeafGet')) continue
  if (!s.includes('getMoleculeById')) continue
  if (!s.includes('molecule.name')) continue
  // multi-step routes (alphafold with resolveDrugTargets etc.)
  if ((s.match(/await /g) || []).length > 3) continue
  if (s.includes('resolveDrugTargets') || s.includes('Promise.all')) continue

  // Empty return: { foo: [] }
  const emptyMatch = s.match(/if\s*\(\s*!molecule\s*\)\s*\{[^}]*NextResponse\.json\(\{\s*(\w+)\s*:\s*\[\]/)
  if (!emptyMatch) continue
  const key = emptyMatch[1]

  // Final return: { key: variable }
  const finalMatch = s.match(
    new RegExp(`return\\s+NextResponse\\.json\\(\\{\\s*${key}\\s*\\}\\)`),
  )
  // or { key: varName }
  const finalMatch2 = s.match(
    new RegExp(`const\\s+(\\w+)\\s*=\\s*await\\s+(\\w+)\\(molecule\\.name`),
  )
  if (!finalMatch2) continue
  const fn = finalMatch2[2]

  // Find import for fn
  const importRe = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"](@\/lib\/api\/[^'"]+)['"]/g
  let m
  let from = null
  while ((m = importRe.exec(s)) !== null) {
    if (m[1].split(',').some((p) => p.trim().split(/\s+/)[0] === fn)) {
      from = m[2]
      break
    }
  }
  if (!from) continue

  const out = `import { NextRequest } from 'next/server'
import { ${fn} } from '${from}'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, '${key}', (name) => ${fn}(name), {
    source: '${d}',
  })
}
`
  fs.writeFileSync(route, out)
  console.log('converted', d, key, fn)
  n++
}
console.log('total converted', n)
