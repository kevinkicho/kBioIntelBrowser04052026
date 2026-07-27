/**
 * Golden tests for cite / Monday pack / kit diff / A-tier / research shelves.
 */

import {
  buildMoleculeDataHub,
  buildResearchKitBundle,
  formatDataHubFactCitation,
  ledgerSampleStats,
  buildMondayPack,
  buildMondayPackTitle,
  buildMondayPackAgenda,
  isATierHubRow,
  filterHubRowsATier,
  diffResearchKitBundles,
  diffLedgers,
  dataHubToDelimited,
} from '@/lib/dataHub'
import type { EvidenceClaim } from '@/lib/domain'
import {
  createResearchShelf,
  addToResearchShelf,
  markShelfKitExported,
  loadResearchShelves,
  saveResearchShelves,
  RESEARCH_SHELVES_KEY,
} from '@/lib/researchShelves'

function sampleLedger() {
  return buildMoleculeDataHub(
    { cid: 2244, name: 'Aspirin', formula: 'C9H8O4', molecularWeight: 180.16, inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N' },
    {
      clinicalTrials: [
        {
          nctId: 'NCT0001',
          title: 'Aspirin CV trial',
          phase: 'PHASE3',
          status: 'COMPLETED',
          conditions: ['CVD'],
          sponsor: 'NIH',
          enrollment: 1000,
        },
      ],
      literature: [{ title: 'Aspirin review', year: 2021, doi: '10.1000/asp', pmid: '999' }],
      chemblMechanisms: [{ targetName: 'PTGS1', actionType: 'INHIBITOR', mechanismOfAction: 'COX-1' }],
    },
  )
}

describe('cite fact', () => {
  it('formats a lab-notebook citation with source and honesty line', () => {
    const ledger = sampleLedger()
    const row = ledger.rows.find((r) => r.id === 'id-name') || ledger.rows[0]!
    const text = formatDataHubFactCitation(row, {
      subjectLabel: 'Aspirin',
      subjectId: '2244',
      retrievedAt: '2026-04-01',
    })
    expect(text).toMatch(/Aspirin/)
    expect(text).toMatch(/Source:/)
    expect(text).toMatch(/BioIntel data hub/)
    expect(text).toMatch(/not clinical decision support/i)
    expect(text).toMatch(/2026-04-01/)
  })

  it('ledgerSampleStats counts non-empty facts', () => {
    const ledger = sampleLedger()
    const stats = ledgerSampleStats(ledger)
    expect(stats.factCount).toBeGreaterThan(0)
    expect(stats.sourceCount).toBeGreaterThan(0)
  })
})

describe('Monday pack', () => {
  it('builds schema v1 with kit embed and agenda', () => {
    const ledger = sampleLedger()
    const claims: EvidenceClaim[] = [
      {
        id: 'c1',
        statement: 'Inhibits PTGS1',
        claimType: 'binds-target',
        epistemicStatus: 'supported',
        provenance: {
          source: 'ChEMBL',
          sourceUrl: 'https://www.ebi.ac.uk/chembl/',
          retrievedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ]
    const pack = buildMondayPack({
      ledger,
      claims,
      contextLabel: 'Pain',
      asOf: '2026-04-15T12:00:00.000Z',
    })
    expect(pack.schemaVersion).toBe(1)
    expect(pack.kind).toBe('biointel-monday-pack')
    expect(pack.title).toMatch(/Monday research pack/)
    expect(pack.title).toMatch(/Pain/)
    expect(pack.kit.kind).toBe('biointel-research-kit-bundle')
    expect(pack.kit.files['data-hub.csv']).toContain('fact')
    expect(pack.claimCount).toBe(1)
    expect(pack.agenda.length).toBeGreaterThanOrEqual(4)
    expect(pack.honesty.some((h) => /Free public/i.test(h))).toBe(true)
    expect(pack.methodologyUrl).toBe('/methodology')
  })

  it('title and agenda helpers are pure', () => {
    const ledger = sampleLedger()
    expect(buildMondayPackTitle(ledger, null, '2026-04-15T00:00:00.000Z')).toMatch(
      /2026-04-15/,
    )
    const agenda = buildMondayPackAgenda(ledger, null)
    expect(agenda.some((a) => /data hub/i.test(a))).toBe(true)
  })
})

describe('research kit bundle schema + diff', () => {
  it('bundle has stable kind and required files', () => {
    const ledger = sampleLedger()
    const bundle = buildResearchKitBundle({ ledger, includeEmpty: false })
    expect(bundle.kind).toBe('biointel-research-kit-bundle')
    expect(bundle.schemaVersion).toBeGreaterThanOrEqual(1)
    expect(bundle.files['data-hub.csv']).toBeTruthy()
    expect(bundle.files['sources.json']).toBeTruthy()
    expect(bundle.files['README.md']).toMatch(/research kit/i)
    const csv = dataHubToDelimited(ledger, 'csv')
    expect(csv.split('\n')[0]).toMatch(/section|fact/i)
  })

  it('diffResearchKitBundles detects added/removed/changed values', () => {
    const a = sampleLedger()
    const b = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin', formula: 'C9H8O4' },
      {
        clinicalTrials: [
          {
            nctId: 'NCT0002',
            title: 'New trial',
            phase: 'PHASE2',
            status: 'RECRUITING',
            conditions: ['Pain'],
            sponsor: 'Acme',
            enrollment: 50,
          },
        ],
        literature: [{ title: 'Different paper', year: 2022 }],
      },
    )
    const ba = buildResearchKitBundle({ ledger: a })
    const bb = buildResearchKitBundle({ ledger: b })
    const diff = diffResearchKitBundles(ba, bb)
    expect('error' in diff).toBe(false)
    if ('error' in diff) return
    expect(diff.summary).toMatch(/added|removed|changed/i)
    // ledger-level diff also works
    const ld = diffLedgers(a, b)
    expect(ld.added.length + ld.removed.length + ld.changed.length).toBeGreaterThan(0)
  })

  it('rejects non-bundle input', () => {
    const r = diffResearchKitBundles({ kind: 'nope' }, { kind: 'nope' })
    expect('error' in r).toBe(true)
  })
})

describe('A-tier filter', () => {
  it('keeps identity and known A-tier sources', () => {
    const ledger = sampleLedger()
    const idRow = ledger.rows.find((r) => r.domain === 'identity')
    expect(idRow && isATierHubRow(idRow)).toBe(true)
    const filtered = filterHubRowsATier(ledger.rows, true)
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.length).toBeLessThanOrEqual(ledger.rows.length)
  })
})

describe('research shelves (localStorage)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(RESEARCH_SHELVES_KEY)
    }
  })

  it('create, pin, mark export', () => {
    if (typeof window === 'undefined') return
    const shelf = createResearchShelf('Lead series')
    expect(shelf.name).toBe('Lead series')
    addToResearchShelf(shelf.id, {
      entityType: 'molecule',
      id: '2244',
      label: 'Aspirin',
      href: '/molecule/2244?view=research',
    })
    markShelfKitExported(shelf.id, 'molecule', '2244')
    const loaded = loadResearchShelves()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]!.items[0]!.lastKitExportedAt).toBeTruthy()
    saveResearchShelves([])
    expect(loadResearchShelves()).toHaveLength(0)
  })
})
