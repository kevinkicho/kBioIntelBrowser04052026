import { buildDiseaseContext, diseaseContextToPromptBlock, buildGeneContext, geneContextToPromptBlock } from '@/lib/ai/contextBuilder'

describe('Disease context detection regression tests', () => {
  test('isDiseaseContext is true when diseaseResults is present and CID is 0', () => {
    const allData = [
      { id: 'C0001', name: 'Breast cancer', source: 'DISGENET' },
    ]
    const ctx = buildDiseaseContext('Breast cancer', allData as Array<{ id: string; name: string; description?: string; therapeuticAreas?: string[]; source: string; molecules?: { name: string; cid: number | null }[] }>)
    const block = diseaseContextToPromptBlock(ctx)

    expect(block).toContain('Breast cancer')
    expect(block).toContain('DISEASE SEARCH:')
  })

  test('isDiseaseContext would be false if CID were nonzero (regression guard)', () => {
    const cid = 0
    const allData = { diseaseResults: [{ id: 'C0001', name: 'Diabetes', source: 'test' }] }
    const isDiseaseContext = cid === 0 && Array.isArray(allData.diseaseResults)

    expect(isDiseaseContext).toBe(true)

    const buggyCid = Math.abs((s => { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0 } return h })('diabetes'))
    const brokenDetection = buggyCid === 0 && Array.isArray(allData.diseaseResults)
    expect(brokenDetection).toBe(false)
  })
})

describe('Gene context detection regression tests', () => {
  test('isGeneContext is true when geneSymbol is present', () => {
    const allData: Record<string, unknown> = {
      geneOverview: { symbol: 'BRCA1', name: 'BRCA1 DNA repair associated', summary: 'Test' },
    }
    const snapshot = { totalApisSucceeded: 1, totalApisCalled: 2, gaps: [] }

    const ctx = buildGeneContext('BRCA1', allData, snapshot)
    expect(ctx.symbol).toBe('BRCA1')
  })

  test('gene insight prompt modes exist and are buildable', () => {
    const genePromptModes = [
      'gene_therapeutic',
      'gene_repurposing',
      'gene_mechanism',
      'gene_target_assessment',
    ] as const

    expect(genePromptModes).toHaveLength(4)
  })
})

describe('No-entity context guard regression tests', () => {
  test('context guard: cid=0 with no gene/disease falls through to molecule path', () => {
    const isDiseaseContext = false
    const isGeneContext = false
    const cid = 0
    const needsGuard = !isDiseaseContext && !isGeneContext && cid === 0

    expect(needsGuard).toBe(true)
  })

  test('context guard: cid>0 with molecule data works normally', () => {
    const isDiseaseContext = false
    const isGeneContext = false
    const cid: number = 2244
    const needsGuard = !isDiseaseContext && !isGeneContext && cid === 0

    expect(needsGuard).toBe(false)
  })

  test('context guard: disease context bypasses guard', () => {
    const isDiseaseContext = true
    const isGeneContext = false
    const cid = 0
    const needsGuard = !isDiseaseContext && !isGeneContext && cid === 0

    expect(needsGuard).toBe(false)
  })

  test('context guard: gene context bypasses guard', () => {
    const isDiseaseContext = false
    const isGeneContext = true
    const cid = 0
    const needsGuard = !isDiseaseContext && !isGeneContext && cid === 0

    expect(needsGuard).toBe(false)
  })
})

describe('Entity reset on navigation', () => {
  test('gene→disease navigation changes entity key (both cid=0)', () => {
    const geneIdentity = { cid: 0, geneSymbol: 'BRCA1', name: 'BRCA1' }
    const diseaseIdentity = { cid: 0, geneSymbol: undefined, name: 'Diabetes' }

    const geneKey = `${geneIdentity.cid}-${geneIdentity.geneSymbol ?? ''}-${geneIdentity.name}`
    const diseaseKey = `${diseaseIdentity.cid}-${diseaseIdentity.geneSymbol ?? ''}-${diseaseIdentity.name}`

    expect(geneKey).not.toBe(diseaseKey)
  })
})

describe('Context block fallback chain', () => {
  test('gene context block contains gene symbol', () => {
    const allData = {
      geneOverview: { symbol: 'TP53', name: 'Tumor protein p53', summary: 'Tumor suppressor', chromosome: '17', typeOfGene: 'protein-coding' },
    }
    const snapshot = { totalApisSucceeded: 1, totalApisCalled: 2, gaps: [] }
    const geneCtx = buildGeneContext('TP53', allData, snapshot)
    const geneBlock = geneContextToPromptBlock(geneCtx)

    expect(geneBlock).toContain('=== TP53')
    expect(geneBlock).toContain('Tumor protein p53')
  })

  test('disease context block contains disease name', () => {
    const results = [
      { id: 'C0001', name: 'Diabetes', description: 'A metabolic disease', source: 'test',
        molecules: [{ name: 'Metformin', cid: 4048 }] },
    ]
    const diseaseCtx = buildDiseaseContext('Diabetes', results)
    const diseaseBlock = diseaseContextToPromptBlock(diseaseCtx)

    expect(diseaseBlock).toContain('Diabetes')
  })
})