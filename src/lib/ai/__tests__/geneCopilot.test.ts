import {
  buildGeneContext,
  geneContextToPromptBlock,
  type GeneContext,
} from '@/lib/ai/contextBuilder'
import {
  buildGeneTherapeuticPrompt,
  buildGeneRepurposingPrompt,
  buildGeneMechanismPrompt,
  buildGeneTargetAssessmentPrompt,
  buildGeneQAPrompt,
} from '@/lib/ai/promptTemplates'

function makeSnapshot(overrides: Partial<{ totalApisSucceeded: number; totalApisCalled: number; gaps: { panelKey: string; reason: string }[] }> = {}) {
  return {
    totalApisSucceeded: overrides.totalApisSucceeded ?? 5,
    totalApisCalled: overrides.totalApisCalled ?? 6,
    gaps: overrides.gaps ?? [],
  }
}

function makeGeneData(overrides: Record<string, unknown> = {}) {
  return {
    geneOverview: {
      symbol: 'BRCA1',
      name: 'BRCA1 DNA repair associated',
      summary: 'Tumor suppressor gene involved in DNA damage repair.',
      chromosome: '17',
      typeOfGene: 'protein-coding',
      aliases: ['FANCS', 'RNF53'],
      ensemblId: 'ENSG00000012048',
      uniprotId: 'P38398',
      goAnnotations: {
        biologicalProcess: ['DNA repair', 'double-strand break repair'],
        molecularFunction: ['DNA binding'],
        cellularComponent: ['nucleus'],
      },
    },
    geneDrugs: [
      { drugName: 'Olaparib', interactionType: 'inhibitor', sources: ['DGIdb', 'CIViC'] },
      { drugName: 'Talazoparib', interactionType: 'inhibitor', sources: ['DGIdb'] },
    ],
    geneDiseases: {
      disgenetAssociations: [
        { diseaseName: 'Breast cancer', score: 0.95, source: 'DISGENET' },
        { diseaseName: 'Ovarian cancer', score: 0.9, source: 'DISGENET' },
      ],
    },
    geneVariants: {
      clinvarVariants: [
        { clinicalSignificance: 'Pathogenic', geneSymbol: 'BRCA1', conditionName: 'Hereditary breast and ovarian cancer syndrome' },
        { clinicalSignificance: 'Benign', geneSymbol: 'BRCA1', conditionName: undefined },
      ],
    },
    genePathways: {
      reactomePathways: [{ name: 'Homologous DNA Pairing' }],
      wikiPathways: [{ name: 'BRCA1 and BRCA2 pathway' }],
    },
    ...overrides,
  }
}

describe('buildGeneContext', () => {
  test('builds GeneContext from full gene data', () => {
    const ctx = buildGeneContext('BRCA1', makeGeneData(), makeSnapshot())

    expect(ctx.symbol).toBe('BRCA1')
    expect(ctx.name).toBe('BRCA1 DNA repair associated')
    expect(ctx.summary).toContain('Tumor suppressor')
    expect(ctx.chromosome).toBe('17')
    expect(ctx.typeOfGene).toBe('protein-coding')
    expect(ctx.aliases).toEqual(['FANCS', 'RNF53'])
    expect(ctx.ensemblId).toBe('ENSG00000012048')
    expect(ctx.uniprotId).toBe('P38398')
    expect(ctx.targetedDrugs).toHaveLength(2)
    expect(ctx.targetedDrugs[0].drugName).toBe('Olaparib')
    expect(ctx.targetedDrugs[0].interactionType).toBe('inhibitor')
    expect(ctx.diseaseAssociations).toHaveLength(2)
    expect(ctx.diseaseAssociations[0].diseaseName).toBe('Breast cancer')
    expect(ctx.diseaseAssociations[0].score).toBe(0.95)
    expect(ctx.clinvarVariants).toHaveLength(2)
    expect(ctx.clinvarVariants[0].clinicalSignificance).toBe('Pathogenic')
    expect(ctx.pathwayNames).toHaveLength(2)
    expect(ctx.goTerms).toContain('DNA repair')
    expect(ctx.dataCompleteness.panelsLoaded).toBe(5)
    expect(ctx.dataCompleteness.totalPanels).toBe(6)
  })

  test('falls back to geneSymbol when overview has no symbol', () => {
    const data = makeGeneData({ geneOverview: {} })
    const ctx = buildGeneContext('MYGENE', data, makeSnapshot())

    expect(ctx.symbol).toBe('MYGENE')
    expect(ctx.name).toBe('')
    expect(ctx.summary).toBe('')
  })

  test('handles missing nested category data gracefully', () => {
    const data = makeGeneData({
      geneDiseases: undefined,
      geneVariants: undefined,
      genePathways: undefined,
    })
    const ctx = buildGeneContext('X', data, makeSnapshot())

    expect(ctx.diseaseAssociations).toEqual([])
    expect(ctx.clinvarVariants).toEqual([])
    expect(ctx.pathwayNames).toEqual([])
  })

  test('truncates summary to 500 chars', () => {
    const longSummary = 'A'.repeat(800)
    const data = makeGeneData({ geneOverview: { summary: longSummary } })
    const ctx = buildGeneContext('X', data as Record<string, unknown>, makeSnapshot())

    expect(ctx.summary.length).toBe(500)
  })

  test('limits arrays to their max lengths', () => {
    const manyDrugs = Array.from({ length: 30 }, (_, i) => ({
      drugName: `Drug${i}`,
      interactionType: 'inhibitor',
      sources: ['DGIdb'],
    }))
    const manyDiseases = Array.from({ length: 30 }, (_, i) => ({
      diseaseName: `Disease${i}`,
      score: 0.5,
      source: 'DISGENET',
    }))
    const data = makeGeneData({
      geneDrugs: manyDrugs,
      geneDiseases: { disgenetAssociations: manyDiseases },
    })
    const ctx = buildGeneContext('X', data, makeSnapshot())

    expect(ctx.targetedDrugs).toHaveLength(20)
    expect(ctx.diseaseAssociations).toHaveLength(20)
  })

  test('includes gap list in dataCompleteness', () => {
    const snapshot = makeSnapshot({
      gaps: [
        { panelKey: 'gene_pathways', reason: 'API timeout' },
        { panelKey: 'gene_expression', reason: 'No data' },
      ],
    })
    const ctx = buildGeneContext('X', makeGeneData(), snapshot)

    expect(ctx.dataCompleteness.gapList).toEqual([
      'gene_pathways (API timeout)',
      'gene_expression (No data)',
    ])
  })

  test('handles goAnnotations as arrays from overview', () => {
    const data = makeGeneData()
    const ctx = buildGeneContext('BRCA1', data, makeSnapshot())

    expect(ctx.goTerms).toEqual(
      expect.arrayContaining(['DNA repair', 'double-strand break repair', 'DNA binding', 'nucleus']),
    )
  })

  test('handles non-array sources in targeted drugs', () => {
    const data = makeGeneData({
      geneDrugs: [{ drugName: 'DrugA', interactionType: 'agonist', sources: 'not-an-array' }],
    })
    const ctx = buildGeneContext('X', data, makeSnapshot())

    expect(ctx.targetedDrugs).toHaveLength(1)
    expect(ctx.targetedDrugs[0].sources).toEqual([])
  })

  test('handles missing goAnnotations gracefully', () => {
    const data = makeGeneData({ geneOverview: { symbol: 'X', name: 'X' } })
    const ctx = buildGeneContext('X', data as Record<string, unknown>, makeSnapshot())

    expect(ctx.goTerms).toEqual([])
  })
})

describe('geneContextToPromptBlock', () => {
  test('renders full gene context with all sections', () => {
    const ctx = buildGeneContext('BRCA1', makeGeneData(), makeSnapshot())
    const block = geneContextToPromptBlock(ctx)

    expect(block).toContain('=== BRCA1 (BRCA1 DNA repair associated) ===')
    expect(block).toContain('Summary:')
    expect(block).toContain('Location: chr 17')
    expect(block).toContain('Type: protein-coding')
    expect(block).toContain('Ensembl: ENSG00000012048')
    expect(block).toContain('UniProt: P38398')
    expect(block).toContain('Aliases: FANCS, RNF53')
    expect(block).toContain('DRUGS TARGETING THIS GENE')
    expect(block).toContain('Olaparib [inhibitor]')
    expect(block).toContain('DISEASE ASSOCIATIONS')
    expect(block).toContain('Breast cancer')
    expect(block).toContain('CLINICAL VARIANTS')
    expect(block).toContain('Pathogenic')
    expect(block).toContain('PATHWAYS')
    expect(block).toContain('Homologous DNA Pairing')
    expect(block).toContain('GENE ONTOLOGY')
    expect(block).toContain('DATA COMPLETENESS')
    expect(block).toContain('5/6 panels loaded')
  })

  test('omits optional fields when empty', () => {
    const ctx: GeneContext = {
      symbol: 'TEST',
      name: 'Test Gene',
      summary: '',
      chromosome: '',
      typeOfGene: '',
      aliases: [],
      ensemblId: '',
      uniprotId: '',
      targetedDrugs: [],
      diseaseAssociations: [],
      clinvarVariants: [],
      pathwayNames: [],
      goTerms: [],
      dataCompleteness: { panelsLoaded: 0, totalPanels: 0, gapList: [] },
    }
    const block = geneContextToPromptBlock(ctx)

    expect(block).toContain('=== TEST (Test Gene) ===')
    expect(block).not.toContain('Summary:')
    expect(block).not.toContain('Location:')
    expect(block).not.toContain('DRUGS TARGETING')
    expect(block).not.toContain('DISEASE ASSOCIATIONS')
    expect(block).not.toContain('CLINICAL VARIANTS')
    expect(block).not.toContain('PATHWAYS')
    expect(block).not.toContain('GENE ONTOLOGY')
  })

  test('truncates when exceeding maxChars', () => {
    const ctx: GeneContext = {
      symbol: 'X',
      name: 'X',
      summary: 'A'.repeat(200),
      chromosome: '1',
      typeOfGene: 'protein-coding',
      aliases: ['A1', 'A2'],
      ensemblId: 'E',
      uniprotId: 'U',
      targetedDrugs: Array.from({ length: 50 }, (_, i) => ({
        drugName: `Drug${i}`,
        interactionType: 'inhibitor',
        sources: ['DGIdb'],
      })),
      diseaseAssociations: [],
      clinvarVariants: [],
      pathwayNames: [],
      goTerms: [],
      dataCompleteness: { panelsLoaded: 1, totalPanels: 1, gapList: [] },
    }
    const block = geneContextToPromptBlock(ctx, 500)

    expect(block.length).toBeLessThanOrEqual(500 + '[Context truncated]\n'.length + 20)
    expect(block).toContain('[Context truncated]')
  })
})

describe('Gene prompt builders', () => {
  let ctx: GeneContext

  beforeEach(() => {
    ctx = buildGeneContext('BRCA1', makeGeneData(), makeSnapshot())
  })

  test('buildGeneTherapeuticPrompt produces system+user with druggability and disease questions', () => {
    const { system, user } = buildGeneTherapeuticPrompt(ctx)

    expect(system).toBeTruthy()
    expect(user).toContain('BRCA1')
    expect(user).toContain('therapeutic opportunity')
    expect(user).toContain('Olaparib')
    expect(user).toContain('Breast cancer')
    expect(user).toContain('DRUGGABILITY')
    expect(user).toContain('DISEASE PRIORITIZATION')
  })

  test('buildGeneRepurposingPrompt produces repurposing-focused prompt', () => {
    const { system, user } = buildGeneRepurposingPrompt(ctx)

    expect(system).toBeTruthy()
    expect(user).toContain('repurposing')
    expect(user).toContain('BRCA1')
    expect(user).toContain('Olaparib')
    expect(user).toContain('Breast cancer')
  })

  test('buildGeneMechanismPrompt produces mechanism-focused prompt with GO terms', () => {
    const { system, user } = buildGeneMechanismPrompt(ctx)

    expect(system).toBeTruthy()
    expect(user).toContain('mechanism deep-dive')
    expect(user).toContain('BRCA1')
    expect(user).toContain('DRUG INTERACTIONS')
    expect(user).toContain('GENE ONTOLOGY')
    expect(user).toContain('DNA repair')
  })

  test('buildGeneTargetAssessmentPrompt produces target assessment with variant counts', () => {
    const { system, user } = buildGeneTargetAssessmentPrompt(ctx)

    expect(system).toBeTruthy()
    expect(user).toContain('Assess BRCA1')
    expect(user).toContain('DRUGGABILITY SCORE')
    expect(user).toContain('1 pathogenic')
    expect(user).toContain('1 benign')
    expect(user).toContain('MODALITY FIT')
    expect(user).toContain('SAFETY CONCERNS')
  })

  test('buildGeneQAPrompt includes question and gene context', () => {
    const { system, user } = buildGeneQAPrompt(ctx, 'What diseases are linked to BRCA1?')

    expect(system).toBeTruthy()
    expect(user).toContain('What diseases are linked to BRCA1?')
    expect(user).toContain('BRCA1')
    expect(user).toContain('drug discovery researcher')
  })

  test('all gene prompts share the same system prompt', () => {
    const prompts = [
      buildGeneTherapeuticPrompt(ctx).system,
      buildGeneRepurposingPrompt(ctx).system,
      buildGeneMechanismPrompt(ctx).system,
      buildGeneTargetAssessmentPrompt(ctx).system,
      buildGeneQAPrompt(ctx, 'test?').system,
    ]
    const unique = new Set(prompts)
    expect(unique.size).toBe(1)
  })

  test('gene prompt builders handle empty targetedDrugs gracefully', () => {
    const emptyCtx: GeneContext = {
      ...ctx,
      targetedDrugs: [],
      diseaseAssociations: [],
      clinvarVariants: [],
      pathwayNames: [],
      goTerms: [],
    }

    const { user: therapeutic } = buildGeneTherapeuticPrompt(emptyCtx)
    expect(therapeutic).toContain('No targeted drugs found')

    const { user: repurposing } = buildGeneRepurposingPrompt(emptyCtx)
    expect(repurposing).toContain('No drugs found targeting this gene')

    const { user: mechanism } = buildGeneMechanismPrompt(emptyCtx)
    expect(mechanism).toContain('No drug interaction data')

    const { user: assessment } = buildGeneTargetAssessmentPrompt(emptyCtx)
    expect(assessment).toContain('0 known drug interactions')
  })
})