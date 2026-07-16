import { geneSymbolsForDgidb, MAX_DGIDB_GENES } from '@/lib/discovery/sources/genes'
import type { DiseaseGene } from '@/lib/discovery/types'

describe('geneSymbolsForDgidb', () => {
  it('prefers Open Targets genes then fills from supporting sources', () => {
    const genes: DiseaseGene[] = [
      { symbol: 'APP', score: 0.9, source: 'Open Targets' },
      { symbol: 'PSEN1', score: 0.8, source: 'Open Targets' },
      { symbol: 'TREM2', score: 0.95, source: 'DisGeNET (BEFREE)' },
      { symbol: 'APOE', score: 0.7, source: 'DisGeNET (CURATED)' },
    ]
    // OT first even if DisGeNET score is higher on TREM2
    expect(geneSymbolsForDgidb(genes, 3)).toEqual(['APP', 'PSEN1', 'TREM2'])
  })

  it('caps at max and defaults to MAX_DGIDB_GENES', () => {
    const genes: DiseaseGene[] = Array.from({ length: 12 }, (_, i) => ({
      symbol: `GENE${i}`,
      score: 1 - i * 0.01,
      source: 'Open Targets',
    }))
    expect(geneSymbolsForDgidb(genes).length).toBe(MAX_DGIDB_GENES)
    expect(geneSymbolsForDgidb(genes, 2)).toEqual(['GENE0', 'GENE1'])
  })

  it('returns empty for empty gene list', () => {
    expect(geneSymbolsForDgidb([])).toEqual([])
  })

  it('dedupes by symbol case-insensitively', () => {
    const genes: DiseaseGene[] = [
      { symbol: 'App', score: 0.9, source: 'Open Targets' },
      { symbol: 'APP', score: 0.5, source: 'DisGeNET (x)' },
    ]
    expect(geneSymbolsForDgidb(genes)).toEqual(['App'])
  })
})
