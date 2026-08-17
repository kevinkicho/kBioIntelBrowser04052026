/**
 * Category protein-structure first-paint: PDBe ligands / PRIDE / CATH / SAbDab
 * plus UniProt-extended / EBI variations / proteomics / cross-refs.
 * HTTP errors must record ERROR in trackedSafe metrics, not silent EMPTY.
 */

jest.mock('@/lib/api/uniprot', () => ({
  getUniprotEntriesByName: jest.fn(async () => [{ accession: 'P04637', geneName: 'TP53' }]),
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
import { getUniProtProtein } from '@/lib/api/uniprot'
import { getProteinVariations, getProteomicsMappings, getProteinCrossReferences } from '@/lib/api/ebi-proteins-variation'

const FIRST_WAVE = [
  { source: 'pdbe-ligands', panelId: 'pdbe-ligands', mock: getPdbeLigandsByName as jest.Mock },
  { source: 'pride', panelId: 'pride', mock: searchPRIDE as jest.Mock },
  { source: 'cath', panelId: 'cath', mock: searchCATHDomains as jest.Mock },
  { source: 'sabdab', panelId: 'sabdab', mock: searchSAbDab as jest.Mock },
] as const

const SECOND_WAVE = [
  { source: 'uniprot-extended', panelId: 'uniprot-extended', mock: getUniProtProtein as jest.Mock, empty: [] },
  { source: 'ebi-proteins', panelId: 'ebi-proteins', mock: getProteinVariations as jest.Mock, empty: null },
  { source: 'ebi-proteomics', panelId: 'ebi-proteomics', mock: getProteomicsMappings as jest.Mock, empty: null },
  { source: 'ebi-crossrefs', panelId: 'ebi-crossrefs', mock: getProteinCrossReferences as jest.Mock, empty: null },
] as const

describe('protein-structure category honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const leaf of FIRST_WAVE) leaf.mock.mockResolvedValue([])
    for (const leaf of SECOND_WAVE) leaf.mock.mockResolvedValue(null)
  })

  it('HTTP 503 on PDBe/PRIDE/CATH/SAbDab is ERROR, not EMPTY', async () => {
    for (const leaf of FIRST_WAVE) leaf.mock.mockRejectedValue(new Error('HTTP 503'))

    const { value, metrics } = await runWithApiMetrics(async () =>
      fetchProteinStructure('aspirin', (s) => s, {}),
    )
    const status = metricsToSourceStatus(metrics)

    expect(value.pdbeLigands).toEqual([])
    expect(value.prideProjects).toEqual([])
    expect(value.cathData.domains).toEqual([])
    expect(value.sabdabEntries).toEqual([])

    for (const leaf of FIRST_WAVE) {
      expect(status[leaf.source]?.status).toBe('error')
      expect(status[leaf.source]?.error).toMatch(/HTTP 503/)
      expect(status[leaf.source]?.has_data).toBe(false)
      expect(sourceStatusForPanel(status, leaf.panelId)?.status).toBe('error')
    }
  })

  it('HTTP 503 on UniProt-extended / EBI variations / proteomics / cross-refs is ERROR, not EMPTY', async () => {
    for (const leaf of SECOND_WAVE) leaf.mock.mockRejectedValue(new Error('HTTP 503'))

    const { value, metrics } = await runWithApiMetrics(async () =>
      fetchProteinStructure('aspirin', (s) => s, {}),
    )
    const status = metricsToSourceStatus(metrics)

    expect(value.uniprotProteins).toEqual([])
    expect(value.ebiProteinVariations).toBeNull()
    expect(value.ebiProteomicsData).toBeNull()
    expect(value.ebiCrossReferences).toBeNull()

    for (const leaf of SECOND_WAVE) {
      expect(leaf.mock).toHaveBeenCalled()
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
    expect(value.uniprotProteins).toEqual([])
    expect(value.ebiProteinVariations).toBeNull()
    expect(value.ebiProteomicsData).toBeNull()
    expect(value.ebiCrossReferences).toBeNull()

    for (const leaf of [...FIRST_WAVE, ...SECOND_WAVE]) {
      expect(status[leaf.source]?.status).toBe('empty')
      expect(status[leaf.source]?.error).toBeUndefined()
      expect(sourceStatusForPanel(status, leaf.panelId)?.status).toBe('empty')
    }
  })
})
