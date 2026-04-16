import { buildMoleculeContext, contextToPromptBlock, extractRichData, DEFAULT_MAX_CONTEXT_CHARS } from '@/lib/ai/contextBuilder'
import type { MoleculeContext } from '@/lib/ai/contextBuilder'
import type { RetrievalSnapshot } from '@/lib/ai/retrievalMonitor'

const identity = { name: 'Aspirin', cid: 2244, molecularWeight: 180.16, inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N', iupacName: '2-acetoxybenzoic acid' }

function makeSnapshot(): RetrievalSnapshot {
  return {
    categories: {} as RetrievalSnapshot['categories'],
    overallCompleteness: 0.5,
    totalApisCalled: 50,
    totalApisSucceeded: 25,
    totalApisErrored: 2,
    totalApisEmpty: 23,
    totalDurationMs: 0,
    slowestApi: null,
    gaps: [],
    anomalies: [],
    timestamp: new Date().toISOString(),
  }
}

function makeCategoryData(data: Record<string, unknown> = {}): Partial<Record<string, Record<string, unknown>>> {
  return { pharmaceutical: data }
}

describe('extractRichData', () => {
  it('returns empty arrays for empty input', () => {
    const result = extractRichData({})
    expect(result.topAdverseEvents).toEqual([])
    expect(result.recallDetails).toEqual([])
    expect(result.topTargetActivities).toEqual([])
    expect(result.mechanismDetails).toEqual([])
    expect(result.trialDetails).toEqual([])
  })

  it('extracts and aggregates adverse events by reaction name', () => {
    const data = {
      adverseEvents: [
        { reactionName: 'Nausea', count: 5, serious: 1, outcome: 'Recovered' },
        { reactionName: 'Nausea', count: 10, serious: 2, outcome: 'Fatal' },
        { reactionName: 'Headache', count: 3, serious: 0, outcome: 'Recovering' },
      ],
    }
    const result = extractRichData(data)
    expect(result.topAdverseEvents).toHaveLength(2)
    const nausea = result.topAdverseEvents.find((ae: { reactionName: string }) => ae.reactionName === 'Nausea')
    expect(nausea).toBeDefined()
    expect(nausea!.count).toBe(15)
    expect(nausea!.serious).toBe(3)
    expect(nausea!.outcome).toBe('Fatal')
  })

  it('preserves outcome from highest-count AE entry', () => {
    const data = {
      adverseEvents: [
        { reactionName: 'Rash', count: 2, serious: 0, outcome: 'Recovering' },
        { reactionName: 'Rash', count: 20, serious: 1, outcome: 'Not Recovered' },
        { reactionName: 'Rash', count: 1, serious: 0, outcome: 'Recovered' },
      ],
    }
    const result = extractRichData(data)
    const rash = result.topAdverseEvents[0]
    expect(rash.outcome).toBe('Not Recovered')
  })

  it('sorts target activities by pChEMBL descending (most potent first)', () => {
    const data = {
      chemblActivities: [
        { targetName: 'COX-2', targetOrganism: 'Homo sapiens', assayType: 'B', standardType: 'IC50', standardValue: 1, standardUnits: 'nM', pchemblValue: 9 },
        { targetName: 'COX-1', targetOrganism: 'Homo sapiens', assayType: 'B', standardType: 'IC50', standardValue: 10, standardUnits: 'nM', pchemblValue: 8 },
        { targetName: 'COX-3', targetOrganism: 'Homo sapiens', assayType: 'B', standardType: 'IC50', standardValue: 100, standardUnits: 'nM', pchemblValue: 7 },
      ],
    }
    const result = extractRichData(data)
    expect(result.topTargetActivities[0].targetName).toBe('COX-2')
    expect(result.topTargetActivities[1].targetName).toBe('COX-1')
    expect(result.topTargetActivities[2].targetName).toBe('COX-3')
  })

  it('preserves pchemblValue of 0 instead of coercing to null', () => {
    const data = {
      chemblActivities: [
        { targetName: 'Target A', targetOrganism: 'Homo sapiens', assayType: 'B', standardType: 'IC50', standardValue: 500, standardUnits: 'nM', pchemblValue: 0 },
      ],
    }
    const result = extractRichData(data)
    expect(result.topTargetActivities[0].pchemblValue).toBe(0)
  })

  it('returns null pchemblValue when missing', () => {
    const data = {
      chemblActivities: [
        { targetName: 'Target B', targetOrganism: 'Homo sapiens', assayType: 'B', standardType: 'IC50', standardValue: 500, standardUnits: 'nM' },
      ],
    }
    const result = extractRichData(data)
    expect(result.topTargetActivities[0].pchemblValue).toBeNull()
  })

  it('filters out non-finite standardValue entries', () => {
    const data = {
      chemblActivities: [
        { targetName: 'Good', targetOrganism: 'Homo sapiens', assayType: 'B', standardType: 'IC50', standardValue: 10, standardUnits: 'nM', pchemblValue: 8 },
        { targetName: 'Infinity', targetOrganism: 'Homo sapiens', assayType: 'B', standardType: 'IC50', standardValue: Infinity, standardUnits: 'nM', pchemblValue: 1 },
        { targetName: 'NaN', targetOrganism: 'Homo sapiens', assayType: 'B', standardType: 'IC50', standardValue: NaN, standardUnits: 'nM', pchemblValue: 1 },
      ],
    }
    const result = extractRichData(data)
    expect(result.topTargetActivities).toHaveLength(1)
    expect(result.topTargetActivities[0].targetName).toBe('Good')
  })

  it('sets maxPhase to -1 when missing from mechanism data', () => {
    const data = {
      chemblMechanisms: [
        { mechanismOfAction: 'Cyclooxygenase inhibitor', actionType: 'INHIBITOR', targetName: 'COX-1', directInteraction: true, diseaseEfficacy: true },
      ],
    }
    const result = extractRichData(data)
    expect(result.mechanismDetails[0].maxPhase).toBe(-1)
  })

  it('sets maxPhase to actual value when present', () => {
    const data = {
      chemblMechanisms: [
        { mechanismOfAction: 'Cyclooxygenase inhibitor', actionType: 'INHIBITOR', targetName: 'COX-1', directInteraction: true, diseaseEfficacy: true, maxPhase: 4 },
      ],
    }
    const result = extractRichData(data)
    expect(result.mechanismDetails[0].maxPhase).toBe(4)
  })

  it('handles malformed arrays gracefully', () => {
    const data = {
      adverseEvents: 'not-an-array',
      chemblActivities: null,
      clinicalTrials: 42,
    }
    const result = extractRichData(data)
    expect(result.topAdverseEvents).toEqual([])
    expect(result.topTargetActivities).toEqual([])
    expect(result.trialDetails).toEqual([])
  })

  it('extracts pharmacogenomic genes from pharmgkbDrugs', () => {
    const data = {
      pharmgkbDrugs: [
        { genes: [{ geneSymbol: 'CYP2D6', geneId: '1', interactionType: 'metabolizer', level: '1A' }] },
      ],
    }
    const result = extractRichData(data)
    expect(result.pharmacogenomicGenes).toContain('CYP2D6')
  })

  it('deduplicates pharmacogenomic genes across pharmgkb and cpic', () => {
    const data = {
      pharmgkbDrugs: [
        { genes: [{ geneSymbol: 'CYP2D6', geneId: '1', interactionType: 'metabolizer', level: '1A' }] },
      ],
      cpicGuidelines: [
        { gene: 'CYP2D6', name: 'Guideline', source: 'CPIC', drugs: [], recommendations: [] },
      ],
    }
    const result = extractRichData(data)
    const count = result.pharmacogenomicGenes.filter((g: string) => g === 'CYP2D6').length
    expect(count).toBe(1)
  })

  it('extracts sider side effects and deduplicates', () => {
    const data = {
      siderSideEffects: [
        { sideEffectName: 'Nausea', drugName: 'X' },
        { sideEffectName: 'Headache', drugName: 'X' },
        { sideEffectName: 'Nausea', drugName: 'X' },
      ],
    }
    const result = extractRichData(data)
    expect(result.siderSideEffects).toContain('Nausea')
    expect(result.siderSideEffects).toContain('Headache')
    const nauseaCount = result.siderSideEffects.filter((s: string) => s === 'Nausea').length
    expect(nauseaCount).toBe(1)
  })
})

describe('buildMoleculeContext', () => {
  it('does not fabricate gene count when geneInfo is empty', () => {
    const data = { disgenetAssociations: [{ diseaseName: 'Test', score: 0.8 }] }
    const ctx = buildMoleculeContext(makeCategoryData(data), identity, data, makeSnapshot())
    expect(ctx.genomic.associatedGeneCount).toBe(0)
  })

  it('counts genes only from geneInfo', () => {
    const data = {
      geneInfo: [
        { symbol: 'BRCA1', name: 'BRCA1' },
        { symbol: 'TP53', name: 'TP53' },
      ],
      disgenetAssociations: [{}, {}, {}],
    }
    const ctx = buildMoleculeContext(makeCategoryData(data), identity, data, makeSnapshot())
    expect(ctx.genomic.associatedGeneCount).toBe(2)
  })

  it('computes Lipinski pass/fail correctly', () => {
    const data = {
      computedProperties: [
        { label: 'XLogP3', value: 2 },
        { label: 'Hydrogen Bond Donor', value: 1 },
        { label: 'Hydrogen Bond Acceptor', value: 4 },
      ],
    }
    const ctx = buildMoleculeContext(makeCategoryData(data), identity, data, makeSnapshot())
    expect(ctx.chemical.followsLipinski).toBe(true)
  })

  it('computes Lipinski fail', () => {
    const data = {
      computedProperties: [
        { label: 'XLogP3', value: 6 },
        { label: 'Hydrogen Bond Donor', value: 3 },
        { label: 'Hydrogen Bond Acceptor', value: 12 },
      ],
    }
    const ctx = buildMoleculeContext(makeCategoryData(data), identity, data, makeSnapshot())
    expect(ctx.chemical.followsLipinski).toBe(false)
  })

  it('returns null Lipinski when properties are missing', () => {
    const data = {}
    const ctx = buildMoleculeContext(makeCategoryData(data), identity, data, makeSnapshot())
    expect(ctx.chemical.followsLipinski).toBeNull()
  })

  it('computes overall risk as high when recalls exist', () => {
    const data = { drugRecalls: [{ recallNumber: 'R1', reason: 'test' }] }
    const ctx = buildMoleculeContext(makeCategoryData(data), identity, data, makeSnapshot())
    expect(ctx.safety.overallRisk).toBe('high')
  })

  it('computes overall risk as moderate when >50 AEs and >5 drug interactions', () => {
    const adverseEvents = Array.from({ length: 60 }, (_, i) => ({ reactionName: `AE${i}`, count: 1, serious: 0 }))
    const drugInteractions = Array.from({ length: 7 }, (_, i) => ({ drugName: `Drug${i}` }))
    const data = { adverseEvents, drugInteractions }
    const ctx = buildMoleculeContext(makeCategoryData(data), identity, data, makeSnapshot())
    expect(ctx.safety.overallRisk).toBe('moderate')
  })
})

describe('contextToPromptBlock', () => {
  it('includes molecule name and CID', () => {
    const ctx = buildMoleculeContext(makeCategoryData({}), identity, {}, makeSnapshot())
    const block = contextToPromptBlock(ctx)
    expect(block).toContain('Aspirin')
    expect(block).toContain('2244')
  })

  it('respects maxChars truncation', () => {
    const adverseEvents = Array.from({ length: 500 }, (_, i) => ({
      reactionName: `VeryLongAdverseEventNameThatGoesOnAndOn${i}`, count: 1, serious: 0,
    }))
    const data = { adverseEvents }
    const ctx = buildMoleculeContext(makeCategoryData(data), identity, data, makeSnapshot())
    const block = contextToPromptBlock(ctx, 200)
    expect(block.length).toBeLessThanOrEqual(600)
    expect(block).toContain('truncated')
  })

  it('renders maxPhase unknown as "?" in prompt', () => {
    const data = {
      chemblMechanisms: [
        { mechanismOfAction: 'Test MoA', actionType: 'INHIBITOR', targetName: 'Target1', directInteraction: true, diseaseEfficacy: true },
      ],
    }
    const ctx = buildMoleculeContext(makeCategoryData(data), identity, data, makeSnapshot())
    const block = contextToPromptBlock(ctx)
    expect(block).toContain('phase ?')
    expect(block).not.toContain('max phase -1')
  })

  it('no truncation when under limit', () => {
    const ctx = buildMoleculeContext(makeCategoryData({}), identity, {}, makeSnapshot())
    const block = contextToPromptBlock(ctx, DEFAULT_MAX_CONTEXT_CHARS)
    expect(block).not.toContain('truncated')
  })
})