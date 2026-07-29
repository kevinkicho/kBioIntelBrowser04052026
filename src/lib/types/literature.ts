/** Domain DTO types — split from monolithic types.ts for maintainability. */
// Literature Types
export interface LiteratureResult {
  id: string
  title: string
  authors: string
  journal: string
  publicationDate: string
  year: number
  doi: string
  pmid: string
  abstract: string
  citedByCount?: number
}

// PubMed Types
export interface PubMedArticle {
  pmid: string
  title: string
  authors: string[]
  journal: string
  pubDate: string
  volume?: string
  issue?: string
  pages?: string
  doi?: string
  pmcid?: string
  abstract: string
  keywords: string[]
  url: string
}

export interface NihGrant {
  projectId: string
  projectNumber: string
  title: string
  abstract: string
  piName: string
  institute: string
  fundingIcg: string
  fundingMechanism: string
  programOfficer: string
  startDate: string
  endDate: string
  fundingAmount: number
  totalCost: number
}

export interface SemanticPaper {
  paperId: string
  title: string
  authors: string[]
  publicationDate: string
  journal: string
  citationCount: number
  influentialCitationCount: number
  doi: string
  tldr?: string
  url?: string
  year?: number
}

// OpenAlex Types
export interface OpenAlexWork {
  workId: string
  title: string
  authors: string[]
  publicationDate: string
  year: number
  type?: string
  journal: string
  citationCount: number
  doi: string
  openAccessUrl?: string
  url?: string
}

// OpenCitations Types
export interface CitationMetric {
  doi: string
  title?: string
  citationCount: number
  /** Outgoing references counted in OpenCitations index */
  referenceCount?: number
  citedBy: string[]
  references: string[]
  url: string
  authors?: string
  venue?: string
  year?: string
  type?: string
  openAlexId?: string
  pmid?: string
  volume?: string
  pages?: string
}

// CrossRef Types - DOI Metadata
export interface CrossRefWork {
  doi: string
  title: string
  authors: string[]
  journal: string
  publicationDate: string
  year: number
  type: string
  publisher: string
  isReferencedByCount: number
  referencesCount: number
  url: string
}

// arXiv Types - Preprints
export interface ArXivPaper {
  arxivId: string
  title: string
  authors: string[]
  abstract: string
  categories: string[]
  publishedDate: string
  updatedDate: string
  url: string
  pdfUrl: string
}

// PharmGKB Types - Pharmacogenomics
export interface PharmGKBGene {
  id: string
  symbol: string
  name: string
  chromosome: string
  variants: PharmGKBVariant[]
  drugs: PharmGKBDrugAssociation[]
  phenotypes: string[]
  url: string
}

export interface PharmGKBVariant {
  id: string
  rsId: string
  allele: string
  gene: string
  significance: string
}

export interface PharmGKBDrugAssociation {
  drugId: string
  drugName: string
  interactionType: string
  level: 'Level 1A' | 'Level 1B' | 'Level 2A' | 'Level 2B' | 'Level 3' | 'Level 4'
  phenotype: string
  recommendation: string
}

export interface PharmGKBDrug {
  id: string
  name: string
  genericNames: string[]
  brandNames: string[]
  drugClass: string
  fdaApproval: string
  genes: PharmGKBGeneAssociation[]
  guidelines: PharmGKBGuideline[]
  url: string
}

export interface PharmGKBGeneAssociation {
  geneSymbol: string
  geneId: string
  interactionType: string
  level: string
}

export interface PharmGKBGuideline {
  id: string
  name: string
  source: string
  drugs: string[]
  genes: string[]
  recommendations: PharmGKBRecommendation[]
}

export interface PharmGKBRecommendation {
  phenotype: string
  implication: string
  recommendation: string
  classification: string
}
