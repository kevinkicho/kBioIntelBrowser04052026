import type { CategoryId } from '../categoryConfig'
import type { CategoryLoadState } from '../fetchCategory'

export interface PanelRetrievalStatus {
  panelKey: string
  status: 'pending' | 'fetching' | 'success' | 'empty' | 'error' | 'timeout'
  durationMs?: number
  itemCount?: number
  error?: string
}

export interface CategoryRetrievalHealth {
  categoryId: CategoryId
  loadState: CategoryLoadState
  panels: PanelRetrievalStatus[]
  totalPanels: number
  successPanels: number
  emptyPanels: number
  errorPanels: number
  pendingPanels: number
  totalDurationMs: number
  avgDurationMs: number
  completeness: number
  fetchStartedAt?: Date
  fetchCompletedAt?: Date
}

export interface RetrievalSnapshot {
  categories: Record<CategoryId, CategoryRetrievalHealth>
  overallCompleteness: number
  totalApisCalled: number
  totalApisSucceeded: number
  totalApisErrored: number
  totalApisEmpty: number
  totalDurationMs: number
  slowestApi: string | null
  gaps: RetrievalGap[]
  anomalies: RetrievalAnomaly[]
  timestamp: string
}

export interface RetrievalGap {
  categoryId: CategoryId
  panelKey: string
  reason: 'error' | 'timeout' | 'empty' | 'pending'
  detail?: string
}

export interface RetrievalAnomaly {
  type: 'unexpected_empty' | 'slow_fetch' | 'high_error_rate' | 'data_mismatch' | 'unusual_count'
  severity: 'info' | 'warning' | 'critical'
  panelKey: string
  message: string
}

const KNOWN_PANEL_KEYS: Record<string, string[]> = {
  pharmaceutical: ['companies', 'ndcProducts', 'orangeBookEntries', 'drugLabels', 'drugInteractions', 'nadacPrices', 'atcClasses', 'drugCentral', 'gsrsSubstances', 'pharmgkb', 'cpicGuidelines'],
  'clinical-safety': ['clinicalTrials', 'isrctnTrials', 'adverseEvents', 'drugRecalls', 'chemblIndications', 'clinVarVariants', 'gwasAssociations', 'toxCastAssays', 'siderEffects', 'irisAssessments', 'drugShortages'],
  'molecular-chemical': ['computedProperties', 'ghsHazards', 'chebiAnnotations', 'compToxData', 'synthesisRoutes', 'metabolomicsWorkbench', 'myChemAnnotations', 'hmdbMetabolites', 'massBankSpectra', 'chemSpiderCompounds', 'metaboLightsStudies', 'gnpsSpectra', 'lipidMapsLipids', 'uniChemMappings', 'foodbCompounds'],
  'bioactivity-targets': ['chemblActivities', 'bioAssays', 'chemblMechanisms', 'iupharLigands', 'bindingDbAssays', 'pharosTargets', 'dgiDbInteractions', 'openTargetsAssociations', 'ctdInteractions', 'iedbEpitopes', 'lincsSignatures', 'ttdTargets'],
  'protein-structure': ['uniprotEntries', 'uniprotExtended', 'interProDomains', 'ebiProteins', 'proteinAtlas', 'humanProteinAtlas', 'quickGoTerms', 'pdbStructures', 'pdbeLigands', 'alphaFoldPredictions', 'peptideAtlasEntries', 'prideProjects', 'cathDomains', 'gene3DEntries', 'sabdabEntries'],
  'genomics-disease': ['geneInfo', 'ensemblGenes', 'expressionAtlas', 'gtexExpression', 'geoDatasets', 'dbSnpVariants', 'clinGenAssociations', 'medGenConcepts', 'monarchDiseases', 'nciThesaurus', 'meshTerms', 'goTerms', 'hpoTerms', 'olsTerms', 'disgenetAssociations', 'orphanetDiseases', 'myGeneAnnotations', 'bgeeExpression', 'omimEntries', 'bioModelsModels', 'bioSamples', 'massiveDatasets'],
  'interactions-pathways': ['stringInteractions', 'stitchInteractions', 'intactInteractions', 'reactomePathways', 'wikiPathways', 'pathwayCommons', 'bioCycPathways', 'smpdbPathways', 'ctdDiseases', 'keggPathways'],
  'nih-high-impact': ['cadsrConcepts', 'translatorAssociations', 'anvilDatasets', 'immportStudies', 'neurommsigSignatures'],
  'research-literature': ['nihGrants', 'patents', 'secFilings', 'literature', 'pubMedArticles', 'semanticPapers', 'openAlexWorks', 'openCitations', 'crossRefWorks', 'arxivPapers'],
}

function countItems(val: unknown): number {
  if (Array.isArray(val)) return val.length
  if (val && typeof val === 'object' && 'results' in (val as Record<string, unknown>)) {
    const results = (val as Record<string, unknown>).results
    return Array.isArray(results) ? results.length : 0
  }
  if (val === null || val === undefined) return 0
  return 1
}

export function buildRetrievalSnapshot(
  categoryData: Partial<Record<CategoryId, Record<string, unknown>>>,
  categoryStatus: Record<CategoryId, CategoryLoadState>,
  fetchedAt: Partial<Record<CategoryId, Date>>,
): RetrievalSnapshot {
  const categories: Record<CategoryId, CategoryRetrievalHealth> = {} as Record<CategoryId, CategoryRetrievalHealth>
  let totalApisCalled = 0
  let totalApisSucceeded = 0
  let totalApisErrored = 0
  let totalApisEmpty = 0
  const totalDurationMs = 0
  const slowestApi: string | null = null
  const slowestDuration = 0
  const gaps: RetrievalGap[] = []
  const anomalies: RetrievalAnomaly[] = []

  const allCategoryIds = Object.keys(KNOWN_PANEL_KEYS) as CategoryId[]

  for (const catId of allCategoryIds) {
    const loadState = categoryStatus[catId] || 'idle'
    const panelKeys = KNOWN_PANEL_KEYS[catId] || []
    const data = categoryData[catId] || {}
    const panels: PanelRetrievalStatus[] = []
    let successCount = 0
    let emptyCount = 0
    let errorCount = 0
    const catDuration = 0

    for (const key of panelKeys) {
      const val = data[key]
      const itemCount = countItems(val)
      let status: PanelRetrievalStatus['status']

      if (loadState === 'idle') {
        status = 'pending'
      } else if (loadState === 'loading') {
        status = val !== undefined ? 'success' : 'fetching'
      } else if (loadState === 'error') {
        status = 'error'
        errorCount++
        gaps.push({ categoryId: catId, panelKey: key, reason: 'error', detail: `${catId} category failed to load` })
      } else if (loadState === 'loaded') {
        if (val === undefined || val === null) {
          status = 'empty'
          emptyCount++
        } else if (itemCount === 0) {
          status = 'empty'
          emptyCount++
        } else {
          status = 'success'
          successCount++
        }
      } else {
        status = 'pending'
      }

      totalApisCalled++

      if (status === 'success') totalApisSucceeded++
      else if (status === 'error') totalApisErrored++
      else if (status === 'empty') totalApisEmpty++

      panels.push({
        panelKey: key,
        status,
        itemCount: status === 'success' || status === 'empty' ? itemCount : undefined,
      })
    }

    const completeness = panelKeys.length > 0 ? successCount / panelKeys.length : 0

    const fetchStartedAt = loadState === 'loading' || loadState === 'loaded' ? fetchedAt[catId] : undefined

    categories[catId] = {
      categoryId: catId,
      loadState,
      panels,
      totalPanels: panelKeys.length,
      successPanels: successCount,
      emptyPanels: emptyCount,
      errorPanels: errorCount,
      pendingPanels: loadState === 'idle' ? panelKeys.length : 0,
      totalDurationMs: catDuration,
      avgDurationMs: panelKeys.length > 0 ? catDuration / panelKeys.length : 0,
      completeness,
      fetchStartedAt,
    }
  }

  if (slowestApi) {
    anomalies.push({
      type: 'slow_fetch',
      severity: slowestDuration > 10000 ? 'critical' : slowestDuration > 5000 ? 'warning' : 'info',
      panelKey: slowestApi,
      message: `${slowestApi} took ${Math.round(slowestDuration / 1000)}s to respond`,
    })
  }

  for (const catId of allCategoryIds) {
    const cat = categories[catId]
    if (cat.loadState === 'loaded' && cat.successPanels === 0 && cat.emptyPanels === cat.totalPanels) {
      anomalies.push({
        type: 'unexpected_empty',
        severity: 'warning',
        panelKey: catId,
        message: `All ${cat.totalPanels} panels in ${catId} returned empty — this molecule may not have data in these sources`,
      })
    }
  }

  const loadedCats = allCategoryIds.filter(id => categoryStatus[id] === 'loaded').length
  const overallCompleteness = allCategoryIds.length > 0 ? loadedCats / allCategoryIds.length : 0

  return {
    categories,
    overallCompleteness,
    totalApisCalled,
    totalApisSucceeded,
    totalApisErrored,
    totalApisEmpty,
    totalDurationMs,
    slowestApi,
    gaps,
    anomalies,
    timestamp: new Date().toISOString(),
  }
}

export function formatRetrievalSummary(snapshot: RetrievalSnapshot): string {
  const lines: string[] = []
  lines.push(`Data Retrieval Status:`)
  lines.push(`- ${snapshot.totalApisSucceeded}/${snapshot.totalApisCalled} APIs returned data`)
  if (snapshot.totalApisErrored > 0) lines.push(`- ${snapshot.totalApisErrored} APIs failed`)
  if (snapshot.totalApisEmpty > 0) lines.push(`- ${snapshot.totalApisEmpty} APIs returned no data`)
  if (snapshot.gaps.length > 0) {
    lines.push(`Data Gaps:`)
    for (const gap of snapshot.gaps.slice(0, 10)) {
      lines.push(`- [${gap.categoryId}] ${gap.panelKey}: ${gap.reason}${gap.detail ? ` — ${gap.detail}` : ''}`)
    }
  }
  if (snapshot.anomalies.length > 0) {
    lines.push(`Anomalies:`)
    for (const a of snapshot.anomalies) {
      lines.push(`- [${a.severity}] ${a.message}`)
    }
  }
  return lines.join('\n')
}