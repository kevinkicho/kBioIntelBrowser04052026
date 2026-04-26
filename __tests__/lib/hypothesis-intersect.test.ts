import { intersectMatches } from '@/lib/hypothesis/intersect'
import type { MoleculeMatch } from '@/lib/hypothesis/types'

const m = (cid: number, name: string, reason: string): MoleculeMatch => ({
  cid,
  name,
  reason,
})

describe('intersectMatches', () => {
  it('returns an empty array when given no filters', () => {
    expect(intersectMatches([])).toEqual([])
  })

  it('returns an empty array when any filter has no matches', () => {
    const result = intersectMatches([
      [m(1, 'aspirin', 'targets PTGS2')],
      [],
    ])
    expect(result).toEqual([])
  })

  it('returns all matches when only a single filter is provided', () => {
    const result = intersectMatches([
      [m(1, 'aspirin', 'targets PTGS2'), m(2, 'ibuprofen', 'targets PTGS2')],
    ])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ cid: 1, name: 'aspirin', reasons: ['targets PTGS2'] })
    expect(result[1]).toEqual({ cid: 2, name: 'ibuprofen', reasons: ['targets PTGS2'] })
  })

  it('returns an empty array when filters do not overlap', () => {
    const result = intersectMatches([
      [m(1, 'aspirin', 'targets PTGS2')],
      [m(2, 'ibuprofen', 'indicated for fever')],
    ])
    expect(result).toEqual([])
  })

  it('returns the full overlap when all CIDs match across filters', () => {
    const result = intersectMatches([
      [m(1, 'aspirin', 'targets PTGS2'), m(2, 'ibuprofen', 'targets PTGS2')],
      [m(1, 'aspirin', 'indicated for fever'), m(2, 'ibuprofen', 'indicated for pain')],
    ])
    expect(result).toHaveLength(2)
    const aspirin = result.find(r => r.cid === 1)!
    expect(aspirin.reasons).toEqual(['targets PTGS2', 'indicated for fever'])
    const ibuprofen = result.find(r => r.cid === 2)!
    expect(ibuprofen.reasons).toEqual(['targets PTGS2', 'indicated for pain'])
  })

  it('aggregates reasons across multiple filters in input order', () => {
    const result = intersectMatches([
      [m(42, 'imatinib', 'targets BCR-ABL')],
      [m(42, 'imatinib', 'indicated for CML')],
      [m(42, 'imatinib', 'in ATC class L01')],
    ])
    expect(result).toHaveLength(1)
    expect(result[0].reasons).toEqual([
      'targets BCR-ABL',
      'indicated for CML',
      'in ATC class L01',
    ])
  })

  it('intersects only CIDs present in every filter (3-way)', () => {
    const result = intersectMatches([
      [m(1, 'a', 'r1'), m(2, 'b', 'r1'), m(3, 'c', 'r1')],
      [m(2, 'b', 'r2'), m(3, 'c', 'r2')],
      [m(3, 'c', 'r3'), m(1, 'a', 'r3')],
    ])
    expect(result.map(r => r.cid)).toEqual([3])
    expect(result[0].reasons).toEqual(['r1', 'r2', 'r3'])
  })

  it('deduplicates identical reasons across filters', () => {
    const result = intersectMatches([
      [m(7, 'metformin', 'indicated for type 2 diabetes')],
      [m(7, 'metformin', 'indicated for type 2 diabetes')],
    ])
    expect(result).toHaveLength(1)
    expect(result[0].reasons).toEqual(['indicated for type 2 diabetes'])
  })

  it('does not emit duplicate result rows for repeated CIDs in one filter', () => {
    const result = intersectMatches([
      [m(1, 'aspirin', 'reason A'), m(1, 'aspirin', 'reason B')],
      [m(1, 'aspirin', 'reason C')],
    ])
    expect(result).toHaveLength(1)
    expect(result[0].reasons).toEqual(['reason A', 'reason B', 'reason C'])
  })
})
