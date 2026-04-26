import { buildMatrix, sortByVariance } from '@/lib/cohort/buildMatrix'
import type { Attribute, Molecule } from '@/lib/cohort/types'

const MW: Attribute = {
  id: 'mw',
  label: 'Molecular weight',
  category: 'molecular-chemical',
  format: 'number',
  extract: (d) => {
    const v = d.molecularWeight
    return typeof v === 'number' ? v : null
  },
}

const LOGP: Attribute = {
  id: 'logp',
  label: 'LogP',
  category: 'molecular-chemical',
  format: 'number',
  extract: (d) => {
    const cp = d.computedProperties as Record<string, unknown> | null
    return cp && typeof cp.xLogP === 'number' ? cp.xLogP : null
  },
}

const ATC: Attribute = {
  id: 'atc',
  label: 'ATC top-level',
  category: 'pharmaceutical',
  format: 'string',
  extract: (d) => (typeof d.atcLetter === 'string' ? d.atcLetter : null),
}

const TRIALS: Attribute = {
  id: 'active-trials',
  label: 'Active trials',
  category: 'clinical-safety',
  format: 'integer',
  higherIsBetter: true,
  extract: (d) => (typeof d.activeTrials === 'number' ? d.activeTrials : null),
}

const ADVERSE: Attribute = {
  id: 'adverse',
  label: 'Adverse events',
  category: 'clinical-safety',
  format: 'integer',
  higherIsBetter: false,
  extract: (d) => (typeof d.adverse === 'number' ? d.adverse : null),
}

describe('buildMatrix', () => {
  it('returns empty when there are no molecules', () => {
    const rows = buildMatrix([], [MW, LOGP], {})
    expect(rows).toEqual([])
  })

  it('returns empty when there are no attributes', () => {
    const molecules: Molecule[] = [{ cid: 1, name: 'A' }]
    const rows = buildMatrix(molecules, [], { 1: { molecularWeight: 100 } })
    expect(rows).toEqual([])
  })

  it('handles a single molecule (heat collapses to 0.5)', () => {
    const molecules: Molecule[] = [{ cid: 1, name: 'Aspirin' }]
    const data = { 1: { molecularWeight: 180.16, computedProperties: { xLogP: 1.2 } } }
    const rows = buildMatrix(molecules, [MW, LOGP], data)
    expect(rows).toHaveLength(2)
    expect(rows[0].cells[0].value).toBe(180.16)
    expect(rows[0].cells[0].heat).toBe(0.5)
    // raw value preserved; display is compact (one decimal for >= 100)
    expect(rows[0].cells[0].display).toBe('180.2')
    expect(rows[1].cells[0].value).toBe(1.2)
  })

  it('mixes numeric and string attributes with correct cell counts', () => {
    const molecules: Molecule[] = [
      { cid: 1, name: 'A' },
      { cid: 2, name: 'B' },
      { cid: 3, name: 'C' },
    ]
    const data = {
      1: { molecularWeight: 200, atcLetter: 'L' },
      2: { molecularWeight: 400, atcLetter: 'N' },
      3: { molecularWeight: 600, atcLetter: 'L' },
    }
    const rows = buildMatrix(molecules, [MW, ATC], data)
    expect(rows).toHaveLength(2)
    // numeric row: linear normalization 0, 0.5, 1
    expect(rows[0].cells.map(c => c.heat)).toEqual([0, 0.5, 1])
    // categorical row: heat is null
    expect(rows[1].cells.every(c => c.heat === null)).toBe(true)
    expect(rows[1].cells.map(c => c.display)).toEqual(['L', 'N', 'L'])
    expect(rows[1].variance).toBe(0)
  })

  it('uses log-scale when max/min > 100 and all positive', () => {
    const molecules: Molecule[] = [
      { cid: 1, name: 'A' },
      { cid: 2, name: 'B' },
      { cid: 3, name: 'C' },
    ]
    // 1, 100, 10000 => log10: 0, 2, 4 => normalized 0, 0.5, 1
    const data = {
      1: { molecularWeight: 1 },
      2: { molecularWeight: 100 },
      3: { molecularWeight: 10000 },
    }
    const rows = buildMatrix(molecules, [MW], data)
    const heats = rows[0].cells.map(c => c.heat)
    expect(heats[0]).toBeCloseTo(0, 6)
    expect(heats[1]).toBeCloseTo(0.5, 6)
    expect(heats[2]).toBeCloseTo(1, 6)
  })

  it('keeps null cells neutral and ignores them when normalizing', () => {
    const molecules: Molecule[] = [
      { cid: 1, name: 'A' },
      { cid: 2, name: 'B' },
      { cid: 3, name: 'C' },
    ]
    const data = {
      1: { molecularWeight: 100 },
      2: {}, // missing => null
      3: { molecularWeight: 300 },
    }
    const rows = buildMatrix(molecules, [MW], data)
    const cells = rows[0].cells
    expect(cells[0].heat).toBe(0)
    expect(cells[1].value).toBeNull()
    expect(cells[1].heat).toBeNull()
    expect(cells[1].display).toBe('—')
    expect(cells[2].heat).toBe(1)
  })

  it('inverts the heat when higherIsBetter is false', () => {
    const molecules: Molecule[] = [
      { cid: 1, name: 'A' },
      { cid: 2, name: 'B' },
    ]
    const data = {
      1: { adverse: 0 },
      2: { adverse: 100 },
    }
    const rows = buildMatrix(molecules, [ADVERSE], data)
    // Without inversion the high-adverse molecule would have heat 1; with
    // higherIsBetter:false we want the LOW adverse molecule to be the green end.
    expect(rows[0].cells[0].heat).toBe(1)
    expect(rows[0].cells[1].heat).toBe(0)
  })

  it('falls back to neutral when an extractor throws', () => {
    const ANGRY: Attribute = {
      id: 'angry',
      label: 'Angry',
      category: 'molecular-chemical',
      format: 'number',
      extract: () => {
        throw new Error('boom')
      },
    }
    const molecules: Molecule[] = [{ cid: 1, name: 'A' }]
    const rows = buildMatrix(molecules, [ANGRY], { 1: {} })
    expect(rows[0].cells[0].value).toBeNull()
    expect(rows[0].cells[0].heat).toBeNull()
  })

  it('handles missing-data molecules across multiple attributes', () => {
    const molecules: Molecule[] = [
      { cid: 1, name: 'A' },
      { cid: 2, name: 'B' },
    ]
    // Molecule 2 has no data fetched yet
    const rows = buildMatrix(molecules, [MW, ATC, TRIALS], {
      1: { molecularWeight: 200, atcLetter: 'L', activeTrials: 5 },
    })
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      expect(row.cells[1].value).toBeNull()
      expect(row.cells[1].heat).toBeNull()
    }
  })

  it('formats integer attributes without decimals', () => {
    const molecules: Molecule[] = [
      { cid: 1, name: 'A' },
      { cid: 2, name: 'B' },
    ]
    const rows = buildMatrix(molecules, [TRIALS], {
      1: { activeTrials: 7 },
      2: { activeTrials: 23 },
    })
    expect(rows[0].cells.map(c => c.display)).toEqual(['7', '23'])
  })

  it('happy-path scenario: realistic 3-molecule × 4-attribute matrix', () => {
    const molecules: Molecule[] = [
      { cid: 2244, name: 'Aspirin' },
      { cid: 5090, name: 'Ibuprofen' },
      { cid: 3672, name: 'Naproxen' },
    ]
    const data = {
      2244: {
        molecularWeight: 180.16,
        computedProperties: { xLogP: 1.2 },
        atcLetter: 'N',
        activeTrials: 12,
      },
      5090: {
        molecularWeight: 206.28,
        computedProperties: { xLogP: 3.5 },
        atcLetter: 'M',
        activeTrials: 5,
      },
      3672: {
        molecularWeight: 230.26,
        computedProperties: { xLogP: 3.2 },
        atcLetter: 'M',
        activeTrials: 8,
      },
    }
    const rows = buildMatrix(molecules, [MW, LOGP, ATC, TRIALS], data)
    expect(rows).toHaveLength(4)
    // MW row: linear normalization across [180.16, 206.28, 230.26]
    const mwRow = rows[0]
    expect(mwRow.cells[0].heat).toBe(0)
    expect(mwRow.cells[2].heat).toBe(1)
    expect(mwRow.cells[1].heat).toBeGreaterThan(0)
    expect(mwRow.cells[1].heat).toBeLessThan(1)
    // String row carries raw labels
    expect(rows[2].cells.map(c => c.display)).toEqual(['N', 'M', 'M'])
    // Variance is non-trivial for the differentiating numeric rows
    expect(mwRow.variance).toBeGreaterThan(0)
  })
})

describe('sortByVariance', () => {
  it('puts the most differentiating row first', () => {
    const molecules: Molecule[] = [
      { cid: 1, name: 'A' },
      { cid: 2, name: 'B' },
      { cid: 3, name: 'C' },
    ]
    // Row 1 (MW) has wide variation; row 2 (LOGP) all equal => zero variance
    const data = {
      1: { molecularWeight: 100, computedProperties: { xLogP: 2 } },
      2: { molecularWeight: 500, computedProperties: { xLogP: 2 } },
      3: { molecularWeight: 900, computedProperties: { xLogP: 2 } },
    }
    const rows = buildMatrix(molecules, [LOGP, MW], data)
    const sorted = sortByVariance(rows)
    expect(sorted[0].attribute.id).toBe('mw')
    expect(sorted[1].attribute.id).toBe('logp')
  })

  it('preserves original order when variances are tied', () => {
    const molecules: Molecule[] = [
      { cid: 1, name: 'A' },
      { cid: 2, name: 'B' },
    ]
    // String rows always have variance 0
    const data = {
      1: { atcLetter: 'A', adverse: null },
      2: { atcLetter: 'B', adverse: null },
    }
    const rows = buildMatrix(molecules, [ATC, ADVERSE], data)
    const sorted = sortByVariance(rows)
    expect(sorted.map(r => r.attribute.id)).toEqual(['atc', 'adverse'])
  })
})
