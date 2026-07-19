import {
  isCopilotTaskMode,
  resolveInsightPrompt,
} from '../copilot/resolveInsightPrompt'
import type { GeneContext, MoleculeContext } from '../copilot/context'
import type { RetrievalSnapshot } from '../retrievalMonitor'

function minimalCtx(): MoleculeContext {
  return {
    identity: { name: 'Aspirin', cid: 2244 },
    regulatory: {
      approvedProductCount: 1,
      ndcCount: 0,
      orangeBookEntries: 0,
      hasExpiredPatents: false,
      atcClasses: [],
      drugInteractionCount: 0,
      hasPharmacogenomics: false,
    },
    clinical: {
      totalTrials: 0,
      phaseBreakdown: {},
      recruitingTrials: 0,
      indications: [],
      hasPhase3Or4: false,
      trialSponsors: [],
    },
    safety: {
      adverseEventCount: 0,
      seriousEventCount: 0,
      recallCount: 0,
      hasBoxedWarning: false,
      knownInteractions: 0,
      ghsHazardCount: 0,
      overallRisk: 'unknown',
    },
    biological: {
      knownTargets: 0,
      mechanismsOfAction: [],
      pathwayCount: 0,
      bioactivityCount: 0,
      topTargets: [],
    },
    chemical: {
      hasComputedProperties: false,
      followsLipinski: null,
      hasSynthesisRoutes: false,
      chebiAnnotations: 0,
    },
    structural: {
      uniprotEntryCount: 0,
      pdbStructureCount: 0,
      hasAlphaFold: false,
      proteinDomains: 0,
      goAnnotationCount: 0,
    },
    genomic: {
      associatedGeneCount: 0,
      diseaseAssociations: 0,
      hasClinVarVariants: false,
      expressionDataAvailable: false,
      orphanDiseases: 0,
      omimEntries: 0,
    },
    research: {
      publicationCount: 0,
      patentCount: 0,
      nihGrantCount: 0,
      recentPublicationTrend: 'unknown',
      topResearchAreas: [],
    },
    interactions: {
      proteinInteractionCount: 0,
      pathwayCount: 0,
      hasKEGGData: false,
      hasReactomeData: false,
    },
    dataCompleteness: {
      loadedCategories: 1,
      totalCategories: 5,
      panelsWithData: 5,
      totalPanels: 20,
      gapList: [],
      anomalyList: [],
    },
    rich: {
      topAdverseEvents: [],
      recallDetails: [],
      topTargetActivities: [],
      mechanismDetails: [],
      trialDetails: [],
      diseaseAssociations: [],
      pathwayNames: [],
      proteinInteractions: [],
      drugInteractionDetails: [],
      patentDetails: [],
      indicationDetails: [],
      publicationDetails: [],
      chebiDetails: [],
      goTerms: [],
      proteinDetails: [],
      geneDetails: [],
      atcClasses: [],
      orphanDiseases: [],
      siderSideEffects: [],
      ghsHazardStatements: [],
      pharmacogenomicGenes: [],
    },
  }
}

function emptySnap(): RetrievalSnapshot {
  return {
    overallCompleteness: 0.2,
    categoryLoadRatio: 0.2,
    totalApisCalled: 1,
    totalApisSucceeded: 1,
    totalApisEmpty: 0,
    totalApisTimeout: 0,
    totalApisErrored: 0,
    totalApisPending: 0,
    totalDurationMs: 1,
    slowestApi: null,
    categories: {} as RetrievalSnapshot['categories'],
    anomalies: [],
    timestamp: new Date().toISOString(),
    gaps: [],
  }
}

function geneCtx(): GeneContext {
  return {
    symbol: 'TTR',
    name: 'transthyretin',
    summary: '',
    chromosome: '18',
    typeOfGene: 'protein-coding',
    aliases: [],
    ensemblId: '',
    uniprotId: '',
    targetedDrugs: [],
    diseaseAssociations: [],
    clinvarVariants: [],
    pathwayNames: [],
    goTerms: [],
    dataCompleteness: { panelsLoaded: 1, totalPanels: 3, gapList: [] },
  }
}

describe('resolveInsightPrompt', () => {
  it('isCopilotTaskMode detects plan-06 modes', () => {
    expect(isCopilotTaskMode('prior_art_query')).toBe(true)
    expect(isCopilotTaskMode('auto_insight')).toBe(false)
  })

  it('resolves molecule auto_insight with evidence system prompt', () => {
    const p = resolveInsightPrompt({
      mode: 'auto_insight',
      isDiseaseContext: false,
      isGeneContext: false,
      moleculeCtx: minimalCtx(),
      snapshot: emptySnap(),
    })
    expect(p.system).toMatch(/BioIntel Copilot|evidence/i)
    expect(p.user).toMatch(/Aspirin|2244|finding/i)
  })

  it('resolves disease mode from disease block', () => {
    const p = resolveInsightPrompt({
      mode: 'gap_analysis',
      isDiseaseContext: true,
      isGeneContext: false,
      diseaseContextBlock: 'Disease: ATTR\nSources: OpenTargets',
      moleculeCtx: minimalCtx(),
      snapshot: emptySnap(),
    })
    expect(p.user).toMatch(/ATTR|gap/i)
  })

  it('resolves gene therapeutic mode', () => {
    const p = resolveInsightPrompt({
      mode: 'gene_therapeutic',
      isDiseaseContext: false,
      isGeneContext: true,
      geneCtx: geneCtx(),
      moleculeCtx: minimalCtx(),
      snapshot: emptySnap(),
    })
    expect(p.user).toMatch(/TTR/i)
  })
})
