/**
 * Category molecular-chemical first-paint: combined Synthesis card (KEGG + Rhea).
 * KEGG HTTP errors must record ERROR on synthesis-routes, not silent EMPTY.
 * Rhea stays separately tracked; true zero-hit JSON stays empty.
 */

jest.mock('@/lib/api/pubchem-properties', () => ({
  getComputedPropertiesByCid: jest.fn(async () => null),
}))
jest.mock('@/lib/api/pubchem-hazards', () => ({
  getGhsHazardsByCid: jest.fn(async () => ({ signalWord: '', hazardStatements: [], precautionaryStatements: [] })),
}))
jest.mock('@/lib/api/chebi', () => ({
  getChebiAnnotationByName: jest.fn(async () => null),
}))
jest.mock('@/lib/api/comptox', () => ({
  getCompToxByName: jest.fn(async () => null),
}))
jest.mock('@/lib/api/kegg', () => ({
  getKeggCompoundId: jest.fn(async () => null),
  getKeggReactions: jest.fn(async () => []),
  getKeggReactionDetail: jest.fn(async () => null),
}))
jest.mock('@/lib/api/rhea', () => ({
  getRheaSynthesisRoutes: jest.fn(async () => []),
}))
jest.mock('@/lib/api/metabolomics', () => ({
  getMetabolomicsData: jest.fn(async () => ({ metabolites: [], studies: [] })),
}))
jest.mock('@/lib/api/mychem', () => ({
  getMyChemData: jest.fn(async () => ({ chemicals: [] })),
}))
jest.mock('@/lib/api/hmdb', () => ({
  getHMDBData: jest.fn(async () => ({ metabolites: [] })),
}))
jest.mock('@/lib/api/massbank', () => ({
  searchMassBank: jest.fn(async () => []),
}))
jest.mock('@/lib/api/chemspider', () => ({
  searchChemSpider: jest.fn(async () => []),
}))
jest.mock('@/lib/api/metabolights', () => ({
  searchMetaboLights: jest.fn(async () => []),
}))
jest.mock('@/lib/api/gnps', () => ({
  searchGNPSLibrary: jest.fn(async () => []),
  searchGNPSNetworks: jest.fn(async () => []),
}))
jest.mock('@/lib/api/lipidmaps', () => ({
  searchLipidMaps: jest.fn(async () => ({ lipids: [], total: 0 })),
}))
jest.mock('@/lib/api/unichem', () => ({
  getAllCompoundIds: jest.fn(async () => ({ inchiKey: null, mappings: {}, mappingList: [] })),
  unichemMappingDeepLink: jest.fn(() => ''),
}))
jest.mock('@/lib/api/foodb', () => ({
  searchFooDB: jest.fn(async () => []),
}))

import { fetchMolecularChemical } from '../molecularChemical'
import { metricsToSourceStatus, runWithApiMetrics } from '@/lib/api-tracker'
import { sourceStatusForPanel } from '@/lib/panelApiTrace'
import { getKeggCompoundId, getKeggReactions, getKeggReactionDetail } from '@/lib/api/kegg'
import { getRheaSynthesisRoutes } from '@/lib/api/rhea'

describe('molecular-chemical synthesis category honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getKeggCompoundId as jest.Mock).mockResolvedValue(null)
    ;(getKeggReactions as jest.Mock).mockResolvedValue([])
    ;(getKeggReactionDetail as jest.Mock).mockResolvedValue(null)
    ;(getRheaSynthesisRoutes as jest.Mock).mockResolvedValue([])
  })

  it('HTTP 503 on KEGG compound lookup is ERROR on the Synthesis card, not EMPTY', async () => {
    ;(getKeggCompoundId as jest.Mock).mockRejectedValue(new Error('HTTP 503'))

    const { value, metrics } = await runWithApiMetrics(async () =>
      fetchMolecularChemical('aspirin', 2244, 180.16, (s) => s, {}),
    )
    const status = metricsToSourceStatus(metrics)

    expect(value.routes).toEqual([])
    expect(status['synthesis-routes']?.status).toBe('error')
    expect(status['synthesis-routes']?.error).toMatch(/HTTP 503/)
    expect(status['synthesis-routes']?.has_data).toBe(false)
    expect(sourceStatusForPanel(status, 'synthesis')?.status).toBe('error')
  })

  it('HTTP 503 on KEGG reactions is ERROR, not EMPTY', async () => {
    ;(getKeggCompoundId as jest.Mock).mockResolvedValue('C00031')
    ;(getKeggReactions as jest.Mock).mockRejectedValue(new Error('HTTP 503'))

    const { value, metrics } = await runWithApiMetrics(async () =>
      fetchMolecularChemical('glucose', 5793, 180.16, (s) => s, {}),
    )
    const status = metricsToSourceStatus(metrics)

    expect(value.routes).toEqual([])
    expect(status['synthesis-routes']?.status).toBe('error')
    expect(status['synthesis-routes']?.error).toMatch(/HTTP 503/)
    expect(sourceStatusForPanel(status, 'synthesis')?.status).toBe('error')
  })

  it('true zero-hit is empty, not error', async () => {
    const { value, metrics } = await runWithApiMetrics(async () =>
      fetchMolecularChemical('aspirin', 2244, 180.16, (s) => s, {}),
    )
    const status = metricsToSourceStatus(metrics)

    expect(value.routes).toEqual([])
    expect(getKeggCompoundId).toHaveBeenCalled()
    expect(status['synthesis-routes']?.status).toBe('empty')
    expect(status['synthesis-routes']?.error).toBeUndefined()
    expect(sourceStatusForPanel(status, 'synthesis')?.status).toBe('empty')
  })

  it('KEGG routes load when compound + reactions succeed', async () => {
    ;(getKeggCompoundId as jest.Mock).mockResolvedValue('C00031')
    ;(getKeggReactions as jest.Mock).mockResolvedValue(['R00010'])
    ;(getKeggReactionDetail as jest.Mock).mockResolvedValue({
      id: 'R00010',
      name: 'Glucose phosphorylation',
      equation: 'ATP + D-Glucose => ADP + D-Glucose-6P',
      enzymes: ['2.7.1.1'],
    })

    const { value, metrics } = await runWithApiMetrics(async () =>
      fetchMolecularChemical('glucose', 5793, 180.16, (s) => s, {}),
    )
    const status = metricsToSourceStatus(metrics)

    expect(value.routes).toHaveLength(1)
    expect(value.routes[0].source).toBe('kegg')
    expect(status['synthesis-routes']?.status).toBe('loaded')
    expect(sourceStatusForPanel(status, 'synthesis')?.status).toBe('loaded')
  })
})
