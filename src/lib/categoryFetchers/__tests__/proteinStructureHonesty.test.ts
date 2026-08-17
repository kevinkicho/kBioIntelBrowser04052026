/**
 * Category protein-structure first-paint: PDBe ligands / PRIDE / CATH / SAbDab
 * HTTP errors must record ERROR in trackedSafe metrics, not silent EMPTY.
 */

jest.mock('@/lib/api/uniprot', () => ({
  getUniprotEntriesByName: jest.fn(async () => []),
  getUniProtProtein: jest.fn(async () => null),
}))
jest.mock('@/lib/api/alphafold', () => ({
  getAlphaFoldPredictions: jest.fn(async () => []),
}))
jest.mock('@/lib/api/interpro', () => ({
  getProteinDomains: jest.fn(async () => []),
}))
jest.mock('@/lib/api/ebi-proteins', () => ({
  getProteinFeaturesByAccessions: jest.fn(async () => []),
}))
jest.mock('@/lib/api/protein-atlas', () => ({
  getProteinAtlasBySymbols: jest.fn(async () => []),
}))
jest.mock('@/lib/api/quickgo', () => ({
  getGoAnnotationsByAccessions: jest.fn(async () => []),
}))
jest.mock('@/lib/api/pdb', () => ({
  getPdbStructuresByName: jest.fn(async () => []),
}))
jest.mock('@/lib/api/pdbe-ligands', () => ({
  getPdbeLigandsByName: jest.fn(async () => []),
}))
jest.mock('@/lib/api/peptideatlas', () => ({
  getPeptideAtlasData: jest.fn(async () => ({ peptides: [] })),
}))
jest.mock('@/lib/api/pride', () => ({
  searchPRIDE: jest.fn(async () => []),
}))
jest.mock('@/lib/api/cath', () => ({
  searchCATHDomains: jest.fn(async () => []),
  searchGene3D: jest.fn(async () => []),
}))
jest.mock('@/lib/api/sabdab', () => ({
  searchSAbDab: jest.fn(async () => []),
}))
jest.mock('@/lib/api/ebi-proteins-variation', () => ({
  getProteinVariations: jest.fn(async () => null),
  getProteomicsMappings: jest.fn(async () => null),
  getProteinCrossReferences: jest.fn(async () => null),
}))
jest.mock('@/lib/api/human-protein-atlas', () => ({
  getProteinAtlasData: jest.fn(async () => null),
}))

import { fetchProteinStructure } from '../proteinStructure'
import { metricsToSourceStatus, runWithApiMetrics } from '@/lib/api-tracker'
import { sourceStatusForPanel } from '@/lib/panelApiTrace'
import { getPdbeLigandsByName } from '@/lib/api/pdbe-ligands'
import { searchPRIDE } from '@/lib/api/pride'
import { searchCATHDomains } from '@/lib/api/cath'
import { searchSAbDab } from '@/lib/api/sabdab'

const LEAVES = [
  { source: 'pdbe-ligands', panelId: 'pdbe-ligands', mock: getPdbeLigandsByName as jest.Mock },
  { source: 'pride', panelId: 'pride', mock: searchPRIDE as jest.Mock },
  { source: 'cath', panelId: 'cath', mock: searchCATHDomains as jest.Mock },
  { source: 'sabdab', panelId: 'sabdab', mock: searchSAbDab as jest.Mock },
] as const

describe('protein-structure category honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const leaf of LEAVES) leaf.mock.mockResolvedValue([])
  })

  it('HTTP 503 on PDBe/PRIDE/CATH/SAbDab is ERROR, not EMPTY', async () => {
    for (const leaf of LEAVES) leaf.mock.mockRejectedValue(new Error('HTTP 503'))

    const { value, metrics } = await runWithApiMetrics(async () =>
      fetchProteinStructure('aspirin', (s) => s, {}),
    )
    const status = metricsToSourceStatus(metrics)

    expect(value.pdbeLigands).toEqual([])
    expect(value.prideProjects).toEqual([])
    expect(value.cathData.domains).toEqual([])
    expect(value.sabdabEntries).toEqual([])

    for (const leaf of LEAVES) {
      expect(status[leaf.source]?.status).toBe('error')
      expect(status[leaf.source]?.error).toMatch(/HTTP 503/)
      expect(status[leaf.source]?.has_data).toBe(false)
      expect(sourceStatusForPanel(status, leaf.panelId)?.status).toBe('error')
    }
  })

  it('true zero-hit is empty, not error', async () => {
    const { value, metrics } = await runWithApiMetrics(async () =>
      fetchProteinStructure('aspirin', (s) => s, {}),
    )
    const status = metricsToSourceStatus(metrics)

    expect(value.pdbeLigands).toEqual([])
    expect(value.prideProjects).toEqual([])
    expect(value.cathData.domains).toEqual([])
    expect(value.sabdabEntries).toEqual([])

    for (const leaf of LEAVES) {
      expect(status[leaf.source]?.status).toBe('empty')
      expect(status[leaf.source]?.error).toBeUndefined()
      expect(sourceStatusForPanel(status, leaf.panelId)?.status).toBe('empty')
    }
  })
})