import {
  diseaseAssociationGenesOnly,
  geneSymbolsForDgidb,
} from '../genes'
import type { DiseaseGene } from '../../types'

describe('geneSymbolsForDgidb', () => {
  const genes: DiseaseGene[] = [
    { symbol: 'EGFR', score: 0.9, source: 'Open Targets' },
    { symbol: 'TP53', score: 0.8, source: 'DisGeNET (curated)' },
    { symbol: 'RPSA', score: 1, source: 'pinned-target' },
    { symbol: 'BRCA1', score: 0.7, source: 'Open Targets' },
  ]

  it('puts user pins before Open Targets', () => {
    expect(geneSymbolsForDgidb(genes, 3)).toEqual(['RPSA', 'EGFR', 'BRCA1'])
  })

  it('respects max', () => {
    expect(geneSymbolsForDgidb(genes, 1)).toEqual(['RPSA'])
  })
})

describe('diseaseAssociationGenesOnly', () => {
  it('excludes synthetic pins from disease-gene display list', () => {
    const genes: DiseaseGene[] = [
      { symbol: 'EGFR', score: 0.9, source: 'Open Targets' },
      { symbol: 'RPSA', score: 1, source: 'pinned-target' },
    ]
    expect(diseaseAssociationGenesOnly(genes).map((g) => g.symbol)).toEqual(['EGFR'])
  })
})
