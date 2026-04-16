import { buildAutoInsightPrompt, buildSafetyDeepDivePrompt, buildMechanismAnalysisPrompt, buildRepurposingScanPrompt } from '@/lib/ai/promptTemplates'
import { buildMoleculeContext, contextToPromptBlock } from '@/lib/ai/contextBuilder'
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
    gaps: [{ categoryId: 'genomics-disease', panelKey: 'geneInfo', reason: 'empty' as const }],
    anomalies: [],
    timestamp: new Date().toISOString(),
  }
}

function makeCategoryData(data: Record<string, unknown> = {}): Partial<Record<string, Record<string, unknown>>> {
  return { pharmaceutical: data }
}

function makeContext(data: Record<string, unknown> = {}): MoleculeContext {
  return buildMoleculeContext(makeCategoryData(data), identity, data, makeSnapshot())
}

describe('buildAutoInsightPrompt', () => {
  it('returns system and user prompts', () => {
    const ctx = makeContext()
    const result = buildAutoInsightPrompt(ctx, makeSnapshot())
    expect(result.system).toBeTruthy()
    expect(result.user).toBeTruthy()
    expect(result.system).toContain('BioIntel')
  })

  it('includes molecule name in user prompt', () => {
    const ctx = makeContext()
    const result = buildAutoInsightPrompt(ctx, makeSnapshot())
    expect(result.user).toContain('Aspirin')
  })

  it('includes gap information when gaps exist', () => {
    const ctx = makeContext()
    const result = buildAutoInsightPrompt(ctx, makeSnapshot())
    expect(result.user).toContain('Data gaps')
  })

  it('detects boxed warning signal', () => {
    const data = {
      drugLabels: [{ text: 'WARNING: BOXED WARNING serious risk' }],
    }
    const ctx = makeContext(data)
    const result = buildAutoInsightPrompt(ctx, makeSnapshot())
    expect(result.user).toContain('BOXED WARNING')
  })

  it('detects high trial count as signal', () => {
    const trials = Array.from({ length: 55 }, (_, i) => ({
      nctId: `NCT${i}`, phase: 'Phase 3', status: 'Completed', conditions: ['Pain'], sponsor: 'S',
    }))
    const data = { clinicalTrials: trials }
    const ctx = makeContext(data)
    const result = buildAutoInsightPrompt(ctx, makeSnapshot())
    expect(result.user).toContain('55 clinical trials')
  })

  it('detects Lipinski failure signal', () => {
    const data = {
      computedProperties: [
        { label: 'XLogP3', value: 6 },
        { label: 'Hydrogen Bond Donor', value: 3 },
        { label: 'Hydrogen Bond Acceptor', value: 12 },
      ],
    }
    const ctx = makeContext(data)
    const result = buildAutoInsightPrompt(ctx, makeSnapshot())
    expect(result.user).toContain('Lipinski')
  })

  it('detects AE-mechanism link for kinase inhibitor with rash', () => {
    const data = {
      adverseEvents: [{ reactionName: 'Rash', count: 100, serious: 5, outcome: 'Ongoing' }],
      chemblMechanisms: [{ mechanismOfAction: 'Tyrosine kinase inhibitor', actionType: 'INHIBITOR', targetName: 'EGFR', directInteraction: true, diseaseEfficacy: true, maxPhase: 4 }],
    }
    const ctx = makeContext(data)
    const result = buildAutoInsightPrompt(ctx, makeSnapshot())
    expect(result.user.toLowerCase()).toContain('mechanism-related')
  })

  it('detects AE-mechanism link for statin with myalgia', () => {
    const data = {
      adverseEvents: [{ reactionName: 'Myalgia', count: 500, serious: 0, outcome: 'Recovered' }],
      chemblMechanisms: [{ mechanismOfAction: 'HMG-CoA reductase inhibitor', actionType: 'INHIBITOR', targetName: 'HMGCR', directInteraction: true, diseaseEfficacy: true, maxPhase: 4 }],
    }
    const ctx = makeContext(data)
    const result = buildAutoInsightPrompt(ctx, makeSnapshot())
    expect(result.user.toLowerCase()).toContain('mechanism-related')
  })
})

describe('buildSafetyDeepDivePrompt', () => {
  it('includes specific AE names in prompt', () => {
    const data = {
      adverseEvents: [
        { reactionName: 'Gastrointestinal bleeding', count: 200, serious: 50, outcome: 'Fatal' },
        { reactionName: 'Nausea', count: 100, serious: 5, outcome: 'Recovered' },
      ],
    }
    const ctx = makeContext(data)
    const result = buildSafetyDeepDivePrompt(ctx)
    expect(result.user).toContain('Gastrointestinal bleeding')
    expect(result.user).toContain('Nausea')
  })

  it('includes recall details', () => {
    const data = {
      drugRecalls: [{ recallNumber: 'R-2024-001', reason: 'Contamination', classification: 'Class I', recallingFirm: 'PharmaCo', recallDate: '2024-01-01' }],
    }
    const ctx = makeContext(data)
    const result = buildSafetyDeepDivePrompt(ctx)
    expect(result.user).toContain('Contamination')
    expect(result.user).toContain('PharmaCo')
  })

  it('includes pharmacogenomic genes', () => {
    const data = {
      pharmgkbDrugs: [{ genes: [{ geneSymbol: 'CYP2C9', geneId: '1', interactionType: 'metabolizer', level: '1A' }] }],
    }
    const ctx = makeContext(data)
    const result = buildSafetyDeepDivePrompt(ctx)
    expect(result.user).toContain('CYP2C9')
  })

  it('asks for AE-MoA connection', () => {
    const ctx = makeContext()
    const result = buildSafetyDeepDivePrompt(ctx)
    expect(result.user).toContain('mechanism')
  })
})

describe('buildMechanismAnalysisPrompt', () => {
  it('includes target bioactivity data with pChEMBL values', () => {
    const data = {
      chemblActivities: [
        { targetName: 'COX-1', targetOrganism: 'Homo sapiens', assayType: 'B', standardType: 'IC50', standardValue: 5, standardUnits: 'nM', pchemblValue: 8.3 },
      ],
    }
    const ctx = makeContext(data)
    const result = buildMechanismAnalysisPrompt(ctx)
    expect(result.user).toContain('COX-1')
    expect(result.user).toContain('pChEMBL')
  })

  it('renders unknown maxPhase correctly', () => {
    const data = {
      chemblMechanisms: [
        { mechanismOfAction: 'Test inhibitor', actionType: 'INHIBITOR', targetName: 'X', directInteraction: true, diseaseEfficacy: true },
      ],
    }
    const ctx = makeContext(data)
    const result = buildMechanismAnalysisPrompt(ctx)
    expect(result.user).toContain('unknown')
    expect(result.user).not.toContain('max phase -1')
  })
})

describe('buildRepurposingScanPrompt', () => {
  it('includes disease associations and targets', () => {
    const data = {
      disgenetAssociations: [{ diseaseName: 'Alzheimer', score: 0.85, source: 'DISGENET', geneSymbol: 'APOE', pmids: ['1', '2'] }],
      chemblActivities: [
        { targetName: 'COX-2', targetOrganism: 'Homo sapiens', assayType: 'B', standardType: 'IC50', standardValue: 10, standardUnits: 'nM', pchemblValue: 8 },
      ],
    }
    const ctx = makeContext(data)
    const result = buildRepurposingScanPrompt(ctx)
    expect(result.user).toContain('Alzheimer')
    expect(result.user).toContain('COX-2')
  })

  it('includes orphan diseases', () => {
    const data = {
      orphanetDiseases: [{ diseaseName: 'Familial Mediterranean Fever' }],
    }
    const ctx = makeContext(data)
    const result = buildRepurposingScanPrompt(ctx)
    expect(result.user).toContain('Familial Mediterranean Fever')
  })
})