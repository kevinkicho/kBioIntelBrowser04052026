/**
 * Copilot context types (molecule / disease / gene).
 */

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

export const DEFAULT_MAX_CONTEXT_CHARS = 12000

export interface DiseaseContext {
  query: string
  results: DiseaseSearchResult[]
  dataCompleteness: {
    sources: string[]
    resultsWithMolecules: number
    totalMolecules: number
    totalResults: number
  }
}

export interface DiseaseSearchResult {
  id: string
  name: string
  description?: string
  therapeuticAreas?: string[]
  source: string
  molecules?: { name: string; cid: number | null }[]
}

export interface GeneContext {
  symbol: string
  name: string
  summary: string
  chromosome: string
  typeOfGene: string
  aliases: string[]
  ensemblId: string
  uniprotId: string
  targetedDrugs: { drugName: string; interactionType: string; sources: string[] }[]
  diseaseAssociations: { diseaseName: string; score: number; source: string }[]
  clinvarVariants: { clinicalSignificance: string; geneSymbol: string; conditionName?: string }[]
  pathwayNames: string[]
  goTerms: string[]
  dataCompleteness: { panelsLoaded: number; totalPanels: number; gapList: string[] }
}

