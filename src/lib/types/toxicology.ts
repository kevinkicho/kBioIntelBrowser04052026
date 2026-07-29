/** Domain DTO types — split from monolithic types.ts for maintainability. */
// EPA ToxCast Types
export interface ToxCastData {
  casrn: string
  dtxsid: string
  chemicalName: string
  assays: ToxCastAssay[]
  summary: ToxCastSummary
}

export interface ToxCastAssay {
  assayId: string
  assayName: string
  endpoint: string
  outcome: string
  potencyValue: number
  potencyUnit: string
  nConst: number
  nGain: number
  nLoss: number
}

export interface ToxCastSummary {
  totalAssays: number
  activeAssays: number
  inactiveAssays: number
  inconclusiveAssays: number
  topHitSubcategory: string
}

// CompTox Types
export interface CompToxData {
  dtxsid: string
  chemicalName: string
  casrn: string
  casNumber: string
  molecularFormula: string
  molecularWeight: number
  structureUrl: string
  synonyms: string[]
  toxcastTotal: number
  toxcastActive: number
  /**
   * False when free CompTox/ToxCast count APIs did not return assay totals.
   * UI must not treat total=0 as “0% active”.
   */
  toxcastAvailable?: boolean
  url: string
  exposurePrediction?: string
}

// EPA IRIS Types - Toxicological Assessments
export interface IRISAssessment {
  id: string
  chemicalName: string
  casNumber: string
  assessmentStatus: 'Final' | 'Under Review' | 'Development'
  lastUpdated: string
  oralRfD: number | null
  oralRfDUnits: string
  oralRfDConfidence: 'High' | 'Medium' | 'Low'
  /** Original RfD string from source (e.g. "4 x 10^-3 mg/kg-day") when available */
  oralRfDDisplay?: string
  inhalationRfC: number | null
  inhalationRfCUnits: string
  inhalationRfCConfidence: 'High' | 'Medium' | 'Low'
  inhalationRfCDisplay?: string
  cancerClassification: 'Carcinogenic' | 'Likely Carcinogenic' | 'Suggestive' | 'Inadequate' | 'Not Likely'
  cancerWeightOfEvidence: string
  criticalEffects: string[]
  organsAffected: string[]
  url: string
  /** True when PubChem EPA IRIS section was found (real tox values) */
  hasIrisData?: boolean
}
