#!/usr/bin/env node
/**
 * Split buildMoleculeHubParts into per-section builders under
 * src/lib/dataHub/moleculeHub/sections/
 */
'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src/lib/dataHub/moleculeHubSections.ts')
const OUT_DIR = path.join(ROOT, 'src/lib/dataHub/moleculeHub')
const SEC_DIR = path.join(OUT_DIR, 'sections')

const src = fs.readFileSync(SRC, 'utf8')
const lines = src.split(/\r?\n/)

// Find section comment lines: // --- Name ---
const sectionStarts = []
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^\s*\/\/ --- (.+?) ---/)
  if (m) sectionStarts.push({ line: i, title: m[1].trim() })
}

// Function body starts at line with `export function buildMoleculeHubParts`
const fnStart = lines.findIndex((l) => l.includes('export function buildMoleculeHubParts'))
if (fnStart < 0) throw new Error('buildMoleculeHubParts not found')

// Content between sections is code that builds rows - extract each block until next section or end of function
// End of function is last `}` of file typically after negative evidence

function slug(title) {
  const map = {
    'Identity (PubChem / structure shell)': 'identity',
    'Cross-DB entity keys (ATC, RxCUI, ChEMBL, ChEBI, …)': 'keys',
    'Regulatory / product': 'regulatory',
    'Clinical trials': 'clinical',
    'Targets / mechanisms': 'targets',
    'Safety': 'safety',
    'Literature (entity samples, not only counts)': 'literature',
    'Structures (research)': 'structures',
  }
  if (map[title]) return map[title]
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

// Find the start of first section body (after `const all = []` setup)
const setupEnd = lines.findIndex((l, i) => i > fnStart && l.includes('// --- Identity'))
if (setupEnd < 0) throw new Error('Identity section not found')

// Code after last section comment through end of function - includes trial title rows + negative evidence
const lastSection = sectionStarts[sectionStarts.length - 1]
const afterLastIdx = (() => {
  // next section or end - for last section, find closing of function
  // Look for lines after structures that still push
  return lines.length - 1
})()

fs.mkdirSync(SEC_DIR, { recursive: true })

const sectionFiles = []
for (let s = 0; s < sectionStarts.length; s++) {
  const start = sectionStarts[s].line
  const end = s + 1 < sectionStarts.length ? sectionStarts[s + 1].line : null
  // Section body: from comment through last all.push/sections.push for this block
  // We'll take until next // --- or until line before `// ---` of next
  let bodyEnd
  if (end != null) {
    bodyEnd = end
  } else {
    // structures is last named section; include until end of function before final return
    const ret = lines.findIndex((l, i) => i > start && /^\s*return \{/.test(l))
    bodyEnd = ret > 0 ? ret : lines.length - 1
  }
  const bodyLines = lines.slice(start, bodyEnd)
  // Transform body: it currently does `all.push(...x); sections.push(...)`
  // Convert to a function that returns { rows, sections }
  // Strategy: wrap original body in function, replace all.push(...rows) with collecting,
  // and return at end.

  // Simpler approach: keep body as-is but use local all/sections arrays
  const id = slug(sectionStarts[s].title)
  const fnName = 'build' + id.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Part'

  // Extract variable names from push patterns: all.push(...identityRows) etc.
  const text = bodyLines.join('\n')
  // Replace `all.push(...FOO)` and `sections.push(...)` - keep them using local arrays

  const moduleCode = `/**
 * Hub section: ${sectionStarts[s].title}
 * Pure; no network.
 */
import {
  asArr,
  fmtMw,
  phaseLabel,
  row,
  section,
  str,
  type MoleculeIdentityInput,
} from '../../moleculeHubShared'
import type { DataHubRow, DataHubSection } from '../../types'
import { buildNegativeEvidencePart } from '../../negativeEvidence'

export function ${fnName}(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): { rows: DataHubRow[]; sections: DataHubSection[] } {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

${bodyLines.map((l) => '  ' + l.replace(/^\s{2}/, '')).join('\n').replace(/^  \/\/ ---/, '  // ---')}

  return { rows: all, sections }
}
`
  // Fix indentation - body already has 2-space indent for function body content
  // body lines were at function scope with 2 spaces - we add 2 more incorrectly

  // Better rewrite:
  const cleaned = bodyLines
    .map((l) => {
      // strip 2 spaces of function indent if present
      if (l.startsWith('  ')) return l.slice(2)
      return l
    })
    .join('\n')

  const final = `/**
 * Hub section: ${sectionStarts[s].title}
 * Pure; no network.
 */
import {
  asArr,
  fmtMw,
  phaseLabel,
  row,
  section,
  str,
  type MoleculeIdentityInput,
} from '../../moleculeHubShared'
import type { DataHubRow, DataHubSection } from '../../types'
import { buildNegativeEvidencePart } from '../../negativeEvidence'

export function ${fnName}(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): { rows: DataHubRow[]; sections: DataHubSection[] } {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

${cleaned
  .split('\n')
  .map((l) => (l.trim() ? '  ' + l : l))
  .join('\n')}

  return { rows: all, sections }
}
`

  const file = path.join(SEC_DIR, `${id}.ts`)
  fs.writeFileSync(file, final)
  sectionFiles.push({ id, fnName, file: `./sections/${id}` })
  console.log('wrote', id, bodyEnd - start, 'lines')
}

// Epilogue: code after last section that still mutates all/sections (trial title + neg evidence)
const lastStart = sectionStarts[sectionStarts.length - 1].line
const retLine = lines.findIndex((l, i) => i > lastStart && /^\s*return \{/.test(l))
// Find where structures section's sections.push ends - next code after structures block
// The epilogue is between end of structures (last all.push of structures) and return
// Our last section file already includes up to return line - check if trial rows are inside structures

// Read last section file end
const lastContent = fs.readFileSync(path.join(SEC_DIR, sectionFiles[sectionFiles.length - 1].id + '.ts'), 'utf8')
const hasNeg = lastContent.includes('buildNegativeEvidencePart')
console.log('last has neg', hasNeg)

// Orchestrator
const orch = `/**
 * Molecule data-hub section builders (orchestrator).
 * Pure; no network. Section implementations under ./moleculeHub/sections/
 */
import type { MoleculeIdentityInput } from './moleculeHubShared'
import type { DataHubRow, DataHubSection } from './types'
${sectionFiles.map((s) => `import { ${s.fnName} } from './moleculeHub/sections/${s.id}'`).join('\n')}

export function buildMoleculeHubParts(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): { rows: DataHubRow[]; sections: DataHubSection[] } {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  for (const part of [
${sectionFiles.map((s) => `    ${s.fnName}(identity, data),`).join('\n')}
  ]) {
    all.push(...part.rows)
    sections.push(...part.sections)
  }

  return { rows: all, sections }
}
`

fs.writeFileSync(SRC, orch)
console.log('rewrote moleculeHubSections.ts orchestrator with', sectionFiles.length, 'parts')
