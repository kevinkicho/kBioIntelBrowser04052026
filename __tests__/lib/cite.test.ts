import { consolidateCitations } from '@/lib/cite/consolidate'
import { formatBibtex, formatRis } from '@/lib/cite/formatters'

describe('consolidateCitations', () => {
  test('returns empty array when no data', () => {
    expect(consolidateCitations({})).toEqual([])
  })

  test('skips panels with empty data', () => {
    const sources = consolidateCitations({
      companies: [],
      ndcProducts: null,
      atcClassifications: undefined,
    })
    expect(sources).toEqual([])
  })

  test('produces one citation per stemmed database name', () => {
    // chemblActivities, chemblMechanisms, chemblIndications all share ChEMBL family
    const sources = consolidateCitations({
      chemblActivities: [{ id: 1 }],
      chemblMechanisms: [{ id: 2 }],
      chemblIndications: [{ id: 3 }],
    })
    const chemblEntries = sources.filter(s => s.database.toLowerCase().includes('chembl'))
    expect(chemblEntries).toHaveLength(1)
    expect(chemblEntries[0].contributingPanels.length).toBeGreaterThanOrEqual(2)
  })

  test('returns sorted by database name', () => {
    const sources = consolidateCitations({
      uniprotEntries: [{ id: 'P1' }],
      chemblActivities: [{ id: 1 }],
      pdbStructures: [{ id: 'X' }],
    })
    const names = sources.map(s => s.database)
    const sorted = [...names].sort()
    expect(names).toEqual(sorted)
  })
})

describe('formatBibtex', () => {
  const sources = [
    {
      key: 'chembl',
      database: 'ChEMBL',
      organization: 'EMBL-EBI',
      description: 'Bioactivity database',
      docs: 'https://chembl.gitbook.io',
      endpoint: 'https://www.ebi.ac.uk/chembl/api/data',
      contributingPanels: ['chembl', 'chembl-mechanisms'],
    },
  ]
  const ctx = {
    entityName: 'Aspirin',
    entityType: 'molecule' as const,
    entityId: 2244,
    accessedAt: '2026-04-25T10:30:00Z',
  }

  test('emits a valid @misc entry per source', () => {
    const out = formatBibtex(sources, ctx)
    expect(out).toContain('@misc{chembl,')
    expect(out).toContain('title = {ChEMBL}')
    expect(out).toContain('author = {{EMBL-EBI}}')
    expect(out).toContain('year = {2026}')
    expect(out).toContain('urldate = {2026-04-25}')
    expect(out).toContain('Aspirin')
    expect(out).toContain('2244')
  })

  test('escapes braces and ampersands in fields', () => {
    const danger = [{ ...sources[0], database: 'A & B {test}' }]
    const out = formatBibtex(danger, ctx)
    expect(out).toContain('A \\& B \\{test\\}')
  })
})

describe('formatRis', () => {
  const sources = [
    {
      key: 'pubchem',
      database: 'PubChem',
      organization: 'NCBI (NIH)',
      description: '',
      docs: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/',
      endpoint: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound',
      contributingPanels: ['properties'],
    },
  ]
  const ctx = {
    entityName: 'Aspirin',
    entityType: 'molecule' as const,
    entityId: 2244,
    accessedAt: '2026-04-25T10:30:00Z',
  }

  test('emits a complete RIS record', () => {
    const out = formatRis(sources, ctx)
    expect(out).toContain('TY  - DBASE')
    expect(out).toContain('TI  - PubChem')
    expect(out).toContain('AU  - NCBI (NIH)')
    expect(out).toContain('PY  - 2026')
    expect(out).toContain('Y2  - 2026-04-25')
    expect(out.endsWith('ER  - ')).toBe(true)
  })
})
