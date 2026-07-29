#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const dir = path.join(__dirname, '..', 'src/lib/dataHub/moleculeHub/sections')

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
  let c = fs.readFileSync(path.join(dir, f), 'utf8')
  // Strip existing shared + types imports
  c = c.replace(
    /import \{[\s\S]*?\} from '\.\.\/\.\.\/moleculeHubShared'\nimport type \{ DataHubRow, DataHubSection \} from '\.\.\/\.\.\/types'\n/,
    '',
  )
  // Detect used symbols in remaining body
  const body = c
  const want = []
  for (const n of ['asArr', 'fmtMw', 'phaseLabel', 'row', 'section', 'str']) {
    if (new RegExp(`\\b${n}\\b`).test(body)) want.push(n)
  }
  // identity often only needs fmtMw,row,section
  if (f === 'identity.ts' && !/\bdata\./.test(body) && !/\basArr\s*\(\s*data/.test(body)) {
    c = c.replace(
      /export function buildIdentityPart\(\s*identity: MoleculeIdentityInput,\s*data: Record<string, unknown>,/,
      'export function buildIdentityPart(\n  identity: MoleculeIdentityInput,\n  _data: Record<string, unknown>,',
    )
  }
  const imp =
    `import {\n  ${want.join(',\n  ')},\n  type MoleculeIdentityInput,\n} from '../../moleculeHubShared'\n` +
    `import type { DataHubRow, DataHubSection } from '../../types'\n\n`
  // Insert after file header comment block
  const m = c.match(/^(\/\*\*[\s\S]*?\*\/\n)/)
  if (m) {
    c = m[1] + imp + c.slice(m[1].length)
  } else {
    c = imp + c
  }
  fs.writeFileSync(path.join(dir, f), c)
  console.log(f, want.join(','))
}
