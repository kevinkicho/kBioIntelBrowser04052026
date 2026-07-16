/**
 * ChEMBL target→compound gather (PR3b).
 */

jest.mock('@/lib/api/chembl', () => ({
  searchTargetsByName: jest.fn(),
  getRelatedCompoundsByTarget: jest.fn(),
}))

import {
  searchTargetsByName,
  getRelatedCompoundsByTarget,
} from '@/lib/api/chembl'
import {
  gatherChemblByTarget,
  MAX_CHEMBL_TARGETS,
  MAX_COMPOUNDS_PER_TARGET,
} from '@/lib/discovery/sources/chemblByTarget'
import type { DiseaseGene } from '@/lib/discovery/types'

describe('gatherChemblByTarget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const genes: DiseaseGene[] = [
    { symbol: 'EGFR', score: 0.9, source: 'Open Targets' },
    { symbol: 'APP', score: 0.8, source: 'Open Targets' },
    { symbol: 'PSEN1', score: 0.7, source: 'DisGeNET (curated)' },
  ]

  it('resolves gene → target → compounds and reports loaded status', async () => {
    ;(searchTargetsByName as jest.Mock).mockImplementation(async (q: string) => {
      if (q === 'EGFR') {
        return [
          {
            targetChemblId: 'CHEMBL203',
            targetName: 'Epidermal growth factor receptor',
            targetType: 'SINGLE PROTEIN',
            organism: 'Homo sapiens',
          },
        ]
      }
      return []
    })
    ;(getRelatedCompoundsByTarget as jest.Mock).mockResolvedValue([
      {
        compoundId: 'CHEMBL553',
        compoundName: 'Gefitinib',
        name: 'Gefitinib',
        chemblId: 'CHEMBL553',
        maxPhase: 4,
        activityValue: 33,
        activityType: 'IC50',
        similarity: 100,
        relationship: 'Related',
      },
      {
        compoundId: 'CHEMBL939',
        compoundName: 'Erlotinib',
        name: 'Erlotinib',
        chemblId: 'CHEMBL939',
        maxPhase: 4,
        activityValue: 2,
        activityType: 'IC50',
        similarity: 100,
        relationship: 'Related',
      },
    ])

    const result = await gatherChemblByTarget(genes)

    expect(result.geneSymbolsUsed.length).toBeLessThanOrEqual(MAX_CHEMBL_TARGETS)
    expect(result.geneSymbolsUsed).toContain('EGFR')
    expect(searchTargetsByName).toHaveBeenCalled()
    expect(getRelatedCompoundsByTarget).toHaveBeenCalledWith(
      'CHEMBL203',
      MAX_COMPOUNDS_PER_TARGET,
    )
    expect(result.names).toEqual(expect.arrayContaining(['Gefitinib', 'Erlotinib']))
    expect(result.molecules.some((m) => m.geneSymbol === 'EGFR')).toBe(true)
    expect(result.status.source).toBe('ChEMBL (by-target)')
    expect(result.status.status).toBe('loaded')
    expect(result.status.has_data).toBe(true)
  })

  it('returns empty status when no genes', async () => {
    const result = await gatherChemblByTarget([])
    expect(result.molecules).toEqual([])
    expect(result.status.status).toBe('empty')
    expect(searchTargetsByName).not.toHaveBeenCalled()
  })

  it('returns empty (not error) when targets have no compounds', async () => {
    ;(searchTargetsByName as jest.Mock).mockResolvedValue([
      {
        targetChemblId: 'CHEMBL1',
        targetName: 'X',
        targetType: 'SINGLE PROTEIN',
        organism: 'Homo sapiens',
      },
    ])
    ;(getRelatedCompoundsByTarget as jest.Mock).mockResolvedValue([])

    const result = await gatherChemblByTarget([
      { symbol: 'EGFR', score: 1, source: 'Open Targets' },
    ])
    expect(result.molecules).toEqual([])
    expect(result.status.status).toBe('empty')
  })
})
