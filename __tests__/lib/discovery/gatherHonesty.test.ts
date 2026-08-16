/**
 * Discover gather must mark DisGeNET / DGIdb HTTP failure as error,
 * not honest empty — otherwise rank treats an outage as zero genes/drugs.
 */
jest.mock('@/lib/api/opentargets', () => ({ getTargetsForDisease: jest.fn() }))
jest.mock('@/lib/api/disgenet', () => ({ getGenesByDisease: jest.fn() }))
jest.mock('@/lib/api/dgidb', () => ({ getTargetRelatedMolecules: jest.fn() }))

import { gatherDiseaseGenes } from '@/lib/discovery/sources/genes'
import { gatherTargetMolecules } from '@/lib/discovery/sources/dgidb'
import { getTargetsForDisease } from '@/lib/api/opentargets'
import { getGenesByDisease } from '@/lib/api/disgenet'
import { getTargetRelatedMolecules } from '@/lib/api/dgidb'

describe('gatherDiseaseGenes honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getTargetsForDisease as jest.Mock).mockResolvedValue([])
  })

  it('DisGeNET HTTP 503 is error, not empty', async () => {
    ;(getGenesByDisease as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const out = await gatherDiseaseGenes(null, 'type 2 diabetes')
    const dg = out.statuses.find((s) => s.source.startsWith('DisGeNET'))
    expect(dg?.status).toBe('error')
    expect(dg?.error).toMatch(/HTTP 503/)
    expect(dg?.has_data).toBe(false)
    expect(out.genes).toEqual([])
  })

  it('true zero-hit DisGeNET JSON is empty, not error', async () => {
    ;(getGenesByDisease as jest.Mock).mockResolvedValue([])
    const out = await gatherDiseaseGenes(null, 'rare disease xyz')
    const dg = out.statuses.find((s) => s.source.startsWith('DisGeNET'))
    expect(dg?.status).toBe('empty')
    expect(dg?.error).toBeUndefined()
    expect(out.genes).toEqual([])
  })

  it('DisGeNET rows are loaded', async () => {
    ;(getGenesByDisease as jest.Mock).mockResolvedValue([
      { geneSymbol: 'TTR', score: 0.8, source: 'CURATED' },
    ])
    const out = await gatherDiseaseGenes(null, 'ATTR')
    const dg = out.statuses.find((s) => s.source.startsWith('DisGeNET'))
    expect(dg?.status).toBe('loaded')
    expect(out.genes.map((g) => g.symbol)).toContain('TTR')
  })
})

describe('gatherTargetMolecules honesty', () => {
  const genes = [{ symbol: 'PTGS2', score: 0.9, source: 'Open Targets' }]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('DGIdb HTTP 503 is error, not empty', async () => {
    ;(getTargetRelatedMolecules as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const out = await gatherTargetMolecules(genes)
    expect(out.statuses[0]?.status).toBe('error')
    expect(out.statuses[0]?.error).toMatch(/HTTP 503/)
    expect(out.statuses[0]?.has_data).toBe(false)
    expect(out.molecules).toEqual([])
  })

  it('true zero-hit DGIdb JSON is empty, not error', async () => {
    ;(getTargetRelatedMolecules as jest.Mock).mockResolvedValue([])
    const out = await gatherTargetMolecules(genes)
    expect(out.statuses[0]?.status).toBe('empty')
    expect(out.statuses[0]?.error).toBeUndefined()
    expect(out.molecules).toEqual([])
  })

  it('DGIdb rows are loaded', async () => {
    ;(getTargetRelatedMolecules as jest.Mock).mockResolvedValue([
      { name: 'Aspirin', sharedTargets: ['PTGS2'], interactionTypes: ['inhibitor'], sources: ['DrugBank'] },
    ])
    const out = await gatherTargetMolecules(genes)
    expect(out.statuses[0]?.status).toBe('loaded')
    expect(out.molecules).toHaveLength(1)
  })
})