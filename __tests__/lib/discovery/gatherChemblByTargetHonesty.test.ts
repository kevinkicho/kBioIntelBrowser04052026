/**
 * Discover gather must mark ChEMBL by-target HTTP failure as error,
 * not honest empty — otherwise rank treats an outage as zero compounds.
 */
jest.mock('@/lib/api/chembl', () => ({
  searchTargetsByName: jest.fn(),
  getRelatedCompoundsByTarget: jest.fn(),
}))

import {
  searchTargetsByName,
  getRelatedCompoundsByTarget,
} from '@/lib/api/chembl'
import { gatherChemblByTarget } from '@/lib/discovery/sources/chemblByTarget'
import type { DiseaseGene } from '@/lib/discovery/types'

const gene: DiseaseGene = { symbol: 'EGFR', score: 1, source: 'Open Targets' }

describe('gatherChemblByTarget honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ChEMBL target search HTTP 503 is error, not empty', async () => {
    ;(searchTargetsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const out = await gatherChemblByTarget([gene])
    expect(out.status.status).toBe('error')
    expect(out.status.error).toMatch(/HTTP 503/)
    expect(out.status.has_data).toBe(false)
    expect(out.molecules).toEqual([])
  })

  it('ChEMBL related-compounds HTTP 503 is error, not empty', async () => {
    ;(searchTargetsByName as jest.Mock).mockResolvedValue([
      {
        targetChemblId: 'CHEMBL203',
        targetName: 'EGFR',
        targetType: 'SINGLE PROTEIN',
        organism: 'Homo sapiens',
      },
    ])
    ;(getRelatedCompoundsByTarget as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const out = await gatherChemblByTarget([gene])
    expect(out.status.status).toBe('error')
    expect(out.status.error).toMatch(/HTTP 503/)
    expect(out.status.has_data).toBe(false)
    expect(out.molecules).toEqual([])
  })

  it('true zero-hit ChEMBL by-target JSON is empty, not error', async () => {
    ;(searchTargetsByName as jest.Mock).mockResolvedValue([])
    const out = await gatherChemblByTarget([gene])
    expect(out.status.status).toBe('empty')
    expect(out.status.error).toBeUndefined()
    expect(out.molecules).toEqual([])
    expect(getRelatedCompoundsByTarget).not.toHaveBeenCalled()
  })

  it('all-empty plus one HTTP failure is error, not empty-success', async () => {
    ;(searchTargetsByName as jest.Mock)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('HTTP 503'))
    const out = await gatherChemblByTarget([
      gene,
      { symbol: 'APP', score: 0.8, source: 'Open Targets' },
    ])
    expect(out.status.status).toBe('error')
    expect(out.status.error).toMatch(/HTTP 503/)
    expect(out.status.has_data).toBe(false)
  })

  it('partial HTTP failure still loads compounds from the healthy gene', async () => {
    ;(searchTargetsByName as jest.Mock)
      .mockRejectedValueOnce(new Error('HTTP 503'))
      .mockResolvedValueOnce([
        {
          targetChemblId: 'CHEMBL203',
          targetName: 'EGFR',
          targetType: 'SINGLE PROTEIN',
          organism: 'Homo sapiens',
        },
      ])
    ;(getRelatedCompoundsByTarget as jest.Mock).mockResolvedValue([
      {
        compoundId: 'CHEMBL553',
        compoundName: 'Gefitinib',
        name: 'Gefitinib',
        chemblId: 'CHEMBL553',
        maxPhase: 4,
        similarity: 100,
        relationship: 'Related',
      },
    ])
    const out = await gatherChemblByTarget([
      { symbol: 'APP', score: 0.8, source: 'Open Targets' },
      gene,
    ])
    expect(out.status.status).toBe('loaded')
    expect(out.names).toContain('Gefitinib')
    expect(out.status.has_data).toBe(true)
  })
})
