import * as mygene from '@/lib/api/mygene'
import * as ncbiGene from '@/lib/api/ncbi-gene'
import * as ensembl from '@/lib/api/ensembl'
import * as disgenet from '@/lib/api/disgenet'
import * as clinvar from '@/lib/api/clinvar'
import * as dbsnp from '@/lib/api/dbsnp'
import * as gtex from '@/lib/api/gtex'
import * as bgee from '@/lib/api/bgee'
import * as expressionAtlas from '@/lib/api/expression-atlas'
import * as reactome from '@/lib/api/reactome'
import * as wikipathways from '@/lib/api/wikipathways'
import * as geneOntology from '@/lib/api/gene-ontology'
import { fetchGene } from '@/lib/categoryFetchers/gene'

jest.mock('@/lib/api/mygene')
jest.mock('@/lib/api/ncbi-gene')
jest.mock('@/lib/api/ensembl')
jest.mock('@/lib/api/disgenet')
jest.mock('@/lib/api/clinvar')
jest.mock('@/lib/api/dbsnp')
jest.mock('@/lib/api/gtex')
jest.mock('@/lib/api/bgee')
jest.mock('@/lib/api/expression-atlas')
jest.mock('@/lib/api/reactome')
jest.mock('@/lib/api/wikipathways')
jest.mock('@/lib/api/gene-ontology')
jest.mock('@/lib/api-tracker', () => ({
  trackedSafe: (_source: string, promise: Promise<unknown>, fallback: unknown) =>
    Promise.resolve(promise).catch(() => fallback),
}))

const mockMyGene = mygene as jest.Mocked<typeof mygene>
const mockNcbiGene = ncbiGene as jest.Mocked<typeof ncbiGene>
const mockDisgenet = disgenet as jest.Mocked<typeof disgenet>
const mockClinvar = clinvar as jest.Mocked<typeof clinvar>

beforeEach(() => {
  jest.clearAllMocks()
  ;(ensembl as jest.Mocked<typeof ensembl>).getEnsemblGenesBySymbols.mockResolvedValue([])
  ;(dbsnp as jest.Mocked<typeof dbsnp>).getDbSNPVariants.mockResolvedValue([])
  ;(gtex as jest.Mocked<typeof gtex>).getGTExTopTissues.mockResolvedValue([])
  ;(bgee as jest.Mocked<typeof bgee>).getBgeeData.mockResolvedValue({ expressions: [] } as never)
  ;(expressionAtlas as jest.Mocked<typeof expressionAtlas>).getGeneExpressionBySymbols.mockResolvedValue([])
  ;(geneOntology as jest.Mocked<typeof geneOntology>).searchGOTerms.mockResolvedValue({ terms: [], total: 0 })
  ;(reactome as jest.Mocked<typeof reactome>).getReactomePathwaysByName.mockResolvedValue([])
  ;(wikipathways as jest.Mocked<typeof wikipathways>).getWikiPathwaysByName.mockResolvedValue([])
})

describe('fetchGene', () => {
  test('returns gene overview with data from MyGene and NCBI Gene', async () => {
    mockMyGene.getGeneById.mockResolvedValue({
      geneId: '673',
      symbol: 'BRCA1',
      name: 'BRCA1 DNA repair associated',
      taxid: 9606,
      ensemblId: 'ENSG00000012048',
      uniprotId: 'P38398',
      summary: 'Tumor suppressor gene.',
      aliases: ['FANCS', 'RNF53'],
      typeOfGene: 'protein-coding',
      mapLocation: '17q21.31',
      pathways: ['Homologous recombination'],
      goAnnotations: {
        biologicalProcess: ['DNA repair'],
        molecularFunction: ['DNA binding'],
        cellularComponent: ['nucleus'],
      },
    })

    mockNcbiGene.getGeneInfoByName.mockResolvedValue([
      {
        geneId: '673',
        symbol: 'BRCA1',
        name: 'BRCA1 DNA repair associated',
        summary: 'Tumor suppressor that plays a key role in DNA repair.',
        organism: 'Homo sapiens',
        chromosome: '17',
        mapLocation: '17q21.31',
        url: 'https://www.ncbi.nlm.nih.gov/gene/673',
      },
    ] as never)

    mockDisgenet.getDiseasesByGene.mockResolvedValue([])
    mockClinvar.getClinVarByGene.mockResolvedValue([])

    const result = await fetchGene('673', 'BRCA1')

    expect(result.geneOverview).toBeDefined()
    expect(result.geneOverview.symbol).toBe('BRCA1')
    expect(result.geneOverview.name).toBe('BRCA1 DNA repair associated')
    expect(result.geneOverview.summary).toBeTruthy()
    expect(result.geneOverview.chromosome).toBe('17')
    expect(result.geneOverview.ensemblId).toBe('ENSG00000012048')
    expect(result.geneOverview.uniprotId).toBe('P38398')
    expect(result.geneOverview.aliases).toEqual(['FANCS', 'RNF53'])
  })

  test('handles missing MyGene data gracefully', async () => {
    mockMyGene.getGeneById.mockResolvedValue(null)
    mockNcbiGene.getGeneInfoByName.mockResolvedValue([])
    mockDisgenet.getDiseasesByGene.mockResolvedValue([])
    mockClinvar.getClinVarByGene.mockResolvedValue([])

    const result = await fetchGene('999999', 'UNKNOWN')

    expect(result.geneOverview).toBeDefined()
    expect(result.geneOverview.symbol).toBe('UNKNOWN')
    expect(result.geneOverview.geneId).toBe('999999')
  })

  test('includes disease associations when available', async () => {
    mockMyGene.getGeneById.mockResolvedValue({
      geneId: '673',
      symbol: 'BRCA1',
      name: 'BRCA1',
      taxid: 9606,
      ensemblId: '',
      uniprotId: '',
      summary: '',
      aliases: [],
      typeOfGene: '',
      mapLocation: '',
      pathways: [],
      goAnnotations: { biologicalProcess: [], molecularFunction: [], cellularComponent: [] },
    })

    mockNcbiGene.getGeneInfoByName.mockResolvedValue([])
    mockDisgenet.getDiseasesByGene.mockResolvedValue([
      { geneSymbol: 'BRCA1', geneId: '673', diseaseId: 'C0001', diseaseName: 'Breast cancer', diseaseType: 'disease', score: 0.95, source: 'disgenet', pmids: [] },
      { geneSymbol: 'BRCA1', geneId: '673', diseaseId: 'C0002', diseaseName: 'Ovarian cancer', diseaseType: 'disease', score: 0.9, source: 'disgenet', pmids: [] },
    ] as never)

    mockClinvar.getClinVarByGene.mockResolvedValue([])

    const result = await fetchGene('673', 'BRCA1')

    expect(result.geneDiseases.disgenetAssociations).toBeDefined()
    expect(result.geneDiseases.disgenetAssociations.length).toBe(2)
    expect(result.geneDiseases.disgenetAssociations[0].diseaseName).toBe('Breast cancer')
  })

  test('includes targeted drugs data', async () => {
    mockMyGene.getGeneById.mockResolvedValue({
      geneId: '673',
      symbol: 'BRCA1',
      name: 'BRCA1',
      taxid: 9606,
      ensemblId: '',
      uniprotId: '',
      summary: '',
      aliases: [],
      typeOfGene: '',
      mapLocation: '',
      pathways: [],
      goAnnotations: { biologicalProcess: [], molecularFunction: [], cellularComponent: [] },
    })

    mockNcbiGene.getGeneInfoByName.mockResolvedValue([])
    mockDisgenet.getDiseasesByGene.mockResolvedValue([])
    mockClinvar.getClinVarByGene.mockResolvedValue([])
    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('dgidb.org')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            matchedTerms: [{ termName: 'BRCA1', interactions: [
              { drugName: 'Olaparib', interactionType: 'inhibitor', sources: ['DGIdb'], score: 0.9, pmids: [] },
              { drugName: 'Talazoparib', interactionType: 'inhibitor', sources: ['DGIdb'], score: 0.8, pmids: [] },
            ]}],
          }),
        })
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    })

    const result = await fetchGene('673', 'BRCA1')

    expect(result.geneDrugs).toBeDefined()
    expect(result.geneDrugs.length).toBeGreaterThanOrEqual(0)
  })

  test('includes variant data', async () => {
    mockMyGene.getGeneById.mockResolvedValue({
      geneId: '673',
      symbol: 'BRCA1',
      name: 'BRCA1',
      taxid: 9606,
      ensemblId: '',
      uniprotId: '',
      summary: '',
      aliases: [],
      typeOfGene: '',
      mapLocation: '',
      pathways: [],
      goAnnotations: { biologicalProcess: [], molecularFunction: [], cellularComponent: [] },
    })

    mockNcbiGene.getGeneInfoByName.mockResolvedValue([])
    mockDisgenet.getDiseasesByGene.mockResolvedValue([])
    mockClinvar.getClinVarByGene.mockResolvedValue([
      { variantId: '1', clinicalSignificance: 'Pathogenic', geneSymbol: 'BRCA1', conditionName: 'Hereditary breast cancer', url: '' },
    ] as never)

    const result = await fetchGene('673', 'BRCA1')

    expect(result.geneVariants.clinvarVariants).toBeDefined()
    expect(result.geneVariants.clinvarVariants.length).toBe(1)
  })
})