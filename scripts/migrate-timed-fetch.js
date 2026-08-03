/**
 * One-shot: inject timedFetch into high-traffic free-API clients.
 * Safe to re-run (skips files that already import timedFetch).
 */
const fs = require('fs')
const path = require('path')

const files = [
  'gwas-catalog.ts',
  'mesh.ts',
  'openalex.ts',
  'opencitations.ts',
  'europepmc.ts',
  'semantic-scholar.ts',
  'pdb.ts',
  'pathway-commons.ts',
  'reactome.ts',
  'ensembl.ts',
  'expression-atlas.ts',
  'interpro.ts',
  'protein-atlas.ts',
  'quickgo.ts',
  'pharos.ts',
  'nadac.ts',
  'patents.ts',
  'recalls.ts',
  'ror.ts',
  'whoGho.ts',
  'uniprot.ts',
  'monarch.ts',
  'pubchem-hazards.ts',
  'secedgar.ts',
  'wikipathways.ts',
  'string-db.ts',
  'stitch.ts',
  'intact.ts',
  'ncbi-gene.ts',
  'nci-thesaurus.ts',
  'nihreporter.ts',
  'orangebook.ts',
  'rxnorm.ts',
  'sider.ts',
]

const dir = path.join(__dirname, '..', 'src', 'lib', 'api')
let updated = 0
let skipped = 0

for (const f of files) {
  const p = path.join(dir, f)
  if (!fs.existsSync(p)) {
    console.log('missing', f)
    continue
  }
  let s = fs.readFileSync(p, 'utf8')
  if (s.includes("from './timedFetch'") || s.includes('from "./timedFetch"')) {
    skipped++
    continue
  }

  const lines = s.split('\n')
  let lastImport = -1
  for (let i = 0; i < Math.min(50, lines.length); i++) {
    if (/^import\s/.test(lines[i]) || /^import\s*\{/.test(lines[i])) lastImport = i
  }
  if (lastImport < 0) {
    console.log('no import', f)
    continue
  }
  lines.splice(lastImport + 1, 0, "import { timedFetch } from './timedFetch'")
  s = lines.join('\n')

  // Common patterns
  s = s.replace(
    /await fetch\(([^,\n]+),\s*fetchOptions\)/g,
    'await timedFetch($1, { ...fetchOptions, timeoutMs: 8000 })',
  )
  s = s.replace(
    /await fetch\(([^,\n]+),\s*\{\s*next:\s*\{\s*revalidate:\s*\d+\s*\}\s*\}\)/g,
    'await timedFetch($1, { timeoutMs: 8000 })',
  )
  s = s.replace(
    /await fetch\(([^,\n]+),\s*PC_FETCH_OPTS\)/g,
    'await timedFetch($1, { ...PC_FETCH_OPTS, timeoutMs: 8000 })',
  )
  // bare fetch(url) with only one arg - leave alone (risk)

  fs.writeFileSync(p, s)
  updated++
  console.log('updated', f)
}

console.log(`done: updated=${updated} skipped=${skipped}`)
