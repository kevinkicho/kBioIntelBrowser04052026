// Molecule Classification Type
export type MoleculeClassification = 'therapeutic' | 'enzyme' | 'reagent' | 'industrial' | 'diagnostic' | 'metabolite' | 'unknown'

// PubChem Types
export interface BaseMoleculeData {
  cid: number
  name: string
  formula: string
  molecularWeight: number
  synonyms: string[]
  inchiKey: string
  iupacName: string
  classification: MoleculeClassification
  structureImageUrl: string
  description?: string
}

export type Molecule = BaseMoleculeData

export interface SearchResult {
  cid: number
  name: string
  formula: string
}

export interface ComputedProperties {
  xLogP: number | null
  tpsa: number | null
  hBondDonorCount: number
  hBondAcceptorCount: number
  complexity: number
  exactMass: number
  charge: number
  rotatableBondCount: number
}

// Synthesis Types
export interface SynthesisRoute {
  method: string
  description: string
  keggReactionIds: string[]
  enzymesInvolved: string[]
  precursors: string[]
  source: 'kegg' | 'rhea'
}

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

// Metabolomics Workbench Types
export interface MetaboliteData {
  refmetName: string
  formula: string
  exactMass: number
  mainClass: string
  subClass: string
  hmdbId: string
  pubchemCid?: number
  keggId: string
  chebiId: string
  inchi: string
  inchiKey: string
}

export interface MetabolomicsStudy {
  studyId: string
  title: string
  description: string
  metabolites: number
  samples: number
  organisms: string[]
  doi: string
}

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
  substanceName: string
  substanceUnii: string
  productTypeName: string
  finallisted: boolean
  marketingCategory: string
  brandName: string
  genericName: string
  manufacturer: string
  labelerName: string
  dosageForm?: string
  route?: string
  pharmClass: string[]
  url: string
}

export interface OrangeBookEntry {
  ingredient: string
  applicantFullName: string
  sponsorName: string
  tradeName: string
  dosageType: string
  dosageForm: string
  applicationNumber: string
  approvalDate: string
  patentNumber: string
  patentExpirationDate: string
  teCode?: string
  patents?: Array<{ patentNumber: string; expiryDate: string }>
  exclusivities?: Array<{ code: string; expiryDate: string }>
}

export interface DrugLabel {
  id: string
  title: string
  version: string
  date: string
  url: string
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

// ChEMBL Types
export interface ChemblActivity {
  activityId: string
  targetName: string
  targetOrganism: string
  targetChemblId: string
  chemblId: string
  assayType: string
  standardType: string
  standardValue: number
  standardUnits: string
  pchemblValue: number
  activityType: string
  activityValue: number
  activityUnits: string
  url: string
}

export interface ChemblMechanism {
  mechanismId: string
  moleculeName: string
  targetName: string
  actionType: string
  mechanismOfAction: string
  directInteraction: boolean
  diseaseEfficacy: boolean
  url: string
  maxPhase: number
}

export interface ChemblIndication {
  indicationId: string
  moleculeName: string
  condition: string
  maxPhase: number
  maxPhaseForIndication: number
  meshId: string
  meshHeading: string
  efoId: string
  efoTerm: string
  url: string
}

// Protein & Structure Types
export interface UniprotEntry {
  accession: string
  proteinName: string
  geneName: string
  organism: string
  length?: number
  function?: string
  functionSummary?: string
  subcellularLocation?: string
  pathways?: string[]
}

export interface PdbStructure {
  pdbId: string
  title: string
  resolution: number
  method: string
  releaseDate: string
  organisms: string[]
  chains: string[]
  url?: string
  depositionDate?: string
}

export interface ReactomePathway {
  stId: string
  name: string
  url: string
  species: string
  summation?: string
  reactions?: string[]
}

// Literature Types
export interface LiteratureResult {
  id: string
  title: string
  authors: string[]
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

// Graph Types
export interface GraphNode {
  id: string
  type: 'molecule' | 'company' | 'patent' | 'trial' | 'target' | 'pathway' | 'synthesis' | 'gene' | 'product' | 'publication' | 'grant'
  label: string
  group?: string
  data?: Record<string, unknown>
}

export interface GraphEdge {
  source: string
  target: string
  type?: string
  value?: number
  label?: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// AlphaFold Types
export interface AlphaFoldPrediction {
  entryId: string
  uniprotAccession: string
  geneName: string
  organismName: string
  confidenceScore: number
  modelUrl: string
  url: string
}

export interface AtcClassification {
  code: string
  name: string
  classType: string
}

// BindingDB Types
export interface BindingAffinity {
  ligandId: string
  ligandName: string
  targetName: string
  affinityType: string
  affinityValue: number
  affinityUnit: string
  affinityUnits: string
  source?: string
  doi?: string
  kdValue?: number
  kiValue?: number
  ic50Value?: number
}

// BioAssay Types
export interface BioAssayResult {
  assayId: string
  assayName: string
  description: string
  type: string
  outcome: string
  activeCompounds: number
  testedCompounds: number
  url: string
  targetName?: string
  activityValue?: number
}

// CheBI Types
export interface ChebiAnnotation {
  chebiId: string
  name: string
  definition: string
  synonyms?: string[]
  ontology?: string[]
  roles: string[]
  url: string
  formula?: string
  mass?: number
}

// ClinVar Types
export interface ClinVarVariant {
  variantId: string
  clinicalSignificance: string
  conditionName: string
  condition?: string
  geneSymbol: string
  gene?: string
  title?: string
  variantType: string
  chromosome: string
  position: number
  reviewStatus: string
  url: string
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
  url: string
  exposurePrediction?: string
}

// Disease Association Types
export interface DiseaseAssociation {
  diseaseId: string
  diseaseName: string
  score: number
  evidenceCount: number
  sources: string[]
  therapeuticAreas?: string[]
}

// Drug-Gene Interaction Types
export interface DrugGeneInteraction {
  drugName: string
  geneSymbol: string
  geneName: string
  interactionType: string
  evidence: string
  source: string
  url: string
  score: number
}

// Ensembl Types
export interface EnsemblGene {
  geneId: string
  symbol: string
  name: string
  displayName: string
  chromosome: string
  start: number
  end: number
  strand: number
  biotype: string
  description?: string
  url: string
}

// Expression Types
export interface GeneExpression {
  geneSymbol: string
  tissueName: string
  expressionLevel: number
  unit: string
  condition: string
  experimentType: string
  experimentDescription: string
  species: string
  url: string
}

// Gene Info Types
export interface GeneInfo {
  geneId: string
  symbol: string
  name: string
  organism: string
  chromosome: string
  mapLocation: string
  summary: string
  url: string
}

// GWAS Types
export interface GwasAssociation {
  studyId: string
  traitName: string
  geneSymbol: string
  pValue: number
  riskAllele: string
  pubmedId: string
  region?: string
  url?: string
}

// IntAct Types
export interface MolecularInteraction {
  interactionId: string
  proteinA: string
  proteinB: string
  interactorA: string
  interactorB: string
  interactionType: string
  detectionMethod: string
  pubmedId: string
  url: string
  confidenceScore?: number
}

// InterPro Types
export interface ProteinDomain {
  domainId: string
  domainName: string
  name: string
  type: string
  description: string
  start: number
  end: number
  source: string
  url: string
}

// IUPHAR Types
export interface PharmacologyTarget {
  targetId: string
  targetName: string
  ligandName: string
  actionType: string
  affinity?: number
  affinityUnit?: string
  url?: string
  primaryTarget?: boolean
  type?: string
  species?: string
}

// MeSH Types
export interface MeshTerm {
  meshId: string
  termName: string
  name: string
  definition: string
  scopeNote?: string
  treeNumbers: string[]
  relatedTerms: string[]
  url: string
}

// Monarch Types
export interface MonarchDisease {
  diseaseId: string
  diseaseName: string
  id: string
  name: string
  geneSymbol: string
  evidence: string
  source: string
  description?: string
  phenotypeCount?: number
  url: string
  pubmedId?: string
}

// NCI Thesaurus Types
export interface NciConcept {
  conceptId: string
  code: string
  name: string
  definition: string
  semanticType: string
  conceptStatus: string
  leaf: boolean
  synonyms: string[]
  parents: string[]
  url: string
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
  citedBy: string[]
  references: string[]
  url: string
}

// PathwayCommons Types
export interface PathwayCommonsResult {
  pathwayId: string
  pathwayName: string
  source: string
  interactions: number
  participants: string[]
  dataSource?: string
  name?: string
  numParticipants?: number
  url?: string
}

// PDBE Ligands Types
export interface PdbeLigand {
  compId: string
  name: string
  formula?: string
  molecularWeight: number
  inchiKey?: string
  drugbankId?: string
  url: string
}

// Pharos Types
export interface PharosTarget {
  targetId: string
  name: string
  geneSymbol: string
  tdl: string
  druggability: string
  indications: string[]
  family?: string
  description?: string
  novelty?: number
  url: string
}

// Protein Atlas Types
export interface ProteinAtlasEntry {
  gene: string
  uniprotId?: string
  subcellularLocations: string[]
  url: string
}

// Protein Feature Types
export interface ProteinFeature {
  featureId: string
  featureName: string
  start: number
  begin: number
  end: number
  description: string
  source: string
  type: string
  url?: string
}

// Protein Interaction Types
export interface ProteinInteraction {
  interactionId: string
  proteinA: string
  proteinB: string
  confidence: number
  source: string
}

// QuickGO Types
export interface GoAnnotation {
  goId: string
  goName: string
  goAspect: string
  qualifier?: string
  evidence?: string
  url: string
}

// Related Compound Types
export interface RelatedCompound {
  compoundId: string
  compoundName: string
  name: string
  similarity: number
  relationship: string
  chemblId: string
  maxPhase: number
  activityValue?: number
  activityUnits?: string
  activityType?: string
}

// SEC Filing Types
export interface SecFiling {
  filingId: string
  companyName: string
  formType: string
  filingDate: string
  description?: string
  url?: string
}

// Similar Molecule Types
export interface SimilarMolecule {
  cid: number
  name: string
  similarity: number
  formula: string
}

// STRING Types
export interface StringInteraction {
  proteinA: string
  proteinB: string
  score: number
  experimentalScore?: number
  databaseScore?: number
  textminingScore?: number
  url?: string
}

// STITCH Types
export interface ChemicalProteinInteraction {
  chemicalId: string
  chemicalName: string
  proteinId: string
  proteinName: string
  combinedScore: number
  experimentalScore: number
  databaseScore: number
  textminingScore: number
  url: string
}

// WikiPathways Types
export interface WikiPathway {
  id: string
  name: string
  description?: string
  species: string
  url: string
  genes?: string[]
}

// DisGeNET Types - Gene-Disease Associations
export interface DisGeNetAssociation {
  geneSymbol: string
  geneId: string
  diseaseId: string
  diseaseName: string
  diseaseType: string
  score: number
  confidenceScore?: number
  source: string
  pmids: string[]
}

// Orphanet Types - Rare Diseases
export interface OrphanetDisease {
  orphaCode: string
  diseaseName: string
  diseaseType: string
  definition: string
  synonyms: string[]
  genes: string[]
  symptoms: string[]
  prevalence: string
  url: string
}

// MyChem Types - Chemical Annotations
export interface MyChemAnnotation {
  chemblId: string
  pubchemCid: string
  chebiId: string
  inchiKey: string
  drugbankId: string
  name: string
  synonyms: string[]
  formula: string
  molecularWeight: number
  smiles: string
  sources: string[]
  chembl?: {
    moleculeType: string
    maxPhase: number
    indications: string[]
  }
  chebi?: {
    name: string
    definition: string
    parentIds: string[]
  }
  drugbank?: {
    categories: string[]
    groups: string[]
    atcCodes: string[]
  }
}

// MyGene Types - Gene Annotations
export interface MyGeneAnnotation {
  geneId: string
  entrezId?: string
  symbol: string
  name: string
  taxid: number
  ensemblId: string
  uniprotId: string
  summary: string
  aliases: string[]
  typeOfGene: string
  mapLocation: string
  pathways: string[]
  goAnnotations: {
    biologicalProcess: string[]
    molecularFunction: string[]
    cellularComponent: string[]
  }
}

// Bgee Types - Gene Expression
export interface BgeeExpression {
  geneId: string
  geneSymbol: string
  species: string
  anatomicalEntityId: string
  anatomicalEntityName: string
  developmentalStageId: string
  developmentalStageName: string
  expressionLevel: string
  expressionScore: number
  confidenceScore: number
}

// CTD Types - Chemical-Gene-Disease Interactions
export interface CTDInteraction {
  chemicalName: string
  chemicalId: string
  geneSymbol: string
  geneId: string
  interaction: string
  interactionActions: string[]
  pmids: string[]
  source: string
}

export interface CTDDiseaseAssociation {
  diseaseName: string
  diseaseId: string
  geneSymbol: string
  geneId: string
  chemicalName?: string
  chemicalId?: string
  inferenceScore: number
  pmids: string[]
  source: string
}

// HMDB Types - Human Metabolome Database
export interface HMDBMetabolite {
  hmdbId: string
  name: string
  formula: string
  molecularWeight: number
  smiles: string
  inchiKey: string
  inchi: string
  description: string
  biospecimens: string[]
  tissues: string[]
  pathways: string[]
  url: string
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

// OMIM Types - Genetic Disorders (requires API key)
export interface OMIMEntry {
  mimNumber: number
  name: string
  prefix: string
  status: string
  description: string
  geneSymbols: string[]
  phenotypes: {
    mimNumber: number
    name: string
    mapping: string
  }[]
  references: {
    pubmedId: number
    title: string
    authors: string
  }[]
  url: string
}

// IEDB Types - Immune Epitopes (requires API key)
export interface IEDBEpitope {
  epitopeId: number
  name: string
  sequence: string
  length: number
  epitopeType: string
  antigenName: string
  antigenId: number
  organismName: string
  organismId: number
  mhcRestriction: string
  assayCount: number
  positiveAssayCount: number
  source: string
  url: string
}

// PeptideAtlas Types - Proteomics
export interface PeptideAtlasEntry {
  peptideId: string
  sequence: string
  length: number
  proteinNames: string[]
  geneSymbols: string[]
  organism: string
  tissueSource: string
  sampleSource: string
  observations: number
  bestScore: number
  source: string
  url: string
}

// GEO Types - Gene Expression Omnibus
export interface GEODataset {
  geoId: string
  accession: string
  title: string
  summary: string
  organism: string
  platformType: string
  sampleType: string
  seriesType: string
  nSamples: number
  nFeatures: number
  releaseDate: string
  lastUpdate: string
  url: string
}

// dbSNP Types - Genetic Variants
export interface dbSNPVariant {
  rsId: string
  refSNPId: string
  chromosome: string
  position: number
  alleles: string
  clinicalSignificance: string
  clinical: boolean
  frequency: number
  genes: string[]
  clinicalAllele: string
  reviewed: boolean
  url: string
}

// ClinGen Types - Clinical Genomics
export interface ClinGenGeneDisease {
  geneSymbol: string
  geneDiseaseId: string
  diseaseName: string
  diseaseId: string
  validityClassification: string
  validityScore: number
  modeOfInheritance: string
  assertionDate: string
  expertPanel: string
  url: string
}

export interface ClinGenVariant {
  variantId: string
  geneSymbol: string
  variantName: string
  clinicalSignificance: string
  reviewStatus: string
  condition: string
  url: string
}

// MedGen Types - Medical Genetics
export interface MedGenConcept {
  conceptId: string
  cui: string
  name: string
  definition: string
  semanticTypes: string[]
  synonyms: string[]
  umlsCui: string
  omimIds: string[]
  url: string
}

// PRIDE Types - Proteomics
export interface PRIDEProject {
  accession: string
  title: string
  description: string
  species: string
  tissue: string
  instrument: string
  ptm: string
  disease: string
  submitter: string
  publicationDate: string
  numProteins: number
  numPeptides: number
  numSpectra: number
  url: string
}

// MassBank Types - Mass Spectrometry
export interface MassBankSpectrum {
  accession: string
  name: string
  formula: string
  mass: number
  ionMode: string
  instrument: string
  collisionEnergy: string
  precursorMz: number
  msLevel: number
  url: string
}

// BioCyc Types - Metabolic Pathways
export interface BioCycPathway {
  pathwayId: string
  name: string
  description: string
  organism: string
  url: string
}

// SMPDB Types - Small Molecule Pathways
export interface SMPDBPathway {
  smpdbId: string
  name: string
  description: string
  pathwayType: string
  organism: string
  metabolites: string[]
  enzymes: string[]
  url: string
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

// KEGG Types - Expanded Pathways & Compounds
export interface KEGGPathway {
  id: string
  name: string
  description: string
  class: string
  compounds: string[]
  drugs: string[]
  enzymes: string[]
  genes: string[]
  url: string
  imageUrl: string
}

export interface KEGGCompound {
  id: string
  name: string
  formula: string
  exactMass: number
  molWeight: number
  pathways: string[]
  enzymes: string[]
  reactions: string[]
  dbLinks: { database: string; ids: string[] }[]
  url: string
}

export interface KEGGDrug {
  id: string
  name: string
  formula: string
  exactMass: number
  molWeight: number
  pathways: string[]
  targets: string[]
  ATC: string
  dbLinks: { database: string; ids: string[] }[]
  url: string
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
  inhalationRfC: number | null
  inhalationRfCUnits: string
  inhalationRfCConfidence: 'High' | 'Medium' | 'Low'
  cancerClassification: 'Carcinogenic' | 'Likely Carcinogenic' | 'Suggestive' | 'Inadequate' | 'Not Likely'
  cancerWeightOfEvidence: string
  criticalEffects: string[]
  organsAffected: string[]
  url: string
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

// ChemSpider Types - Chemistry Database
export interface ChemSpiderCompound {
  id: string
  csId: string
  name: string
  synonyms: string[]
  formula: string
  molecularWeight: number
  inChI: string
  inChIKey: string
  smiles: string
  sources: string[]
  image2D: string
  image3D: string
  url: string
}

// CATH/Gene3D Types - Protein Domain Classification
export interface CATHDomain {
  id: string
  domainId: string
  superfamilyId: string
  fold: string
  superfamily: string
  functionalFamily: string
  protein: string
  organism: string
  pdbId: string
  pdbChain: string
  sequence: string
  length: number
  url: string
}

export interface Gene3DEntry {
  id: string
  geneId: string
  geneSymbol: string
  proteinName: string
  organism: string
  domains: CATHDomain[]
  domainArchitecture: string
  url: string
}

// MetaboLights Types - Metabolomics Repository
export interface MetaboLightsStudy {
  id: string
  title: string
  description: string
  studyType: string
  organism: string
  organismPart: string
  platform: string
  metabolites: number
  samples: number
  techniques: string[]
  publication: string
  publicationDate: string
  url: string
}

export interface MetaboLightsMetabolite {
  id: string
  name: string
  formula: string
  inchi: string
  inchiKey: string
  chebiId: string
  hmdbId: string
  smiles: string
  mass: number
  databaseLinks: { database: string; ids: string[] }[]
  url: string
}

// UniChem Types - Chemical Cross-Reference Service
export interface UniChemSource {
  sourceId: string
  name: string
  fullName: string
  url: string
  description: string
}

export interface UniChemMapping {
  sourceId: string
  sourceName: string
  externalId: string
  url: string
}

// FooDB Types - Food Compound Database
export interface FoodBCompound {
  id: string
  name: string
  description: string
  formula: string
  inchi: string
  inchiKey: string
  smiles: string
  mass: number
  casRegistryNumber: string
  foodSources: string[]
  synonyms: string[]
  url: string
}

// PhytoHub Types - Dietary Phytochemicals
export interface PhytoHubCompound {
  id: string
  name: string
  formula: string
  inchi: string
  inchiKey: string
  smiles: string
  mass: number
  foodSources: string[]
  healthEffects: string[]
  url: string
}

// DFDB Types - Dietary Flavonoid Database
export interface DFDBFlavonoid {
  id: string
  name: string
  formula: string
  inchi: string
  inchiKey: string
  smiles: string
  mass: number
  foodSources: string[]
  subclasses: string[]
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

// GNPS Types - Mass Spectrometry Networking
export interface GNPSLibrarySpectrum {
  id: string
  name: string
  precursorMz: number
  mz: number
  ionMode: string
  smiles: string
  inchi: string
  library: string
  sources: string[]
  organism: string
  url: string
}

export interface GNPSNetworkCluster {
  clusterId: string
  parentMass: number
  ionMode: string
  spectraCount: number
  connectedComponents: number
  libraryIdentifications: string[]
  bestMatch: string
  url: string
}

// SAbDab Types - Antibody Structure Database
export interface SAbDabEntry {
  id: string
  pdbId: string
  resolution: number
  species: string[]
  heavyChain: string
  lightChain: string
  antigen: string
  antigenType: string
  antibodyType: 'Fab' | 'scFv' | 'VHH' | 'Nanobody' | 'Fab2' | 'IgG'
  cdrSequences: {
    heavy: { cdr1: string; cdr2: string; cdr3: string }
    light: { cdr1: string; cdr2: string; cdr3: string }
  }
  affinity: number | null
  affinityUnits: string
  url: string
}

// Molecule Data ( updated)
export interface MoleculeData extends BaseMoleculeData {
  drugbank?: {
    drug: DrugBankDrug | null
    targets: DrugBankTarget[]
    interactions: DrugBankInteraction[]
  }
  drugcentral?: {
    drug: DrugCentralDrug | null
    targets: DrugCentralTarget[]
  }
  metabolomics?: {
    metabolites: MetaboliteData[]
    studies: MetabolomicsStudy[]
  }
  toxcast?: ToxCastData | null
  // New API integrations
  disgenetAssociations?: DisGeNetAssociation[]
  orphanetDiseases?: OrphanetDisease[]
  myChemAnnotations?: MyChemAnnotation[]
  myGeneAnnotations?: MyGeneAnnotation[]
  bgeeExpressions?: BgeeExpression[]
  ctdInteractions?: CTDInteraction[]
  ctdDiseaseAssociations?: CTDDiseaseAssociation[]
  hmdbMetabolites?: HMDBMetabolite[]
  siderSideEffects?: SIDERSideEffect[]
  omimEntries?: OMIMEntry[]
  iedbEpitopes?: IEDBEpitope[]
  peptideAtlasEntries?: PeptideAtlasEntry[]
  // New APIs (2026-04-09)
  uniprotProteins?: UniProtProtein[]
  clinvarVariants?: ClinVarVariant[]
  goTerms?: GOTerm[]
  hpoTerms?: HPOTerm[]
  gtexExpressions?: GTExExpression[]
  drugShortages?: DrugShortage[]
  lipidMapsLipids?: LipidMapsLipid[]
  bioModelsModels?: BioModelsModel[]
  olsTerms?: OLSTerm[]
  // New APIs (2026-04-09 continuation)
  ebiProteinVariations?: ProteinVariation | null
  ebiProteomicsData?: ProteomicsMapping | null
  ebiCrossReferences?: CrossReference | null
  bioSamples?: BioSample[]
  massiveDatasets?: MassIVEDataset[]
  // LINCS L1000
  lincsSignatures?: LINCSSignature[]
  // Human Protein Atlas
  humanProteinAtlas?: ProteinAtlasData | null
  // TTD (Therapeutic Target Database)
  ttdTargets?: TTDTarget[]
  ttdDrugs?: TTDDrug[]
  // DrugCentral Enhanced
  drugCentralEnhanced?: DrugCentralEnhanced | null
  // UniChem (chemical cross-referencing)
  unichemMappings?: UniChemMapping[]
  // FooDB (food compounds)
  foodbCompounds?: FoodBCompound[]
  // PhytoHub (dietary phytochemicals)
  phytohCompounds?: PhytoHubCompound[]
  // DFDB (dietary flavonoids)
  dfdbFlavonoids?: DFDBFlavonoid[]
  // GSRS (FDA UNII registry)
  gsrsSubstances?: GSRSSubstance[]
}

// Gene Ontology Types
export interface GOTerm {
  id: string
  label: string
  definition?: string
  aspect: 'biological_process' | 'molecular_function' | 'cellular_component'
  synonyms: string[]
  parents: string[]
  children: string[]
}

// Human Phenotype Ontology Types
export interface HPOTerm {
  id: string
  name: string
  definition?: string
  synonyms: string[]
  parents: string[]
  children: string[]
}

// GTEx Types
export interface GTExExpression {
  geneId: string
  geneSymbol: string
  tissueName: string
  tissueCode: string
  tpm: number
  tpmSd: number
  nSamples: number
  rank: number
  percentile: number
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

// UniProt Extended Types
export interface UniProtProtein {
  accession: string
  id: string
  proteinName: string
  geneName: string
  organism: string
  length: number
  sequence: string
  function?: string
  subcellularLocation?: string
  pathways?: string[]
}

// LIPID MAPS Types
export interface LipidMapsLipid {
  lmId: string
  name: string
  synonyms: string[]
  category: string
  mainClass: string
  subClass: string
  formula: string
  molecularWeight: number
  exactMass: number
  smiles?: string
  inchi?: string
  inchiKey?: string
  url: string
}

// BioModels Types
export interface BioModelsModel {
  id: string
  name: string
  description: string
  authors: string[]
  submitter: string
  submitterDate: string
  lastUpdate: string
  modelSize: number
  formats: string[]
  organisms: string[]
  url: string
}

// OLS Types
export interface OLSTerm {
  id: string
  label: string
  iri: string
  ontologyId: string
  description?: string
  synonyms: string[]
  parents: string[]
  children: string[]
  ancestors: string[]
  descendants: string[]
  mappings: { source: string; url: string }[]
}

// EMBL-EBI Proteins Types
export interface ProteinVariation {
  accession: string
  entryName: string
  geneName: string
  variations: Variation[]
}

export interface Variation {
  type: string
  location: {
    start: number
    end: number
  }
  sequenceVariation?: {
    type: string
    sequence: string
  }
  clinicalSignificance?: string
  source: string
  sourceId: string
  frequency?: {
    value: number
    population?: string
  }
  description?: string
}

export interface ProteomicsMapping {
  accession: string
  entryName: string
  proteomicsData: ProteomicsEntry[]
}

export interface ProteomicsEntry {
  proteinId: string
  peptideCount: number
  uniquePeptideCount: number
  coverage: number
  experiments: string[]
}

export interface CrossReference {
  accession: string
  entryName: string
  crossReferences: {
    database: string
    id: string
    url?: string
  }[]
}

// BioSamples Types
export interface BioSample {
  id: string
  name: string
  domain: string
  organism: string
  description?: string
  submitter: string
  submissionDate: string
  updateDate: string
  attributes: {
    name: string
    value: string
    unit?: string
    surface?: string
  }[]
  externalReferences: {
    url: string
    label: string
  }[]
  publications: {
    pmid?: string
    doi?: string
  }[]
}

// MassIVE Types
export interface MassIVEDataset {
  id: string
  title: string
  description: string
  doi: string
  submitter: string
  submissionDate: string
  updateDate: string
  organism: string
  instrumentType: string
  datasetType: string
  sampleType: string
  lab: string
  contactName: string
  contactEmail: string
  publication?: string
  pubmedId?: string
  fileCount: number
  fileSize: number
  url: string
}

// LINCS L1000 Types
export interface LINCSSignature {
  perturbationId: string
  perturbationName: string
  perturbationType: string
  concentration: number
  concentrationUnit: string
  timePoint: string
  cellLine: string
  cellLineName: string
  tissue: string
  upregulatedGenes: string[]
  downregulatedGenes: string[]
  zScore: number
  pValue: number
  similarityScore?: number
}

// Human Protein Atlas Types
export interface ProteinAtlasData {
  gene: string
  ensemblId: string
  description?: string
  tissueExpression: ProteinAtlasTissueExpression[]
  cellLineExpression?: ProteinAtlasCellLineExpression[]
  subcellularLocalization?: ProteinAtlasSubcellularLocation[]
}

export interface ProteinAtlasTissueExpression {
  tissue: string
  tissueType: string
  expressionLevel: string
  score: number
  nRna: number
  nProtein: number
}

export interface ProteinAtlasCellLineExpression {
  cellLine: string
  expressionLevel: string
  score: number
}

export interface ProteinAtlasSubcellularLocation {
  location: string
  confidence: string
}

// TTD (Therapeutic Target Database) Types
export interface TTDTarget {
  id: string
  name: string
  synonym: string[]
  organism: string
  type: string
  function: string
  pathway: string[]
  associatedDiseases: string[]
  drugCount: number
  url: string
}

export interface TTDDrug {
  id: string
  name: string
  synonym: string[]
  type: string
  targets: string[]
  indications: string[]
  url: string
}

// NCI caDSR Types
export interface CadsrConcept {
  conceptId: string
  preferredName: string
  definition?: string
  context: string
  workflowStatus: string
  evsSource?: string
}

// NCATS Translator Types
export interface TranslatorAssociation {
  subject: string
  predicate: string
  object: string
  edgeLabel: string
  source: string
  publications?: string[]
}

// NHGRI AnVIL Types
export interface AnvilDataset {
  datasetId: string
  name: string
  description?: string
  studyName: string
  consentGroups: string[]
  dataTypes: string[]
  participantCount: number
  sampleCount: number
}

// NIAID ImmPort Types
export interface ImmPortStudy {
  studyId: string
  title: string
  description?: string
  studyType: string
  conditionStudied?: string
  intervention?: string
  participantCount: number
  arms: string[]
  reagents?: string[]
}

// NINDS NeuroMMSig Types
export interface NeuroMMSigSignature {
  signatureId: string
  name: string
  disease: string
  mechanism: string
  genes: string[]
  drugs: string[]
  evidence?: string
  publications?: string[]
}
