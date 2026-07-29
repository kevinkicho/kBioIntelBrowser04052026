/** Domain DTO types — split from monolithic types.ts for maintainability. */
// Clinical & Safety Types
export interface ClinicalTrial {
  nctId: string
  title: string
  status: string
  phase: string
  startDate: string
  completionDate: string
  conditions: string[]
  interventions: string[]
  sponsor: string
  enrollment?: number
  interventionDetails?: { name: string; type: string }[]
  /** EudraCT numbers from CTG secondary IDs (EU CTR deep links) */
  eudraCtNumbers?: string[]
  /** Trial sites (facility names) from CTG locations module */
  facilities?: { name: string; city: string; country: string }[]
}

export interface AdverseEvent {
  id: string
  drugName: string
  reactionName: string
  reaction: string
  serious: number
  outcome: string
  reportDate: string
  count: number
}

export interface GhsHazardData {
  signalWord: string
  hazardStatements: string[]
  precautionaryStatements: string[]
  pictogramUrls?: string[]
}

// SIDER Types - Side Effects
export interface SIDERSideEffect {
  drugName: string
  drugId: string
  sideEffectName: string
  sideEffectId: string
  meddraTerm?: string
  umlsCui?: string
  frequency: string
  source: string
  url?: string
}

// CPIC Types - Clinical Pharmacogenetics Guidelines
export interface CPICGuideline {
  id: string
  drugName: string
  drugClass: string
  gene: string
  guidelineId: string
  lastUpdated: string
  url: string
  recommendations: CPICRecommendation[]
}

export interface CPICRecommendation {
  phenotype: string
  activityScore: string
  implication: string
  therapeuticRecommendation: string
  classification: string
  strength: string
}

// ISRCTN Types - UK Clinical Trials
export interface ISRCTNTrial {
  isRCTN: string
  title: string
  status: string
  phase: string
  recruitmentStatus: string
  sponsor: string
  country: string
  startDate: string
  endDate: string
  targetEnrollment: number
  conditions: string[]
  interventions: string[]
  outcomes: string[]
  url: string
}

// FDA Drug Shortage Types
export interface DrugShortage {
  id: string
  drugName: string
  genericName: string
  company: string
  shortageStatus: 'Shortage' | 'Resolved' | 'Ongoing'
  shortageType: string
  shortageReason: string
  estimatedResupplyDate?: string
  url: string
}
