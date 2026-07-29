/** Domain DTO types — split from monolithic types.ts for maintainability. */
// DrugBank Types
export interface DrugBankDrug {
  id: string
  name: string
  description: string
  casNumber: string
  unii: string
  state: string
  groups: string[]
  categories: string[]
  targets: DrugBankTarget[]
  interactions: DrugBankInteraction[]
}

export interface DrugBankTarget {
  id: string
  name: string
  organism: string
  actions: string[]
  knownAction: boolean
}

export interface DrugBankInteraction {
  drugbankId: string
  name: string
  description: string
  severity: 'minor' | 'moderate' | 'major'
}

// DrugCentral Types
export interface DrugCentralDrug {
  id: number
  name: string
  synonym: string[]
  indication: string[]
  actionType: string[]
  routes: string[]
  faers: FaersData[]
  targets: DrugCentralTarget[]
  atcCodes: string[]
}

export interface DrugCentralTarget {
  targetId: number
  targetName: string
  geneSymbol: string
  uniprotId: string
  actionType: string
  actionCode: string
  drugId: number
}

export interface DrugCentralProduct {
  id: number
  name: string
  form: string
  route: string
  marketingStartDate: string
}

export interface DrugCentralEnhanced {
  drug: DrugCentralDrug | null
  targets: DrugCentralTarget[]
  indications: string[]
  pharmacologicActions: string[]
  atcCodes: string[]
  manufacturers: string[]
  products: DrugCentralProduct[]
}

export interface FaersData {
  term: string
  count: number
  pt: string  // Preferred Term
}

// FDA & Pharmaceutical Types
export interface CompanyProduct {
  company: string
  brandName: string
  genericName: string
  productType: string
  route: string
  applicationNumber: string
}

export interface Patent {
  id: string
  patentNumber: string
  title: string
  filingDate: string
  publicationDate: string
  expirationDate: string
  status: string
  assignee: string
  abstract?: string
}

export interface NdcProduct {
  productNdc: string
  substanceName?: string
  substanceUnii?: string
  productType: string
  finallisted?: boolean
  marketingCategory: string
  brandName: string
  genericName: string
  manufacturer?: string
  labelerName: string
  dosageForm?: string
  route?: string
  pharmClass: string[]
  url: string
}

export interface OrangeBookEntry {
  activeIngredient: string
  applicantFullName?: string
  sponsorName: string
  tradeName?: string
  dosageType?: string
  dosageForm: string
  applicationNumber: string
  approvalDate: string
  patentNumber?: string
  patentExpirationDate?: string
  teCode?: string
  patents?: Array<{ patentNumber: string; expiryDate: string }>
  exclusivities?: Array<{ code: string; expiryDate: string }>
}

export interface DrugLabel {
  title: string
  setId: string
  version?: string
  date?: string
  url?: string
  dailyMedUrl: string
  labelerName?: string
  dosageForm?: string
  route?: string
  publishedDate?: string
}

export interface DrugInteraction {
  drugA?: string
  drugB?: string
  drugName: string
  description: string
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated' | 'N/A'
  url?: string
  sourceName?: string
}

export interface DrugRecall {
  recallNumber: string
  recallDate: string
  reportDate: string
  recallingFirm: string
  reason: string
  classification: string
  distribution: string
  city?: string
  state?: string
  status: string
}

export interface DrugPrice {
  ndcCode: string
  ndcDescription: string
  nadacPerUnit: number
  pricingUnit: string
  effectiveDate: string
  pharmacyType: string
  url: string
}

// GSRS Types - FDA Global Substance Registration System
export interface GSRSSubstance {
  unii: string
  name: string
  synonyms: string[]
  type: string
  structure: {
    smiles?: string
    inchi?: string
    inchiKey?: string
    formula?: string
    molecularWeight?: number
  }
  url: string
}
