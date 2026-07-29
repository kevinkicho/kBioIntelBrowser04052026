/**
 * Capability inventory — asserts product-critical surfaces stay wired.
 * Fails when of-record paths, exports, or free-API builders disappear.
 *
 * Run via: npm run test:capabilities
 * Included in: npm run test:precommit
 */

import fs from 'fs'
import path from 'path'
import { buildMoleculeDataHub, buildSourceDirectory } from '@/lib/dataHub'
import { buildMoleculeCrossSource } from '@/lib/crossSource'
import { buildDiscoverMiniHub } from '@/lib/dataHub'
import {
  extractUniProtProteinName,
} from '@/lib/api/uniprot'
import { safeDisplayString, isUnsafeReactChild } from '@/lib/reactSafe'
import { isFactEmpty } from '@/lib/crossSource'
import {
  ExpandableItems,
  ExpandableTextList,
} from '@/components/ui/ExpandableItems'

const root = path.join(__dirname, '../..')

function exists(rel: string): boolean {
  return fs.existsSync(path.join(root, rel))
}

describe('product capabilities — files of record', () => {
  const criticalPaths = [
    'src/lib/dataHub/buildMoleculeDataHub.ts',
    'src/lib/dataHub/exportDataHub.ts',
    'src/lib/dataHub/researchKit.ts',
    'src/lib/crossSource/buildMolecule.ts',
    'src/components/dataHub/DataHubLedger.tsx',
    'src/components/dataHub/ResearchFocusView.tsx',
    'src/components/crossSource/CrossSourceStrip.tsx',
    'src/components/ui/ExpandableItems.tsx',
    'src/lib/reactSafe.ts',
    'src/lib/api/uniprot.ts',
    'src/lib/discovery/scoreAxes.ts',
    'src/lib/productEvents.ts',
    'src/lib/evidence/pack.ts',
    'docs/design/data-hub-presentation.md',
    'docs/design/discovery-workbench-v2.1.md',
    'scripts/biointel-cli.js',
    'e2e/north-star-loop.spec.ts',
    'e2e/smoke.spec.ts',
  ]

  it.each(criticalPaths)('ships %s', (rel) => {
    expect(exists(rel)).toBe(true)
  })
})

describe('product capabilities — of-record data hub', () => {
  it('builds multi-source ledger with provenance fields', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin', formula: 'C9H8O4', molecularWeight: 180 },
      {
        clinicalTrials: [{ nctId: 'NCT1', phase: 'PHASE3', status: 'COMPLETED' }],
        drugGeneInteractions: [{ geneSymbol: 'PTGS2' }],
        adverseEvents: [{ reactionName: 'Nausea', count: 3 }],
      },
    )
    expect(ledger.empty).toBe(false)
    expect(ledger.sourceCount).toBeGreaterThanOrEqual(2)
    for (const row of ledger.rows.filter((r) => r.value && r.value !== '—')) {
      expect(row.source).toBeTruthy()
      expect(row.fact).toBeTruthy()
    }
    const dir = buildSourceDirectory(ledger)
    expect(dir.withData).toBeGreaterThan(0)
  })

  it('discover mini hub surfaces gather facts without inventing rank math', () => {
    const mini = buildDiscoverMiniHub({
      key: 'cid:2244',
      name: 'Aspirin',
      cid: 2244,
      sources: ['PubChem', 'ChEMBL'],
      trialCount: 2,
      targetNames: ['PTGS1'],
    })
    expect(mini.rows.length).toBeGreaterThan(0)
    expect(mini.rows.some((r) => r.id === 'm-cid')).toBe(true)
    // Presentation only — notes / domains should not claim clinical decisions
    expect(JSON.stringify(mini.rows)).not.toMatch(/regulatory decision|approved indication certainty/i)
  })
})

describe('product capabilities — cross-source coverage', () => {
  it('counts only non-empty sources and marks zeros empty', () => {
    const bundle = buildMoleculeCrossSource('2244', 'Aspirin', {
      clinicalTrials: [{ nctId: 'NCT1' }],
    })
    expect(bundle.sourceCount).toBeGreaterThanOrEqual(1)
    const zeros = bundle.facts.filter((f) => isFactEmpty(f))
    expect(zeros.length).toBeGreaterThan(0)
    const filled = bundle.facts.filter((f) => !isFactEmpty(f))
    expect(filled.some((f) => f.id === 'ct-trials')).toBe(true)
  })
})

describe('product capabilities — React-safe free-API DTOs', () => {
  it('UniProt nested names become strings', () => {
    const nested = {
      recommendedName: { fullName: { value: 'Prothrombin' } },
      alternativeNames: [{ fullName: { value: 'Factor II' } }],
    }
    expect(isUnsafeReactChild(nested)).toBe(true)
    expect(extractUniProtProteinName(nested)).toBe('Prothrombin')
    expect(safeDisplayString(nested)).toBe('Prothrombin')
  })
})

describe('product capabilities — expandable UI primitives export', () => {
  it('exports ExpandableItems and ExpandableTextList', () => {
    expect(typeof ExpandableItems).toBe('function')
    expect(typeof ExpandableTextList).toBe('function')
  })
})

describe('product capabilities — free-API product law docs', () => {
  it('AGENTS.md still forbids paid APIs and LLM rank path', () => {
    const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8')
    expect(agents).toMatch(/Free public APIs only/i)
    expect(agents).toMatch(/no LLM in the rank path/i)
  })
})
