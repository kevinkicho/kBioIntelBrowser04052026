import { buildCrossMoleculeComparePrompt, type SessionMoleculeSummary } from '@/lib/ai/promptTemplates'
import { buildMoleculeContext, extractRichData } from '@/lib/ai/contextBuilder'
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

function makeContext(data: Record<string, unknown> = {}): ReturnType<typeof buildMoleculeContext> {
  return buildMoleculeContext(makeCategoryData(data), identity, data, makeSnapshot())
}

const prevMolecules: SessionMoleculeSummary[] = [
  {
    name: 'Ibuprofen',
    searchedAt: '2025-01-01T00:00:00Z',
    topTargets: ['COX-1', 'COX-2'],
    topAEs: ['Nausea', 'Headache'],
    mechanisms: ['Cyclooxygenase inhibitor -> COX-2'],
    indications: ['Pain', 'Inflammation'],
  },
  {
    name: 'Acetaminophen',
    searchedAt: '2025-01-02T00:00:00Z',
    topTargets: ['Cyclooxygenase'],
    topAEs: ['Liver damage', 'Rash'],
    mechanisms: ['Cyclooxygenase inhibitor -> COX-3'],
    indications: ['Pain', 'Fever'],
  },
]

describe('buildCrossMoleculeComparePrompt', () => {
  it('includes current molecule data', () => {
    const data = {
      chemblMechanisms: [{ mechanismOfAction: 'Cyclooxygenase inhibitor', actionType: 'INHIBITOR', targetName: 'COX-1', directInteraction: true, diseaseEfficacy: true, maxPhase: 4 }],
      adverseEvents: [{ reactionName: 'Nausea', count: 100, serious: 10, outcome: 'Recovered' }],
      chemblActivities: [{ targetName: 'COX-1', targetOrganism: 'Homo sapiens', assayType: 'B', standardType: 'IC50', standardValue: 50, standardUnits: 'nM', pchemblValue: 7.3 }],
    }
    const ctx = makeContext(data)
    const result = buildCrossMoleculeComparePrompt(ctx, prevMolecules)
    expect(result.user).toContain('Aspirin')
    expect(result.user).toContain('Cyclooxygenase inhibitor')
    expect(result.system).toBeTruthy()
  })

  it('includes previous molecule names and data', () => {
    const ctx = makeContext()
    const result = buildCrossMoleculeComparePrompt(ctx, prevMolecules)
    expect(result.user).toContain('Ibuprofen')
    expect(result.user).toContain('Acetaminophen')
    expect(result.user).toContain('COX-1')
    expect(result.user).toContain('Liver damage')
  })

  it('includes comparison analysis headings', () => {
    const ctx = makeContext()
    const result = buildCrossMoleculeComparePrompt(ctx, prevMolecules)
    expect(result.user).toContain('MECHANISTIC OVERLAP')
    expect(result.user).toContain('SAFETY DIFFERENTIATION')
    expect(result.user).toContain('INDICATION COMPLEMENTARITY')
    expect(result.user).toContain('REPURPOSING CROSS-POLLINATION')
    expect(result.user).toContain('STRATEGIC RANKING')
  })

  it('handles empty previous molecules list', () => {
    const ctx = makeContext()
    const result = buildCrossMoleculeComparePrompt(ctx, [])
    expect(result.user).toContain('No other molecules viewed in this session')
  })

  it('handles empty current molecule data', () => {
    const ctx = makeContext({})
    const result = buildCrossMoleculeComparePrompt(ctx, prevMolecules)
    expect(result.user).toContain('Aspirin')
    expect(result.user).toContain('No known MoA')
  })
})