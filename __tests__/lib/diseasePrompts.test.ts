import {
  buildDiseaseQuickSummaryPrompt,
  buildDiseaseRepurposingPrompt,
  buildDiseaseTherapeuticGapPrompt,
  buildDiseaseConnectionMapPrompt,
  type DiseaseDetailContext,
} from '@/lib/ai/diseasePrompts'
import { findGenesWithoutDrugs } from '@/lib/ai/diseasePrompts'
import type { GeneAssociation } from '@/lib/diseaseSearch'

function makeContext(overrides: Partial<DiseaseDetailContext> = {}): DiseaseDetailContext {
  return {
    diseaseName: 'Alzheimer\'s Disease',
    description: 'A neurodegenerative disease',
    therapeuticAreas: ['neurology', 'psychiatry'],
    genes: [
      { geneSymbol: 'APOE', geneId: '1', source: 'DisGeNET', score: 0.95, entrezId: '348' },
      { geneSymbol: 'TREM2', geneId: '2', source: 'Open Targets', score: 0.82 },
      { geneSymbol: 'MAPT', geneId: '3', source: 'DisGeNET', score: 0.71, entrezId: '4137' },
    ],
    drugInterventions: [
      { name: 'Aducanumab', trialCount: 5 },
      { name: 'Lecanemab', trialCount: 3 },
    ],
    molecules: [
      { name: 'Donepezil', cid: 3152, sources: ['Open Targets'] },
      { name: 'Memantine', cid: 4553, sources: ['DisGeNET'] },
    ],
    trialSummary: { total: 42, recruiting: 8, phases: { 'Phase 3': 10, 'Phase 2': 15, 'Phase 1': 8 } },
    ...overrides,
  }
}

const emptyContext: DiseaseDetailContext = {
  diseaseName: 'Unknown Disease',
  therapeuticAreas: [],
  genes: [],
  drugInterventions: [],
  molecules: [],
  trialSummary: { total: 0, recruiting: 0, phases: {} },
}

describe('diseasePrompts', () => {
  describe('prompt builders — basic structure', () => {
    it('buildDiseaseQuickSummaryPrompt returns system + user', () => {
      const result = buildDiseaseQuickSummaryPrompt(makeContext())
      expect(result.system).toBeTruthy()
      expect(result.user).toBeTruthy()
      expect(result.system).toContain('BioIntel Copilot')
    })

    it('buildDiseaseRepurposingPrompt returns system + user', () => {
      const result = buildDiseaseRepurposingPrompt(makeContext())
      expect(result.system).toBeTruthy()
      expect(result.user).toBeTruthy()
    })

    it('buildDiseaseTherapeuticGapPrompt returns system + user', () => {
      const result = buildDiseaseTherapeuticGapPrompt(makeContext())
      expect(result.system).toBeTruthy()
      expect(result.user).toBeTruthy()
    })

    it('buildDiseaseConnectionMapPrompt returns system + user', () => {
      const result = buildDiseaseConnectionMapPrompt(makeContext())
      expect(result.system).toBeTruthy()
      expect(result.user).toBeTruthy()
    })
  })

  describe('data tables in prompts', () => {
    it('includes gene symbols in user message', () => {
      const result = buildDiseaseQuickSummaryPrompt(makeContext())
      expect(result.user).toContain('APOE')
      expect(result.user).toContain('TREM2')
      expect(result.user).toContain('MAPT')
    })

    it('includes gene scores in user message', () => {
      const result = buildDiseaseQuickSummaryPrompt(makeContext())
      expect(result.user).toContain('0.95')
      expect(result.user).toContain('0.82')
    })

    it('includes drug names and trial counts in user message', () => {
      const result = buildDiseaseRepurposingPrompt(makeContext())
      expect(result.user).toContain('Aducanumab')
      expect(result.user).toContain('5 trial')
      expect(result.user).toContain('Lecanemab')
    })

    it('includes molecule names and CIDs in user message', () => {
      const result = buildDiseaseConnectionMapPrompt(makeContext())
      expect(result.user).toContain('Donepezil')
      expect(result.user).toContain('CID 3152')
    })

    it('includes trial summary in user message', () => {
      const result = buildDiseaseQuickSummaryPrompt(makeContext())
      expect(result.user).toContain('42 total')
      expect(result.user).toContain('8 recruiting')
      expect(result.user).toContain('Phase 3=10')
    })

    it('includes disease name in user message', () => {
      const result = buildDiseaseQuickSummaryPrompt(makeContext())
      expect(result.user).toContain("Alzheimer's Disease")
    })

    it('includes therapeutic areas in user message', () => {
      const result = buildDiseaseQuickSummaryPrompt(makeContext())
      expect(result.user).toContain('neurology')
    })
  })

  describe('empty array handling', () => {
    it('quick summary works with all empty arrays', () => {
      const result = buildDiseaseQuickSummaryPrompt(emptyContext)
      expect(result.system).toBeTruthy()
      expect(result.user).toBeTruthy()
      expect(result.user).toContain('(none found)')
    })

    it('repurposing works with no drugs', () => {
      const ctx = makeContext({ drugInterventions: [] })
      const result = buildDiseaseRepurposingPrompt(ctx)
      expect(result.user).toContain('wide open')
    })

    it('repurposing works with no genes', () => {
      const ctx = makeContext({ genes: [] })
      const result = buildDiseaseRepurposingPrompt(ctx)
      expect(result.user).toContain('No gene associations')
    })

    it('therapeutic gap works with no genes', () => {
      const result = buildDiseaseTherapeuticGapPrompt(emptyContext)
      expect(result.user).toContain('No gene associations available')
    })

    it('therapeutic gap works when all genes have drugs', () => {
      const ctx = makeContext({
        genes: [{ geneSymbol: 'DRUG1', geneId: '1', source: 'Test', score: 0.5 }],
        drugInterventions: [{ name: 'DRUG1', trialCount: 2 }],
        molecules: [],
      })
      const result = buildDiseaseTherapeuticGapPrompt(ctx)
      expect(result.user).toContain('DIRECT')
    })

    it('connection map works with no genes', () => {
      const result = buildDiseaseConnectionMapPrompt(makeContext({ genes: [] }))
      expect(result.user).toContain('No gene associations')
    })

    it('connection map works with no drugs or molecules', () => {
      const result = buildDiseaseConnectionMapPrompt(makeContext({ drugInterventions: [], molecules: [] }))
      expect(result.user).toContain('No drugs or molecules')
    })
  })

  describe('noDataNote in quick summary', () => {
    it('includes noDataNote when all arrays are empty', () => {
      const result = buildDiseaseQuickSummaryPrompt(emptyContext)
      expect(result.user).toContain('no gene associations, trial drugs, or related molecules')
    })

    it('does not include noDataNote when data exists', () => {
      const result = buildDiseaseQuickSummaryPrompt(makeContext())
      expect(result.user).not.toContain('no gene associations, trial drugs, or related molecules')
    })
  })

  describe('data budgeting', () => {
    it('limits genes to 20 in prompt text', () => {
      const manyGenes: GeneAssociation[] = Array.from({ length: 50 }, (_, i) => ({
        geneSymbol: `GENE${i}`,
        geneId: String(i),
        source: 'Test',
        score: 1 - i * 0.01,
      }))
      const ctx = makeContext({ genes: manyGenes })
      const result = buildDiseaseQuickSummaryPrompt(ctx)
      expect(result.user).toContain('50 total')
      expect(result.user).toContain('30 more lower-confidence')
      for (let i = 0; i < 20; i++) {
        expect(result.user).toContain(`GENE${i}`)
      }
      expect(result.user).not.toContain('GENE20')
    })

    it('limits drugs to 15 in prompt text', () => {
      const manyDrugs = Array.from({ length: 30 }, (_, i) => ({
        name: `Drug${i}`,
        trialCount: 30 - i,
      }))
      const ctx = makeContext({ drugInterventions: manyDrugs })
      const result = buildDiseaseQuickSummaryPrompt(ctx)
      expect(result.user).toContain('30 total')
      expect(result.user).toContain('15 more drugs')
    })

    it('limits molecules to 15 in prompt text', () => {
      const manyMolecules = Array.from({ length: 25 }, (_, i) => ({
        name: `Mol${i}`,
        cid: i as number | null,
        sources: ['Test'],
      }))
      const ctx = makeContext({ molecules: manyMolecules })
      const result = buildDiseaseQuickSummaryPrompt(ctx)
      expect(result.user).toContain('25 total')
      expect(result.user).toContain('10 more candidate molecules')
    })
  })
})

describe('findGenesWithoutDrugs', () => {
  it('returns genes that have no matching drug or molecule', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'APOE', geneId: '1', source: 'Test', score: 0.95 },
      { geneSymbol: 'TREM2', geneId: '2', source: 'Test', score: 0.82 },
      { geneSymbol: 'MAPT', geneId: '3', source: 'Test', score: 0.71 },
    ]
    const drugs = [{ name: 'APOE inhibitor', trialCount: 1 }]
    const molecules: { name: string; cid: number | null; sources: string[] }[] = []
    const result = findGenesWithoutDrugs(genes, drugs, molecules)
    expect(result.map(g => g.geneSymbol)).toEqual(['TREM2', 'MAPT'])
  })

  it('uses word-boundary matching — does not match substrings', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'APOE', geneId: '1', source: 'Test', score: 0.95 },
      { geneSymbol: 'MAPT', geneId: '2', source: 'Test', score: 0.7 },
    ]
    const drugs = [
      { name: 'TAPOE-mab', trialCount: 1 },
      { name: 'CAPoenzyme', trialCount: 2 },
    ]
    const molecules: { name: string; cid: number | null; sources: string[] }[] = []
    const result = findGenesWithoutDrugs(genes, drugs, molecules)
    expect(result.map(g => g.geneSymbol)).toEqual(['APOE', 'MAPT'])
  })

  it('matches when gene symbol appears as a whole word', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'APOE', geneId: '1', source: 'Test', score: 0.95 },
      { geneSymbol: 'MAPT', geneId: '2', source: 'Test', score: 0.7 },
    ]
    const drugs = [{ name: 'APOE-targeting antibody', trialCount: 1 }]
    const molecules: { name: string; cid: number | null; sources: string[] }[] = []
    const result = findGenesWithoutDrugs(genes, drugs, molecules)
    expect(result.map(g => g.geneSymbol)).toEqual(['MAPT'])
  })

  it('matches case-insensitively', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'APOE', geneId: '1', source: 'Test', score: 0.95 },
    ]
    const drugs = [{ name: 'apoe inhibitor', trialCount: 1 }]
    const molecules: { name: string; cid: number | null; sources: string[] }[] = []
    const result = findGenesWithoutDrugs(genes, drugs, molecules)
    expect(result).toHaveLength(0)
  })

  it('checks molecules as well as drugs', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'APOE', geneId: '1', source: 'Test', score: 0.95 },
      { geneSymbol: 'BRCA1', geneId: '2', source: 'Test', score: 0.8 },
    ]
    const drugs: { name: string; trialCount: number }[] = []
    const molecules = [{ name: 'APOE protein', cid: null, sources: ['Test'] }]
    const result = findGenesWithoutDrugs(genes, drugs, molecules)
    expect(result.map(g => g.geneSymbol)).toEqual(['BRCA1'])
  })

  it('returns all genes when no drugs or molecules exist', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'APOE', geneId: '1', source: 'Test', score: 0.95 },
      { geneSymbol: 'MAPT', geneId: '2', source: 'Test', score: 0.7 },
    ]
    const result = findGenesWithoutDrugs(genes, [], [])
    expect(result).toHaveLength(2)
  })

  it('returns empty array when all genes have matches', () => {
    const genes: GeneAssociation[] = [
      { geneSymbol: 'APOE', geneId: '1', source: 'Test', score: 0.95 },
    ]
    const drugs = [{ name: 'APOE', trialCount: 1 }]
    const molecules: { name: string; cid: number | null; sources: string[] }[] = []
    const result = findGenesWithoutDrugs(genes, drugs, molecules)
    expect(result).toHaveLength(0)
  })
})