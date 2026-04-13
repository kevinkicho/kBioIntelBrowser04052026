export type SearchType = 'name' | 'cid' | 'cas' | 'smiles' | 'inchikey' | 'inchi' | 'formula'

export type ApiIdentifierType = SearchType | 'gene_symbol' | 'uniprot_accession' | 'pdb_id'

export type ApiParamType = 'number' | 'select' | 'toggle'

export interface ApiParamOption {
  value: string
  label: string
}

export interface ApiParamDef {
  key: string
  label: string
  type: ApiParamType
  default: number | string | boolean
  min?: number
  max?: number
  options?: ApiParamOption[]
  description?: string
}

export type ApiParamValue = Record<string, string | number | boolean>

export interface ApiIdentifierConfig {
  panelId: string
  label: string
  defaultType: ApiIdentifierType
  supportedTypes: ApiIdentifierType[]
}

export const API_IDENTIFIER_CONFIGS: ApiIdentifierConfig[] = [
  { panelId: 'chembl', label: 'ChEMBL', defaultType: 'name', supportedTypes: ['name', 'smiles', 'inchikey'] },
  { panelId: 'chembl-mechanisms', label: 'ChEMBL Mechanisms', defaultType: 'name', supportedTypes: ['name', 'smiles', 'inchikey'] },
  { panelId: 'opentargets', label: 'Open Targets', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'iuphar', label: 'IUPHAR/BPS', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'bindingdb', label: 'BindingDB', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'dgidb', label: 'DGIdb', defaultType: 'name', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'pharos', label: 'Pharos', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'lincs', label: 'LINCS L1000', defaultType: 'name', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'bioassay', label: 'PubChem BioAssay', defaultType: 'cid', supportedTypes: ['name', 'cid'] },
  { panelId: 'clinical-trials', label: 'ClinicalTrials.gov', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'adverse-events', label: 'FDA Adverse Events', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'recalls', label: 'FDA Recalls', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'toxcast', label: 'EPA ToxCast', defaultType: 'name', supportedTypes: ['name', 'cas'] },
  { panelId: 'sider', label: 'SIDER', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'iris', label: 'EPA IRIS', defaultType: 'name', supportedTypes: ['name', 'cas'] },
  { panelId: 'comptox', label: 'EPA CompTox', defaultType: 'name', supportedTypes: ['name', 'cas', 'inchikey'] },
  { panelId: 'gwas-catalog', label: 'GWAS Catalog', defaultType: 'name', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'clinvar', label: 'ClinVar', defaultType: 'name', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'uniprot', label: 'UniProt', defaultType: 'name', supportedTypes: ['name', 'gene_symbol', 'uniprot_accession'] },
  { panelId: 'uniprot-extended', label: 'UniProt Extended', defaultType: 'name', supportedTypes: ['name', 'gene_symbol', 'uniprot_accession'] },
  { panelId: 'pdb', label: 'RCSB PDB', defaultType: 'name', supportedTypes: ['name', 'pdb_id'] },
  { panelId: 'alphafold', label: 'AlphaFold', defaultType: 'gene_symbol', supportedTypes: ['gene_symbol', 'uniprot_accession'] },
  { panelId: 'interpro', label: 'InterPro', defaultType: 'uniprot_accession', supportedTypes: ['uniprot_accession'] },
  { panelId: 'quickgo', label: 'QuickGO', defaultType: 'uniprot_accession', supportedTypes: ['uniprot_accession', 'gene_symbol'] },
  { panelId: 'go', label: 'Gene Ontology', defaultType: 'gene_symbol', supportedTypes: ['gene_symbol'] },
  { panelId: 'ebi-proteins', label: 'EBI Proteins', defaultType: 'uniprot_accession', supportedTypes: ['uniprot_accession'] },
  { panelId: 'ebi-proteomics', label: 'EBI Proteomics', defaultType: 'uniprot_accession', supportedTypes: ['uniprot_accession'] },
  { panelId: 'ebi-crossrefs', label: 'EBI Cross-Refs', defaultType: 'uniprot_accession', supportedTypes: ['uniprot_accession'] },
  { panelId: 'protein-atlas', label: 'Protein Atlas', defaultType: 'gene_symbol', supportedTypes: ['gene_symbol'] },
  { panelId: 'human-protein-atlas', label: 'Human Protein Atlas', defaultType: 'gene_symbol', supportedTypes: ['gene_symbol'] },
  { panelId: 'ensembl', label: 'Ensembl', defaultType: 'gene_symbol', supportedTypes: ['gene_symbol'] },
  { panelId: 'expression-atlas', label: 'Expression Atlas', defaultType: 'gene_symbol', supportedTypes: ['gene_symbol'] },
  { panelId: 'gtex', label: 'GTEx', defaultType: 'gene_symbol', supportedTypes: ['gene_symbol'] },
  { panelId: 'gene-info', label: 'NCBI Gene', defaultType: 'gene_symbol', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'string', label: 'STRING', defaultType: 'name', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'stitch', label: 'STITCH', defaultType: 'name', supportedTypes: ['name', 'cid'] },
  { panelId: 'reactome', label: 'Reactome', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'smpdb', label: 'SMPDB', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'pathway-commons', label: 'Pathway Commons', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'wikipathways', label: 'WikiPathways', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'kegg', label: 'KEGG', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'biocyc', label: 'BioCyc', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'smpdb', label: 'SMPDB', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'pubmed', label: 'PubMed', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'literature', label: 'Europe PMC', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'semantic-scholar', label: 'Semantic Scholar', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'open-alex', label: 'OpenAlex', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'open-citations', label: 'OpenCitations', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'crossref', label: 'CrossRef', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'arxiv', label: 'arXiv', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'nih-reporter', label: 'NIH RePORTER', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'sec', label: 'SEC EDGAR', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'patents', label: 'PatentsView', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'mychem', label: 'MyChem', defaultType: 'name', supportedTypes: ['name', 'inchikey'] },
  { panelId: 'chebi', label: 'ChEBI', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'hmdb', label: 'HMDB', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'lipidmaps', label: 'LIPID MAPS', defaultType: 'name', supportedTypes: ['name', 'formula'] },
  { panelId: 'properties', label: 'PubChem Properties', defaultType: 'cid', supportedTypes: ['cid'] },
  { panelId: 'hazards', label: 'PubChem Hazards', defaultType: 'cid', supportedTypes: ['cid'] },
  { panelId: 'companies', label: 'FDA NDC', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'drug-interactions', label: 'RxNorm', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'drugcentral', label: 'DrugCentral', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'pharmgkb', label: 'PharmGKB', defaultType: 'name', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'cpic', label: 'CPIC', defaultType: 'name', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'ctd', label: 'CTD', defaultType: 'name', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'ctd-diseases', label: 'CTD Diseases', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'disgenet', label: 'DisGeNET', defaultType: 'gene_symbol', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'monarch', label: 'Monarch', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'mesh', label: 'MeSH', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'nci-thesaurus', label: 'NCI Thesaurus', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'orphanet', label: 'Orphanet', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'omim', label: 'OMIM', defaultType: 'name', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'mygene', label: 'MyGene', defaultType: 'gene_symbol', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'bgee', label: 'Bgee', defaultType: 'gene_symbol', supportedTypes: ['gene_symbol'] },
  { panelId: 'clingen', label: 'ClinGen', defaultType: 'gene_symbol', supportedTypes: ['gene_symbol'] },
  { panelId: 'dbsnp', label: 'dbSNP', defaultType: 'gene_symbol', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'medgen', label: 'MedGen', defaultType: 'name', supportedTypes: ['name', 'gene_symbol'] },
  { panelId: 'hpo', label: 'HPO', defaultType: 'name', supportedTypes: ['name'] },
  { panelId: 'ols', label: 'OLS', defaultType: 'name', supportedTypes: ['name'] },
]

export const IDENTIFIER_TYPE_LABELS: Record<ApiIdentifierType, { short: string; label: string; description: string }> = {
  name: { short: 'Name', label: 'Molecule Name', description: 'Common name, IUPAC name, or synonym' },
  cid: { short: 'CID', label: 'PubChem CID', description: 'PubChem Compound ID number' },
  cas: { short: 'CAS', label: 'CAS Number', description: 'CAS Registry Number (e.g. 50-78-2)' },
  smiles: { short: 'SMILES', label: 'SMILES', description: 'Simplified Molecular Input Line Entry System' },
  inchikey: { short: 'InChIKey', label: 'InChIKey', description: 'IUPAC International Chemical Identifier Key' },
  inchi: { short: 'InChI', label: 'InChI', description: 'IUPAC International Chemical Identifier' },
  formula: { short: 'Formula', label: 'Molecular Formula', description: 'Molecular formula (e.g. C9H8O4)' },
  gene_symbol: { short: 'Gene', label: 'Gene Symbol', description: 'HGNC gene symbol (e.g. TP53)' },
  uniprot_accession: { short: 'UniProt', label: 'UniProt Accession', description: 'UniProt protein accession (e.g. P04637)' },
  pdb_id: { short: 'PDB', label: 'PDB ID', description: 'RCSB Protein Data Bank ID (e.g. 1TUP)' },
}

export const API_PARAMETERS: Record<string, ApiParamDef[]> = {
  'chembl': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 20, min: 1, max: 100 },
    { key: 'assayType', label: 'Assay type', type: 'select', default: 'IC50', options: [
      { value: 'IC50', label: 'IC50' },
      { value: 'Ki', label: 'Ki' },
      { value: 'Kd', label: 'Kd' },
      { value: 'EC50', label: 'EC50' },
      { value: 'all', label: 'All types' },
    ]},
  ],
  'chembl-mechanisms': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 20, min: 1, max: 100 },
  ],
  'clinical-trials': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
    { key: 'status', label: 'Status', type: 'select', default: 'all', options: [
      { value: 'all', label: 'All' },
      { value: 'RECRUITING', label: 'Recruiting' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'TERMINATED', label: 'Terminated' },
    ]},
  ],
  'adverse-events': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 100 },
    { key: 'seriousOnly', label: 'Serious only', type: 'toggle', default: false },
  ],
  'gwas': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
    { key: 'pValueThreshold', label: 'P-value threshold', type: 'select', default: '0.00001', options: [
      { value: '0.00001', label: '< 1e-5 (genome-wide)' },
      { value: '0.001', label: '< 0.001' },
      { value: '0.05', label: '< 0.05' },
      { value: '1', label: 'All' },
    ]},
  ],
  'uniprot': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
    { key: 'reviewedOnly', label: 'Reviewed only (Swiss-Prot)', type: 'toggle', default: true },
  ],
  'string': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
    { key: 'minScore', label: 'Min confidence', type: 'select', default: '0', options: [
      { value: '0', label: 'Any' },
      { value: '150', label: 'Low (150+)' },
      { value: '400', label: 'Medium (400+)' },
      { value: '700', label: 'High (700+)' },
      { value: '900', label: 'Highest (900+)' },
    ]},
  ],
  'iuphar': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
    { key: 'species', label: 'Species', type: 'select', default: 'human', options: [
      { value: 'human', label: 'Human' },
      { value: 'all', label: 'All species' },
    ]},
  ],
  'monarch': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
    { key: 'category', label: 'Category', type: 'select', default: 'biolink:Disease', options: [
      { value: 'biolink:Disease', label: 'Diseases' },
      { value: 'biolink:Gene', label: 'Genes' },
      { value: 'biolink:PhenotypicFeature', label: 'Phenotypes' },
      { value: 'all', label: 'All' },
    ]},
  ],
  'semantic-scholar': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
    { key: 'minCitations', label: 'Min citations', type: 'number', default: 0, min: 0, max: 10000 },
    { key: 'yearFrom', label: 'Year from', type: 'number', default: 2000, min: 1900, max: 2026 },
  ],
  'open-alex': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
    { key: 'yearFrom', label: 'Year from', type: 'number', default: 2000, min: 1900, max: 2026 },
  ],
  'opentargets': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'interpro': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'pdb': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'alphafold': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 5, min: 1, max: 20 },
  ],
  'reactome': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'smpdb': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'kegg': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 30 },
  ],
  'pathway-commons': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'wikipathways': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'biocyc': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'intact': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'expression-atlas': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'gtex': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'clinvar': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 20, min: 1, max: 100 },
    { key: 'clinicalSignificance', label: 'Significance', type: 'select', default: 'all', options: [
      { value: 'all', label: 'All' },
      { value: 'Pathogenic', label: 'Pathogenic' },
      { value: 'Likely_pathogenic', label: 'Likely pathogenic' },
      { value: 'Uncertain', label: 'VUS' },
      { value: 'Likely_benign', label: 'Likely benign' },
      { value: 'Benign', label: 'Benign' },
    ]},
  ],
  'ctd': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 20, min: 1, max: 100 },
  ],
  'iedb': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 20, min: 1, max: 100 },
  ],
  'lincs': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'pubmed': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'literature': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'crossref': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'arxiv': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'nih-reporter': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'sec': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'patents': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'toxcast': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 50, min: 1, max: 200 },
  ],
  'sider': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 20, min: 1, max: 100 },
  ],
  'dgidb': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 20, min: 1, max: 100 },
  ],
  'disgenet': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'hpo': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'ols': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'mygene': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'gene-info': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 5, min: 1, max: 20 },
  ],
  'bgee': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'omim': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'pride': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'massive': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'biomodels': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
  'biosamples': [
    { key: 'maxResults', label: 'Max results', type: 'number', default: 10, min: 1, max: 50 },
  ],
}