import { exportCohortToCsv, exportCohortToJson } from '@/lib/cohort/csv'
import { buildMatrix } from '@/lib/cohort/buildMatrix'
import type { Attribute, Molecule, MatrixRow } from '@/lib/cohort/types'

const MW: Attribute = {
  id: 'mw',
  label: 'Molecular weight',
  category: 'molecular-chemical',
  format: 'number',
  extract: (d) => (typeof d.molecularWeight === 'number' ? d.molecularWeight : null),
}

const ATC: Attribute = {
  id: 'atc',
  label: 'ATC, top-level',
  category: 'pharmaceutical',
  format: 'string',
  extract: (d) => (typeof d.atcLetter === 'string' ? d.atcLetter : null),
}

describe('exportCohortToCsv', () => {
  it('returns just the header for an empty rows list', () => {
    const molecules: Molecule[] = [
      { cid: 1, name: 'A' },
      { cid: 2, name: 'B' },
    ]
    const csv = exportCohortToCsv(molecules, [])
    expect(csv).toBe('Attribute,A (CID 1),B (CID 2)')
  })

  it('escapes commas, quotes, and newlines in attribute labels and string values', () => {
    const molecules: Molecule[] = [{ cid: 1, name: 'Drug, with comma' }]
    // Attribute label with embedded comma should be quoted
    const rows: MatrixRow[] = [
      {
        attribute: ATC,
        cells: [
          { value: 'has "quote"', heat: null, display: 'has "quote"' },
        ],
        variance: 0,
      },
    ]
    const csv = exportCohortToCsv(molecules, rows)
    const lines = csv.split('\n')
    // Header has the comma in the molecule name → quoted
    expect(lines[0]).toContain('"Drug, with comma (CID 1)"')
    // Attribute label has a comma → quoted
    expect(lines[1]).toContain('"ATC, top-level"')
    // Cell value with quotes is doubled
    expect(lines[1]).toContain('"has ""quote"""')
  })

  it('writes empty cells for null values (rows-with-nulls)', () => {
    const molecules: Molecule[] = [
      { cid: 1, name: 'A' },
      { cid: 2, name: 'B' },
      { cid: 3, name: 'C' },
    ]
    const data = {
      1: { molecularWeight: 100 },
      // 2 missing
      3: { molecularWeight: 300 },
    }
    const rows = buildMatrix(molecules, [MW], data)
    const csv = exportCohortToCsv(molecules, rows)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    // Numeric value should be written as a parseable number
    expect(lines[1]).toBe('Molecular weight,100,,300')
  })

  it('multi-attribute round-trip writes one line per row in the right order', () => {
    const molecules: Molecule[] = [
      { cid: 1, name: 'A' },
      { cid: 2, name: 'B' },
    ]
    const data = {
      1: { molecularWeight: 200, atcLetter: 'L' },
      2: { molecularWeight: 400, atcLetter: 'N' },
    }
    const rows = buildMatrix(molecules, [MW, ATC], data)
    const csv = exportCohortToCsv(molecules, rows)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('Attribute,A (CID 1),B (CID 2)')
    expect(lines[1]).toBe('Molecular weight,200,400')
    // ATC label has a comma → quoted
    expect(lines[2]).toBe('"ATC, top-level",L,N')
  })
})

describe('exportCohortToJson', () => {
  it('produces valid JSON with molecules and rows', () => {
    const molecules: Molecule[] = [
      { cid: 1, name: 'A' },
      { cid: 2, name: 'B' },
    ]
    const data = {
      1: { molecularWeight: 100 },
      2: { molecularWeight: 200 },
    }
    const rows = buildMatrix(molecules, [MW], data)
    const json = exportCohortToJson(molecules, rows)
    const parsed = JSON.parse(json)
    expect(parsed.molecules).toEqual(molecules)
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0].id).toBe('mw')
    expect(parsed.rows[0].values).toEqual([100, 200])
    expect(parsed.rows[0].heat).toEqual([0, 1])
  })
})
