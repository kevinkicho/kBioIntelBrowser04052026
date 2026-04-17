import { deduplicateGenes, deduplicateMolecules } from '@/lib/diseaseSearch'
import type { GeneAssociation } from '@/lib/diseaseSearch'

describe('deduplicateGenes', () => {
  it('returns empty array for empty input', () => {
    expect(deduplicateGenes([])).toEqual([])
  })

  it('returns single gene unchanged', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'BRCA1', geneId: 'ENSG00000012048', source: 'Open Targets', score: 0.9 }
    ]
    const result = deduplicateGenes(genes)
    expect(result).toHaveLength(1)
    expect(result[0].geneSymbol).toBe('BRCA1')
    expect(result[0].score).toBe(0.9)
  })

  it('deduplicates genes with same symbol (case-insensitive)', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'BRCA1', geneId: '1', source: 'DisGeNET', score: 0.5, entrezId: '672' },
      { geneSymbol: 'brca1', geneId: '2', source: 'Open Targets', score: 0.9 },
    ]
    const result = deduplicateGenes(genes)
    expect(result).toHaveLength(1)
    expect(result[0].score).toBe(0.9)
    expect(result[0].entrezId).toBe('672')
    expect(result[0].source).toBe('DisGeNET, Open Targets')
  })

  it('keeps higher score when gene appears in multiple sources', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'TP53', geneId: '', source: 'Orphanet', score: 0 },
      { geneSymbol: 'TP53', geneId: '7157', source: 'DisGeNET', score: 0.85, entrezId: '7157' },
    ]
    const result = deduplicateGenes(genes)
    expect(result).toHaveLength(1)
    expect(result[0].score).toBe(0.85)
    expect(result[0].entrezId).toBe('7157')
  })

  it('fills missing geneId from later entry', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'APOE', geneId: '', source: 'Orphanet', score: 0 },
      { geneSymbol: 'APOE', geneId: 'ENSG00000130203', source: 'Open Targets', score: 0.7 },
    ]
    const result = deduplicateGenes(genes)
    expect(result[0].geneId).toBe('ENSG00000130203')
  })

  it('sorts by score descending', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'ACE', geneId: '', source: 'Orphanet', score: 0 },
      { geneSymbol: 'BRCA1', geneId: '', source: 'DisGeNET', score: 0.4 },
      { geneSymbol: 'TP53', geneId: '', source: 'DisGeNET', score: 0.9 },
    ]
    const result = deduplicateGenes(genes)
    expect(result.map(g => g.geneSymbol)).toEqual(['TP53', 'BRCA1', 'ACE'])
  })

  it('preserves distinct genes', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'BRCA1', geneId: '1', source: 'DisGeNET', score: 0.8 },
      { geneSymbol: 'BRCA2', geneId: '2', source: 'DisGeNET', score: 0.7 },
    ]
    const result = deduplicateGenes(genes)
    expect(result).toHaveLength(2)
  })
})

describe('deduplicateMolecules', () => {
  it('returns empty array for empty input', () => {
    expect(deduplicateMolecules([])).toEqual([])
  })

  it('deduplicates molecules with same CID', () => {
    const results = [
      {
        id: '1', name: 'Disease A', source: 'Open Targets',
        molecules: [
          { name: 'Aspirin', cid: 2244 },
        ]
      },
      {
        id: '2', name: 'Disease B', source: 'DisGeNET',
        molecules: [
          { name: 'Aspirin', cid: 2244 },
        ]
      },
    ]
    const result = deduplicateMolecules(results)
    expect(result).toHaveLength(1)
    expect(result[0].sources).toEqual(['Open Targets', 'DisGeNET'])
  })

  it('deduplicates by name when CID is null', () => {
    const results = [
      {
        id: '1', name: 'Disease A', source: 'Open Targets',
        molecules: [
          { name: 'Some Protein', cid: null },
        ]
      },
      {
        id: '2', name: 'Disease B', source: 'DisGeNET',
        molecules: [
          { name: 'some protein', cid: null },
        ]
      },
    ]
    const result = deduplicateMolecules(results)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Some Protein')
    expect(result[0].sources).toEqual(['Open Targets', 'DisGeNET'])
  })

  it('keeps distinct molecules separate', () => {
    const results = [
      {
        id: '1', name: 'Disease A', source: 'Open Targets',
        molecules: [
          { name: 'Aspirin', cid: 2244 },
          { name: 'Ibuprofen', cid: 3672 },
        ]
      },
    ]
    const result = deduplicateMolecules(results)
    expect(result).toHaveLength(2)
  })

  it('handles molecules with no results having molecules', () => {
    const results = [
      { id: '1', name: 'Disease A', source: 'Open Targets' },
    ]
    const result = deduplicateMolecules(results)
    expect(result).toHaveLength(0)
  })
})