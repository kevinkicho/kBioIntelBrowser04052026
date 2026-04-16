import type { CategoryId } from '../categoryConfig'
import type { RetrievalSnapshot } from './retrievalMonitor'

export interface MoleculeContext {
  identity: IdentityContext
  regulatory: RegulatoryContext
  clinical: ClinicalContext
  safety: SafetyContext
  biological: BiologicalContext
  chemical: ChemicalContext
  structural: StructuralContext
  genomic: GenomicContext
  research: ResearchContext
  interactions: InteractionsContext
  dataCompleteness: DataCompletenessContext
  rich: RichDataContext
}

export interface IdentityContext {
  name: string
  cid: number
  formula?: string
  weight?: number
  inchiKey?: string
  iupacName?: string
  synonyms?: string[]
}

export interface RegulatoryContext {
  approvedProductCount: number
  ndcCount: number
  orangeBookEntries: number
  hasExpiredPatents: boolean
  atcClasses: string[]
  drugInteractionCount: number
  hasPharmacogenomics: boolean
}

export interface ClinicalContext {
  totalTrials: number
  phaseBreakdown: Record<string, number>
  recruitingTrials: number
  indications: string[]
  hasPhase3Or4: boolean
  trialSponsors: string[]
}

export interface SafetyContext {
  adverseEventCount: number
  seriousEventCount: number
  recallCount: number
  hasBoxedWarning: boolean
  knownInteractions: number
  ghsHazardCount: number
  overallRisk: 'low' | 'moderate' | 'high' | 'unknown'
}

export interface BiologicalContext {
  knownTargets: number
  mechanismsOfAction: string[]
  pathwayCount: number
  bioactivityCount: number
  topTargets: string[]
}

export interface ChemicalContext {
  hasComputedProperties: boolean
  molecularWeight?: number
  logP?: number
  hBondDonors?: number
  hBondAcceptors?: number
  rotatableBonds?: number
  followsLipinski: boolean | null
  hasSynthesisRoutes: boolean
  chebiAnnotations: number
}

export interface StructuralContext {
  uniprotEntryCount: number
  pdbStructureCount: number
  hasAlphaFold: boolean
  proteinDomains: number
  goAnnotationCount: number
}

export interface GenomicContext {
  associatedGeneCount: number
  diseaseAssociations: number
  hasClinVarVariants: boolean
  expressionDataAvailable: boolean
  orphanDiseases: number
  omimEntries: number
}

export interface ResearchContext {
  publicationCount: number
  patentCount: number
  nihGrantCount: number
  recentPublicationTrend: 'increasing' | 'stable' | 'declining' | 'unknown'
  topResearchAreas: string[]
}

export interface InteractionsContext {
  proteinInteractionCount: number
  pathwayCount: number
  hasKEGGData: boolean
  hasReactomeData: boolean
}

export interface DataCompletenessContext {
  loadedCategories: number
  totalCategories: number
  panelsWithData: number
  totalPanels: number
  gapList: string[]
  anomalyList: string[]
}

export interface TargetActivity {
  targetName: string
  targetOrganism: string
  assayType: string
  standardType: string
  standardValue: number
  standardUnits: string
  pchemblValue: number | null
}

export interface MechanismDetail {
  mechanismOfAction: string
  actionType: string
  targetName: string
  directInteraction: boolean
  diseaseEfficacy: boolean
  maxPhase: number
}

export interface AdverseEventDetail {
  reactionName: string
  count: number
  serious: number
  outcome: string
}

export interface RecallDetail {
  recallNumber: string
  reason: string
  classification: string
  recallingFirm: string
  recallDate: string
}

export interface TrialDetail {
  nctId: string
  title: string
  phase: string
  status: string
  conditions: string[]
  sponsor: string
  startDate: string
  completionDate: string
}

export interface DiseaseDetail {
  diseaseName: string
  score: number
  sources: string[]
  geneSymbol?: string
  evidenceCount?: number
}

export interface PathwayDetail {
  name: string
  source: string
  species?: string
}

export interface InteractionDetail {
  partnerA: string
  partnerB: string
  interactionType: string
  confidence?: number
  source: string
}

export interface ProteinDetail {
  accession: string
  proteinName: string
  geneName: string
  organism: string
  functionSummary?: string
  subcellularLocation?: string
}

export interface GeneDetail {
  symbol: string
  name: string
  summary?: string
  chromosome?: string
}

export interface DrugInteractionDetail {
  drugName: string
  description: string
  severity: string
}

export interface PatentDetail {
  patentNumber: string
  title: string
  assignee: string
  expirationDate: string
}

export interface IndicationDetail {
  condition: string
  maxPhase: number
  meshHeading: string
}

export interface PublicationDetail {
  title: string
  journal: string
  year: number
  doi?: string
  tldr?: string
}

export interface ChebiDetail {
  name: string
  definition: string
  roles: string[]
}

export interface GoTermDetail {
  goId: string
  goName: string
  goAspect: string
}

export interface RichDataContext {
  topAdverseEvents: AdverseEventDetail[]
  recallDetails: RecallDetail[]
  topTargetActivities: TargetActivity[]
  mechanismDetails: MechanismDetail[]
  trialDetails: TrialDetail[]
  diseaseAssociations: DiseaseDetail[]
  pathwayNames: PathwayDetail[]
  proteinInteractions: InteractionDetail[]
  drugInteractionDetails: DrugInteractionDetail[]
  patentDetails: PatentDetail[]
  indicationDetails: IndicationDetail[]
  publicationDetails: PublicationDetail[]
  chebiDetails: ChebiDetail[]
  goTerms: GoTermDetail[]
  proteinDetails: ProteinDetail[]
  geneDetails: GeneDetail[]
  atcClasses: string[]
  orphanDiseases: string[]
  siderSideEffects: string[]
  ghsHazardStatements: string[]
  pharmacogenomicGenes: string[]
}

function safeLen(val: unknown): number {
  return Array.isArray(val) ? val.length : 0
}

function safeArr(val: unknown): Record<string, unknown>[] {
  return Array.isArray(val) ? val : []
}

function safeStr(val: unknown): string {
  return typeof val === 'string' ? val : ''
}

function uniqStrings(arr: unknown[], key: string, limit: number = 10): string[] {
  const items = safeArr(arr)
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const v = safeStr((item as Record<string, unknown>)?.[key])
    if (v && !seen.has(v) && result.length < limit) {
      seen.add(v)
      result.push(v)
    }
  }
  return result
}

export function buildMoleculeContext(
  allCategoryData: Partial<Record<CategoryId, Record<string, unknown>>>,
  identity: { name: string; cid: number; molecularWeight?: number; inchiKey?: string; iupacName?: string },
  moleculeData: Record<string, unknown>,
  snapshot: RetrievalSnapshot,
): MoleculeContext {
  const d = moleculeData

  const adverseEvents = safeArr(d.adverseEvents)
  const seriousEvents = adverseEvents.reduce((sum, e) => sum + (Number(e?.serious) || 0), 0)
  const trials = safeArr(d.clinicalTrials)
  const phases: Record<string, number> = {}
  const sponsors = new Set<string>()
  for (const t of trials) {
    const phase = String(t?.phase ?? '').toLowerCase()
    if (phase.includes('4')) phases['Phase 4'] = (phases['Phase 4'] || 0) + 1
    else if (phase.includes('3')) phases['Phase 3'] = (phases['Phase 3'] || 0) + 1
    else if (phase.includes('2')) phases['Phase 2'] = (phases['Phase 2'] || 0) + 1
    else if (phase.includes('1')) phases['Phase 1'] = (phases['Phase 1'] || 0) + 1
    const sponsor = safeStr(t?.sponsor)
    if (sponsor && sponsors.size < 10) sponsors.add(sponsor)
  }
  const recruiting = trials.filter(t => String(t?.status ?? '').toLowerCase().includes('recruit')).length

  const rawProps: unknown = d.computedProperties
  let props: Record<string, unknown>[] = []
  if (Array.isArray(rawProps)) {
    props = rawProps as Record<string, unknown>[]
  } else if (rawProps && typeof rawProps === 'object') {
    props = Object.values(rawProps as Record<string, unknown>) as Record<string, unknown>[]
  }
  const getProp = (label: string): number | undefined => {
    const p = props.find(p => safeStr(p?.label).toLowerCase().includes(label.toLowerCase()))
    return p ? Number(p.value) || undefined : undefined
  }

  const logP = getProp('XLogP3')
  const hbd = getProp('Hydrogen Bond Donor')
  const hba = getProp('Hydrogen Bond Acceptor')
  const rotBonds = getProp('Rotatable Bond')
  const mw = identity.molecularWeight || getProp('Molecular Weight')
  const lipinski = (mw != null && logP != null && hbd != null && hba != null)
    ? mw <= 500 && logP <= 5 && hbd <= 5 && hba <= 10
    : null

  const risk: SafetyContext['overallRisk'] = safeLen(d.drugRecalls) > 0
    ? 'high'
    : seriousEvents > 100
      ? 'high'
      : safeLen(d.adverseEvents) > 50 || safeLen(d.drugInteractions) > 5
        ? 'moderate'
        : safeLen(d.adverseEvents) > 0
          ? 'low'
          : 'unknown'

  const loadedCategories = Object.keys(allCategoryData).filter(k => allCategoryData[k as CategoryId]).length

  const rich = extractRichData(d)

  return {
    identity: {
      name: identity.name,
      cid: identity.cid,
      formula: safeStr(d.molecularFormula),
      weight: mw,
      inchiKey: identity.inchiKey,
      iupacName: identity.iupacName,
    },
    regulatory: {
      approvedProductCount: safeLen(d.companies),
      ndcCount: safeLen(d.ndcProducts),
      orangeBookEntries: safeLen(d.orangeBookEntries),
      hasExpiredPatents: safeArr(d.orangeBookEntries).some(e => {
        const exp = e?.exclusivity_expiration || e?.patent_expiration
        return exp && new Date(safeStr(exp)) < new Date()
      }),
      atcClasses: uniqStrings(safeArr(d.atcClassifications), 'name'),
      drugInteractionCount: safeLen(d.drugInteractions),
      hasPharmacogenomics: safeLen(d.pharmgkbDrugs) > 0 || safeLen(d.cpicGuidelines) > 0,
    },
    clinical: {
      totalTrials: trials.length,
      phaseBreakdown: phases,
      recruitingTrials: recruiting,
      indications: uniqStrings(safeArr(d.chemblIndications), 'indication'),
      hasPhase3Or4: (phases['Phase 3'] || 0) > 0 || (phases['Phase 4'] || 0) > 0,
      trialSponsors: Array.from(sponsors),
    },
    safety: {
      adverseEventCount: safeLen(d.adverseEvents),
      seriousEventCount: seriousEvents,
      recallCount: safeLen(d.drugRecalls),
      hasBoxedWarning: safeArr(d.drugLabels).some(l => safeStr(l?.text).toLowerCase().includes('boxed warning')),
      knownInteractions: safeLen(d.drugInteractions),
      ghsHazardCount: safeLen(d.ghsHazards),
      overallRisk: risk,
    },
    biological: {
      knownTargets: new Set(safeArr(d.chemblActivities).map(a => safeStr(a.targetName)).filter(Boolean)).size,
      mechanismsOfAction: uniqStrings(safeArr(d.chemblMechanisms), 'mechanismOfAction'),
      pathwayCount: safeLen(d.reactomePathways) + safeLen(d.wikiPathways),
      bioactivityCount: safeLen(d.chemblActivities),
      topTargets: uniqStrings(safeArr(d.chemblActivities).filter(a => safeStr(a.targetName)), 'targetName', 5),
    },
    chemical: {
      hasComputedProperties: props.length > 0,
      molecularWeight: mw,
      logP,
      hBondDonors: hbd,
      hBondAcceptors: hba,
      rotatableBonds: rotBonds,
      followsLipinski: lipinski,
      hasSynthesisRoutes: safeLen(d.routes) > 0,
      chebiAnnotations: safeLen(d.chebiAnnotation),
    },
    structural: {
      uniprotEntryCount: safeLen(d.uniprotEntries),
      pdbStructureCount: safeLen(d.pdbStructures),
      hasAlphaFold: safeLen(d.alphaFoldPredictions) > 0,
      proteinDomains: safeLen(d.proteinDomains),
      goAnnotationCount: safeLen(d.goAnnotations),
    },
    genomic: {
      associatedGeneCount: safeLen(d.geneInfo),
      diseaseAssociations: safeLen(d.disgenetAssociations) + safeLen(d.monarchDiseases),
      hasClinVarVariants: safeLen(d.clinVarVariants) > 0,
      expressionDataAvailable: safeLen(d.geneExpressions) > 0 || safeLen(d.bgeeExpressions) > 0 || safeLen(d.gtexExpressions) > 0,
      orphanDiseases: safeLen(d.orphanetDiseases),
      omimEntries: safeLen(d.omimEntries),
    },
    research: {
      publicationCount: Math.max(safeLen(d.literature), safeLen(d.semanticPapers), safeLen(d.openAlexWorks)),
      patentCount: safeLen(d.patents),
      nihGrantCount: safeLen(d.nihGrants),
      recentPublicationTrend: 'unknown',
      topResearchAreas: uniqStrings(safeArr(d.openAlexWorks), 'concept'),
    },
    interactions: {
      proteinInteractionCount: safeLen(d.proteinInteractions) + safeLen(d.molecularInteractions),
      pathwayCount: safeLen(d.reactomePathways) + safeLen(d.wikiPathways) + safeLen(d.keggData),
      hasKEGGData: safeLen(d.keggData) > 0,
      hasReactomeData: safeLen(d.reactomePathways) > 0,
    },
    dataCompleteness: {
      loadedCategories,
      totalCategories: 9,
      panelsWithData: snapshot.totalApisSucceeded,
      totalPanels: snapshot.totalApisCalled,
      gapList: snapshot.gaps.map(g => `${g.panelKey} (${g.reason})`),
      anomalyList: snapshot.anomalies.map(a => a.message),
    },
    rich,
  }
}

export function extractRichData(d: Record<string, unknown>): RichDataContext {
  const aeArr = safeArr(d.adverseEvents)
  const aeByReaction = new Map<string, { count: number; serious: number; outcome: string; _topOutcomeCount: number }>()
  for (const ae of aeArr) {
    const name = safeStr(ae?.reactionName) || safeStr(ae?.reaction) || 'Unknown'
    const aeCount = Number(ae?.count) || 1
    const existing = aeByReaction.get(name)
    if (existing) {
      existing.count += aeCount
      existing.serious += Number(ae?.serious) || 0
      if (aeCount > existing._topOutcomeCount) {
        existing.outcome = safeStr(ae?.outcome)
        existing._topOutcomeCount = aeCount
      }
    } else {
      aeByReaction.set(name, { count: aeCount, serious: Number(ae?.serious) || 0, outcome: safeStr(ae?.outcome), _topOutcomeCount: aeCount })
    }
  }
  const topAdverseEvents = Array.from(aeByReaction.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([reactionName, data]) => ({ reactionName, count: data.count, serious: data.serious, outcome: data.outcome }))

  const recallArr = safeArr(d.drugRecalls)
  const recallDetails = recallArr.slice(0, 8).map(r => ({
    recallNumber: safeStr(r?.recallNumber),
    reason: safeStr(r?.reason),
    classification: safeStr(r?.classification),
    recallingFirm: safeStr(r?.recallingFirm),
    recallDate: safeStr(r?.recallDate || r?.reportDate),
  }))

  const actArr = safeArr(d.chemblActivities)
  const topTargetActivities = actArr
    .filter(a => safeStr(a.targetName) && Number(a.standardValue) > 0 && Number.isFinite(Number(a.standardValue)))
    .sort((a, b) => (Number(b.pchemblValue) || 0) - (Number(a.pchemblValue) || 0))
    .slice(0, 15)
    .map(a => ({
      targetName: safeStr(a.targetName),
      targetOrganism: safeStr(a.targetOrganism),
      assayType: safeStr(a.assayType),
      standardType: safeStr(a.standardType),
      standardValue: Number(a.standardValue),
      standardUnits: safeStr(a.standardUnits),
      pchemblValue: a.pchemblValue != null ? Number(a.pchemblValue) : null,
    }))

  const mechArr = safeArr(d.chemblMechanisms)
  const mechanismDetails = mechArr.slice(0, 10).map(m => ({
    mechanismOfAction: safeStr(m?.mechanismOfAction),
    actionType: safeStr(m?.actionType),
    targetName: safeStr(m?.targetName),
    directInteraction: Boolean(m?.directInteraction),
    diseaseEfficacy: Boolean(m?.diseaseEfficacy),
    maxPhase: m?.maxPhase != null ? Number(m.maxPhase) : -1,
  }))

  const trialArr = safeArr(d.clinicalTrials)
  const trialDetails = trialArr.slice(0, 12).map(t => ({
    nctId: safeStr(t?.nctId),
    title: safeStr(t?.title),
    phase: safeStr(t?.phase),
    status: safeStr(t?.status),
    conditions: Array.isArray(t?.conditions) ? (t.conditions as string[]).slice(0, 5) : [],
    sponsor: safeStr(t?.sponsor),
    startDate: safeStr(t?.startDate),
    completionDate: safeStr(t?.completionDate),
  }))

  const disgenetArr = safeArr(d.disgenetAssociations)
  const monarchArr = safeArr(d.monarchDiseases)
  const diseaseAssociations: DiseaseDetail[] = []
  for (const da of disgenetArr.slice(0, 10)) {
    diseaseAssociations.push({
      diseaseName: safeStr(da?.diseaseName),
      score: Number(da?.score) || 0,
      sources: [safeStr(da?.source)],
      geneSymbol: safeStr(da?.geneSymbol),
      evidenceCount: (da?.pmids as unknown[])?.length || 0,
    })
  }
  for (const md of monarchArr.slice(0, 5)) {
    diseaseAssociations.push({
      diseaseName: safeStr(md?.diseaseName || md?.name),
      score: 0,
      sources: [safeStr(md?.source)],
      geneSymbol: safeStr(md?.geneSymbol),
    })
  }
  diseaseAssociations.sort((a, b) => b.score - a.score)

  const reactomeArr = safeArr(d.reactomePathways)
  const wikiArr = safeArr(d.wikiPathways)
  const pathwayNames: PathwayDetail[] = []
  for (const p of reactomeArr.slice(0, 8)) {
    pathwayNames.push({ name: safeStr(p?.name), source: 'Reactome', species: safeStr(p?.species) })
  }
  for (const p of wikiArr.slice(0, 5)) {
    pathwayNames.push({ name: safeStr(p?.name), source: 'WikiPathways', species: safeStr(p?.species) })
  }

  const ppiArr = safeArr(d.proteinInteractions)
  const molIntArr = safeArr(d.molecularInteractions)
  const proteinInteractions: InteractionDetail[] = []
  for (const pi of ppiArr.slice(0, 12)) {
    proteinInteractions.push({
      partnerA: safeStr(pi?.proteinA),
      partnerB: safeStr(pi?.proteinB),
      interactionType: 'protein-protein',
      confidence: Number(pi?.confidence) || undefined,
      source: 'IntAct',
    })
  }
  for (const mi of molIntArr.slice(0, 8)) {
    proteinInteractions.push({
      partnerA: safeStr(mi?.interactorA || mi?.proteinA),
      partnerB: safeStr(mi?.interactorB || mi?.proteinB),
      interactionType: safeStr(mi?.interactionType),
      confidence: Number(mi?.confidenceScore) || undefined,
      source: 'IntAct',
    })
  }

  const drugIntArr = safeArr(d.drugInteractions)
  const drugInteractionDetails = drugIntArr.slice(0, 10).map(di => ({
    drugName: safeStr(di?.drugName || di?.drugB),
    description: safeStr(di?.description),
    severity: safeStr(di?.severity),
  }))

  const patentArr = safeArr(d.patents)
  const patentDetails = patentArr.slice(0, 10).map(p => ({
    patentNumber: safeStr(p?.patentNumber),
    title: safeStr(p?.title),
    assignee: safeStr(p?.assignee),
    expirationDate: safeStr(p?.expirationDate),
  }))

  const indArr = safeArr(d.chemblIndications)
  const indicationDetails = indArr.slice(0, 12).map(i => ({
    condition: safeStr(i?.condition || i?.indication),
    maxPhase: i?.maxPhase != null ? Number(i.maxPhase) : -1,
    meshHeading: safeStr(i?.meshHeading),
  }))

  const litArr = safeArr(d.literature).slice(0, 8)
  const semArr = safeArr(d.semanticPapers).slice(0, 5)
  const publicationDetails: PublicationDetail[] = []
  for (const l of litArr) {
    publicationDetails.push({
      title: safeStr(l?.title),
      journal: safeStr(l?.journal),
      year: Number(l?.year) || 0,
      doi: safeStr(l?.doi),
    })
  }
  for (const s of semArr) {
    publicationDetails.push({
      title: safeStr(s?.title),
      journal: safeStr(s?.journal),
      year: Number(s?.year) || 0,
      doi: safeStr(s?.doi),
      tldr: safeStr(s?.tldr),
    })
  }

  const chebiArr = safeArr(d.chebiAnnotation)
  const chebiDetails = chebiArr.slice(0, 5).map(c => ({
    name: safeStr(c?.name),
    definition: safeStr(c?.definition),
    roles: Array.isArray(c?.roles) ? (c.roles as string[]).slice(0, 5) : [],
  }))

  const goArr = safeArr(d.goAnnotations)
  const goTerms = goArr.slice(0, 12).map(g => ({
    goId: safeStr(g?.goId),
    goName: safeStr(g?.goName),
    goAspect: safeStr(g?.goAspect),
  }))

  const uniArr = safeArr(d.uniprotEntries)
  const proteinDetails = uniArr.slice(0, 8).map(u => ({
    accession: safeStr(u?.accession),
    proteinName: safeStr(u?.proteinName),
    geneName: safeStr(u?.geneName),
    organism: safeStr(u?.organism),
    functionSummary: safeStr(u?.functionSummary || u?.function).slice(0, 300),
    subcellularLocation: safeStr(u?.subcellularLocation),
  }))

  const geneArr = safeArr(d.geneInfo)
  const geneDetails = geneArr.slice(0, 8).map(g => ({
    symbol: safeStr(g?.symbol),
    name: safeStr(g?.name),
    summary: safeStr(g?.summary).slice(0, 300),
    chromosome: safeStr(g?.chromosome || g?.mapLocation),
  }))

  const atcArr = safeArr(d.atcClassifications)
  const atcClasses = atcArr.slice(0, 8).map(a => safeStr(a?.name)).filter(Boolean)

  const orphanetArr = safeArr(d.orphanetDiseases)
  const orphanDiseases = orphanetArr.slice(0, 8).map(o => safeStr(o?.diseaseName)).filter(Boolean)

  const siderArr = safeArr(d.siderSideEffects)
  const siderUnique: string[] = []
  const siderSeen: Record<string, boolean> = {}
  for (const s of siderArr.slice(0, 20)) {
    const name = safeStr(s?.sideEffectName || s?.meddraTerm)
    if (name && !siderSeen[name]) {
      siderSeen[name] = true
      siderUnique.push(name)
    }
  }
  const siderSideEffects = siderUnique

  const ghsArr = safeArr(d.ghsHazards)
  const ghsHazardStatements: string[] = []
  for (const g of ghsArr) {
    if (Array.isArray(g?.hazardStatements)) {
      ghsHazardStatements.push(...(g.hazardStatements as string[]).slice(0, 10))
    }
  }

  const pharmgkbArr = safeArr(d.pharmgkbDrugs)
  const cpicArr = safeArr(d.cpicGuidelines)
  const pharmacogenomicGenes: string[] = []
  for (const pg of pharmgkbArr) {
    if (Array.isArray(pg?.genes)) for (const g of pg.genes as { geneSymbol: string }[]) {
      const sym = safeStr(g?.geneSymbol)
      if (sym && !pharmacogenomicGenes.includes(sym)) pharmacogenomicGenes.push(sym)
    }
  }
  for (const c of cpicArr) {
    const gene = safeStr(c?.gene)
    if (gene && !pharmacogenomicGenes.includes(gene)) pharmacogenomicGenes.push(gene)
  }

  return {
    topAdverseEvents,
    recallDetails,
    topTargetActivities,
    mechanismDetails,
    trialDetails,
    diseaseAssociations,
    pathwayNames,
    proteinInteractions,
    drugInteractionDetails,
    patentDetails,
    indicationDetails,
    publicationDetails,
    chebiDetails,
    goTerms,
    proteinDetails,
    geneDetails,
    atcClasses,
    orphanDiseases,
    siderSideEffects,
    ghsHazardStatements,
    pharmacogenomicGenes,
  }
}

export const DEFAULT_MAX_CONTEXT_CHARS = 12000

export function contextToPromptBlock(ctx: MoleculeContext, maxChars: number = DEFAULT_MAX_CONTEXT_CHARS): string {
  const lines: string[] = []

  lines.push(`=== ${ctx.identity.name} (CID ${ctx.identity.cid}) ===`)
  if (ctx.identity.formula) lines.push(`Formula: ${ctx.identity.formula} | MW: ${ctx.identity.weight || '?'}`)
  if (ctx.identity.inchiKey) lines.push(`InChIKey: ${ctx.identity.inchiKey}`)

  // === MECHANISM-AE LINK TABLE: pre-joined connections between targets/MoA and top AEs ===
  if (ctx.rich.mechanismDetails.length > 0 || ctx.rich.topTargetActivities.length > 0) {
    lines.push(`\n// MECHANISM-TARGET-AE CONNECTIONS (targets linked to AEs for synthesis):`)
    if (ctx.rich.mechanismDetails.length > 0) {
      lines.push(`Known MoA:`)
      for (const m of ctx.rich.mechanismDetails) {
        lines.push(`  - ${m.mechanismOfAction} -> ${m.targetName} (${m.actionType}, phase ${m.maxPhase === -1 ? '?' : m.maxPhase}, direct=${m.directInteraction})`)
      }
    }
    if (ctx.rich.topTargetActivities.length > 0) {
      lines.push(`Target binding (most potent):`)
      for (const ta of ctx.rich.topTargetActivities.slice(0, 8)) {
        lines.push(`  - ${ta.targetName} (${ta.targetOrganism}): ${ta.standardType}=${ta.standardValue} ${ta.standardUnits}${ta.pchemblValue ? `, pChEMBL=${ta.pchemblValue}` : ''}`)
      }
    }
    if (ctx.rich.topAdverseEvents.length > 0) {
      lines.push(`Top adverse events (check which targets explain which AEs):`)
      for (const ae of ctx.rich.topAdverseEvents.slice(0, 10)) {
        lines.push(`  - ${ae.reactionName}: ${ae.count} reports (${ae.serious} serious)`)
      }
    }
    if (ctx.safety.hasBoxedWarning) lines.push(`  *** BOXED WARNING — likely linked to mechanism via targets above ***`)
    if (ctx.rich.recallDetails.length > 0) {
      lines.push(`Recalls (check if MoA-explained):`)
      for (const r of ctx.rich.recallDetails.slice(0, 4)) {
        lines.push(`  - [${r.classification}] ${r.reason} (${r.recallingFirm})`)
      }
    }
    if (ctx.rich.pharmacogenomicGenes.length > 0) {
      lines.push(`Pharmacogenomic genes (dose-modifying variants for this MoA): ${ctx.rich.pharmacogenomicGenes.join(', ')}`)
    }
  }

  // === DISEASE-TARGET-GENE NEXUS: where targets, genes, and diseases overlap ===
  if (ctx.rich.diseaseAssociations.length > 0 || ctx.rich.geneDetails.length > 0) {
    lines.push(`\n// DISEASE-TARGET-GENE NEXUS (where biology, genomics, and clinical overlap):`)
    if (ctx.rich.diseaseAssociations.length > 0) {
      lines.push(`Disease-gene links (look for target-disease gene overlap):`)
      for (const da of ctx.rich.diseaseAssociations.slice(0, 10)) {
        lines.push(`  - ${da.diseaseName} (gene=${da.geneSymbol || '?'}, score=${da.score.toFixed(2)}, evidence=${da.evidenceCount ?? '?'})`)
      }
    }
    if (ctx.rich.geneDetails.length > 0) {
      lines.push(`Key genes (check if targets above hit these gene products):`)
      for (const g of ctx.rich.geneDetails.slice(0, 5)) {
        lines.push(`  - ${g.symbol} (${g.name}): ${g.summary?.slice(0, 120) || 'no summary'}`)
      }
    }
    if (ctx.rich.indicationDetails.length > 0) {
      lines.push(`Current indications (which diseases above are NOT here = repurposing targets):`)
      for (const ind of ctx.rich.indicationDetails.slice(0, 8)) {
        lines.push(`  - ${ind.condition} (phase ${ind.maxPhase === -1 ? '?' : ind.maxPhase})`)
      }
    }
    if (ctx.rich.orphanDiseases.length > 0) {
      lines.push(`Orphan/rare diseases (high unmet need): ${ctx.rich.orphanDiseases.join(', ')}`)
    }
  }

  // === PATHWAY-PPI NETWORK: how targets connect through pathways and protein interactions ===
  if (ctx.rich.pathwayNames.length > 0 || ctx.rich.proteinInteractions.length > 0) {
    lines.push(`\n// PATHWAY & INTERACTION NETWORK (how targets connect biologically):`)
    if (ctx.rich.pathwayNames.length > 0) {
      lines.push(`Pathways: ${ctx.rich.pathwayNames.map(p => `${p.name} [${p.source}]`).join(', ')}`)
    }
    if (ctx.rich.proteinInteractions.length > 0) {
      lines.push(`Protein interactions (check if partners share diseases or AEs):`)
      for (const pi of ctx.rich.proteinInteractions.slice(0, 8)) {
        lines.push(`  - ${pi.partnerA} <-> ${pi.partnerB} (${pi.interactionType}, conf=${pi.confidence ?? 'N/A'})`)
      }
    }
    if (ctx.rich.goTerms.length > 0) {
      lines.push(`Gene Ontology: ${ctx.rich.goTerms.slice(0, 6).map(g => `${g.goName}[${g.goAspect}]`).join(', ')}`)
    }
  }

  // === CHEMICAL PROFILE: drug-likeness and structure context ===
  lines.push(`\n// CHEMICAL PROFILE:`)
  if (ctx.chemical.hasComputedProperties) {
    lines.push(`LogP: ${ctx.chemical.logP ?? '?'} | HBD: ${ctx.chemical.hBondDonors ?? '?'} | HBA: ${ctx.chemical.hBondAcceptors ?? '?'} | Lipinski: ${ctx.chemical.followsLipinski === true ? 'PASS (oral bioavailable)' : ctx.chemical.followsLipinski === false ? 'FAIL (limited oral bioavailability)' : 'N/A'}`)
  }
  if (ctx.rich.chebiDetails.length > 0) {
    lines.push(`ChEBI: ${ctx.rich.chebiDetails.map(c => `${c.name} (${c.roles.join(', ')})`).join('; ')}`)
  }
  lines.push(`UniProt: ${ctx.structural.uniprotEntryCount} | PDB: ${ctx.structural.pdbStructureCount} | AlphaFold: ${ctx.structural.hasAlphaFold}`)

  // === CLINICAL & REGULATORY CONTEXT: where this molecule stands in the pipeline ===
  lines.push(`\n// CLINICAL & REGULATORY STATUS:`)
  lines.push(`Approved products: ${ctx.regulatory.approvedProductCount} | Trials: ${ctx.clinical.totalTrials} (recruiting: ${ctx.clinical.recruitingTrials})`)
  if (Object.keys(ctx.clinical.phaseBreakdown).length > 0) {
    lines.push(`Phases: ${Object.entries(ctx.clinical.phaseBreakdown).map(([k, v]) => `${k}=${v}`).join(', ')}`)
  }
  if (ctx.rich.trialDetails.length > 0) {
    lines.push(`Key trials:`)
    for (const t of ctx.rich.trialDetails.slice(0, 4)) {
      lines.push(`  - [${t.nctId}] ${t.phase} | ${t.status} | ${t.conditions.join(', ')} | ${t.sponsor}`)
    }
  }
  if (ctx.regulatory.hasPharmacogenomics) lines.push(`Pharmacogenomic data available (PharmGKB/CPIC)`)
  if (ctx.rich.atcClasses.length > 0) lines.push(`ATC classes: ${ctx.rich.atcClasses.join(', ')}`)
  if (ctx.rich.drugInteractionDetails.length > 0) {
    lines.push(`Drug interactions (check if interacting drugs share targets/AEs):`)
    for (const di of ctx.rich.drugInteractionDetails.slice(0, 4)) {
      lines.push(`  - ${di.drugName} [${di.severity}]: ${di.description.slice(0, 120)}`)
    }
  }

  // === SAFETY SIGNALS: AEs, recalls, hazards, and interactions joined to context above ===
  lines.push(`\n// SAFETY SIGNALS (cross-reference with MECHANISM section above):`)
  lines.push(`Overall risk: ${ctx.safety.overallRisk.toUpperCase()} | Total AEs: ${ctx.safety.adverseEventCount} | Serious: ${ctx.safety.seriousEventCount} | Recalls: ${ctx.safety.recallCount}`)
  if (ctx.rich.siderSideEffects.length > 0) lines.push(`SIDER: ${ctx.rich.siderSideEffects.slice(0, 10).join(', ')}`)
  if (ctx.rich.ghsHazardStatements.length > 0) lines.push(`GHS hazards: ${ctx.rich.ghsHazardStatements.slice(0, 6).join('; ')}`)

  // === RESEARCH & IP LANDSCAPE ===
  lines.push(`\n// RESEARCH & IP LANDSCAPE:`)
  lines.push(`Publications: ${ctx.research.publicationCount} | Patents: ${ctx.research.patentCount} | NIH grants: ${ctx.research.nihGrantCount}`)
  if (ctx.rich.publicationDetails.length > 0) {
    lines.push(`Recent publications:`)
    for (const pub of ctx.rich.publicationDetails.slice(0, 3)) {
      lines.push(`  - "${pub.title}" (${pub.journal}, ${pub.year})${pub.tldr ? ` TLDR: ${pub.tldr.slice(0, 100)}` : ''}`)
    }
  }
  if (ctx.rich.patentDetails.length > 0) {
    lines.push(`Key patents:`)
    for (const pa of ctx.rich.patentDetails.slice(0, 3)) {
      lines.push(`  - ${pa.patentNumber}: "${pa.title.slice(0, 60)}" (${pa.assignee}, exp ${pa.expirationDate})`)
    }
  }
  if (ctx.regulatory.orangeBookEntries > 0) lines.push(`Orange Book entries: ${ctx.regulatory.orangeBookEntries}${ctx.regulatory.hasExpiredPatents ? ' (some patents expired — generic threat)' : ''}`)

  // === DATA GAPS ===
  lines.push(`\n// DATA GAPS (what we CANNOT answer):`)
  lines.push(`${ctx.dataCompleteness.panelsWithData}/${ctx.dataCompleteness.totalPanels} panels loaded`)
  if (ctx.dataCompleteness.gapList.length > 0) lines.push(`Missing: ${ctx.dataCompleteness.gapList.slice(0, 6).join(', ')}`)
  if (ctx.structural.pdbStructureCount === 0 && ctx.rich.topTargetActivities.length > 0) lines.push(`No PDB structures — cannot assess binding mode for ${ctx.rich.topTargetActivities.length} targets`)
  if (ctx.rich.mechanismDetails.length === 0 && ctx.rich.topTargetActivities.length > 0) lines.push(`Targets known but MoA unknown — cannot link AEs to specific target engagement`)

  const result = lines.join('\n')
  if (result.length <= maxChars) return result

  const headerLines = lines.filter(l => !l.startsWith('  -'))
  let trimmed = headerLines.join('\n')
  const detailLines = lines.filter(l => l.startsWith('  -'))
  for (const dl of detailLines) {
    if (trimmed.length + dl.length + 1 > maxChars) break
    trimmed += '\n' + dl
  }
  trimmed += '\n[Context truncated to fit model window — prioritized summary lines over detail items]'
  return trimmed
}