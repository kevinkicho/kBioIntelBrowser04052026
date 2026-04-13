export type CategoryId =
  | 'pharmaceutical'
  | 'clinical-safety'
  | 'molecular-chemical'
  | 'bioactivity-targets'
  | 'protein-structure'
  | 'genomics-disease'
  | 'interactions-pathways'
  | 'research-literature'
  | 'nih-high-impact'

export interface PanelDef {
  id: string
  title: string
  propKey: string
  isNullable: boolean
}

export interface CategoryDef {
  id: CategoryId
  label: string
  icon: string
  panels: PanelDef[]
}

export interface CategoryDataCount {
  withData: number
  total: number
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'pharmaceutical',
    label: 'Pharmaceutical',
    icon: '💊',
    panels: [
      { id: 'companies', title: 'Companies', propKey: 'companies', isNullable: false },
      { id: 'ndc', title: 'NDC', propKey: 'ndcProducts', isNullable: false },
      { id: 'orange-book', title: 'OrangeBook', propKey: 'orangeBookEntries', isNullable: false },
      { id: 'nadac', title: 'NADAC', propKey: 'drugPrices', isNullable: false },
      { id: 'drug-interactions', title: 'DrugInteractions', propKey: 'drugInteractions', isNullable: false },
      { id: 'dailymed', title: 'DailyMed', propKey: 'drugLabels', isNullable: false },
      { id: 'atc', title: 'ATC', propKey: 'atcClassifications', isNullable: false },
      { id: 'drugcentral', title: 'DrugCentral', propKey: 'drugCentralData', isNullable: true },
      { id: 'gsrs', title: 'GSRS (UNII)', propKey: 'gsrsSubstances', isNullable: true },

      { id: 'pharmgkb', title: 'PharmGKB', propKey: 'pharmgkbDrugs', isNullable: true },
      { id: 'cpic', title: 'CPIC', propKey: 'cpicGuidelines', isNullable: true },

    ],
  },
  {
    id: 'clinical-safety',
    label: 'Clinical & Safety',
    icon: '🏥',
    panels: [
      { id: 'clinical-trials', title: 'ClinicalTrials', propKey: 'clinicalTrials', isNullable: false },
      { id: 'isrctn', title: 'ISRCTN', propKey: 'isrctnTrials', isNullable: true },
      { id: 'adverse-events', title: 'AdverseEvents', propKey: 'adverseEvents', isNullable: false },
      { id: 'recalls', title: 'Recalls', propKey: 'drugRecalls', isNullable: false },
      { id: 'chembl-indications', title: 'ChemblIndications', propKey: 'chemblIndications', isNullable: false },
      { id: 'clinvar', title: 'ClinVar', propKey: 'clinVarVariants', isNullable: false },
      { id: 'drug-shortages', title: 'DrugShortages', propKey: 'drugShortages', isNullable: true },
      { id: 'gwas', title: 'GwasCatalog', propKey: 'gwasAssociations', isNullable: false },
      { id: 'toxcast', title: 'ToxCast', propKey: 'toxcastData', isNullable: true },
      { id: 'sider', title: 'SIDER', propKey: 'siderSideEffects', isNullable: true },
      { id: 'iris', title: 'IRIS', propKey: 'irisAssessments', isNullable: true },
    ],
  },
  {
    id: 'molecular-chemical',
    label: 'Molecular & Chemical',
    icon: '🧪',
    panels: [
      { id: 'properties', title: 'Properties', propKey: 'computedProperties', isNullable: true },
      { id: 'hazards', title: 'Hazards', propKey: 'ghsHazards', isNullable: true },
      { id: 'chebi', title: 'CheBI', propKey: 'chebiAnnotation', isNullable: true },
      { id: 'comptox', title: 'CompTox', propKey: 'compToxData', isNullable: true },
      { id: 'synthesis', title: 'Synthesis', propKey: 'routes', isNullable: false },
      { id: 'metabolomics', title: 'Metabolomics', propKey: 'metabolomicsData', isNullable: true },
      { id: 'mychem', title: 'MyChem', propKey: 'myChemAnnotations', isNullable: true },
      { id: 'hmdb', title: 'HMDB', propKey: 'hmdbMetabolites', isNullable: true },
      { id: 'massbank', title: 'MassBank', propKey: 'massBankSpectra', isNullable: true },
      { id: 'chemspider', title: 'ChemSpider', propKey: 'chemSpiderCompounds', isNullable: true },
      { id: 'metabolights', title: 'MetaboLights', propKey: 'metabolightsData', isNullable: true },
      { id: 'gnps', title: 'GNPS', propKey: 'gnpsData', isNullable: true },
      { id: 'lipidmaps', title: 'LIPID MAPS', propKey: 'lipidMapsLipids', isNullable: true },
      { id: 'unichem', title: 'UniChem', propKey: 'unichemMappings', isNullable: true },
      { id: 'foodb', title: 'FooDB', propKey: 'foodbCompounds', isNullable: true },
    ],
  },
  {
    id: 'bioactivity-targets',
    label: 'Bioactivity & Targets',
    icon: '🎯',
    panels: [
      { id: 'chembl', title: 'ChEMBL', propKey: 'chemblActivities', isNullable: false },
      { id: 'bioassay', title: 'BioAssay', propKey: 'bioAssays', isNullable: false },
      { id: 'chembl-mechanisms', title: 'ChemblMechanisms', propKey: 'chemblMechanisms', isNullable: false },
      { id: 'iuphar', title: 'IUPHAR', propKey: 'pharmacologyTargets', isNullable: false },
      { id: 'bindingdb', title: 'BindingDB', propKey: 'bindingAffinities', isNullable: false },
      { id: 'pharos', title: 'Pharos', propKey: 'pharosTargets', isNullable: false },
      { id: 'dgidb', title: 'DGIdb', propKey: 'drugGeneInteractions', isNullable: false },
      { id: 'opentargets', title: 'OpenTargets', propKey: 'diseaseAssociations', isNullable: false },
      { id: 'ctd', title: 'CTD', propKey: 'ctdInteractions', isNullable: true },
      { id: 'iedb', title: 'IEDB', propKey: 'iedbEpitopes', isNullable: true },
      { id: 'lincs', title: 'LINCS L1000', propKey: 'lincsSignatures', isNullable: true },
      { id: 'ttd', title: 'TTD', propKey: 'ttdTargets', isNullable: true },
    ],
  },
  {
    id: 'protein-structure',
    label: 'Protein & Structure',
    icon: '🧬',
    panels: [
      { id: 'uniprot', title: 'UniProt', propKey: 'uniprotEntries', isNullable: false },
      { id: 'uniprot-extended', title: 'UniProtExtended', propKey: 'uniprotProteins', isNullable: true },
      { id: 'interpro', title: 'InterPro', propKey: 'proteinDomains', isNullable: false },
      { id: 'ebi-proteins', title: 'EbiProteins', propKey: 'ebiProteinVariations', isNullable: true },
      { id: 'ebi-proteomics', title: 'EbiProteomics', propKey: 'ebiProteomicsData', isNullable: true },
      { id: 'ebi-crossrefs', title: 'EbiCrossRefs', propKey: 'ebiCrossReferences', isNullable: true },
      { id: 'protein-atlas', title: 'ProteinAtlas', propKey: 'proteinAtlasEntries', isNullable: false },
      { id: 'human-protein-atlas', title: 'Human Protein Atlas', propKey: 'humanProteinAtlas', isNullable: true },
      { id: 'quickgo', title: 'QuickGO', propKey: 'goAnnotations', isNullable: false },
      { id: 'pdb', title: 'PDB', propKey: 'pdbStructures', isNullable: false },
      { id: 'pdbe-ligands', title: 'PdbeLigands', propKey: 'pdbeLigands', isNullable: false },
      { id: 'alphafold', title: 'AlphaFold', propKey: 'alphaFoldPredictions', isNullable: false },
      { id: 'peptideatlas', title: 'PeptideAtlas', propKey: 'peptideAtlasEntries', isNullable: true },
      { id: 'pride', title: 'PRIDE', propKey: 'prideProjects', isNullable: true },
      { id: 'cath', title: 'CATH', propKey: 'cathData', isNullable: true },

      { id: 'sabdab', title: 'SAbDab', propKey: 'sabdabEntries', isNullable: true },
    ],
  },
  {
    id: 'genomics-disease',
    label: 'Genomics & Disease',
    icon: '🧫',
    panels: [
      { id: 'gene-info', title: 'GeneInfo', propKey: 'geneInfo', isNullable: false },
      { id: 'ensembl', title: 'Ensembl', propKey: 'ensemblGenes', isNullable: false },
      { id: 'expression-atlas', title: 'ExpressionAtlas', propKey: 'geneExpressions', isNullable: false },
      { id: 'gtex', title: 'GTEx', propKey: 'gtexExpressions', isNullable: true },
      { id: 'geo', title: 'GEO', propKey: 'geoDatasets', isNullable: true },
      { id: 'dbsnp', title: 'dbSNP', propKey: 'dbSnpVariants', isNullable: true },
      { id: 'clingen', title: 'ClinGen', propKey: 'clinGenData', isNullable: true },
      { id: 'medgen', title: 'MedGen', propKey: 'medGenConcepts', isNullable: true },
      { id: 'monarch', title: 'Monarch', propKey: 'monarchDiseases', isNullable: false },
      { id: 'nci-thesaurus', title: 'NciThesaurus', propKey: 'nciConcepts', isNullable: false },
      { id: 'mesh', title: 'MeSH', propKey: 'meshTerms', isNullable: false },
      { id: 'go', title: 'GeneOntology', propKey: 'goTerms', isNullable: true },
      { id: 'hpo', title: 'HPO', propKey: 'hpoTerms', isNullable: true },
      { id: 'ols', title: 'OLS', propKey: 'olsTerms', isNullable: true },
      { id: 'disgenet', title: 'DisGeNET', propKey: 'disgenetAssociations', isNullable: true },
      { id: 'orphanet', title: 'Orphanet', propKey: 'orphanetDiseases', isNullable: true },
      { id: 'mygene', title: 'MyGene', propKey: 'myGeneAnnotations', isNullable: true },
      { id: 'bgee', title: 'Bgee', propKey: 'bgeeExpressions', isNullable: true },
      { id: 'omim', title: 'OMIM', propKey: 'omimEntries', isNullable: true },
      { id: 'biomodels', title: 'BioModels', propKey: 'bioModelsModels', isNullable: true },
      { id: 'biosamples', title: 'BioSamples', propKey: 'bioSamples', isNullable: true },
      { id: 'massive', title: 'MassIVE', propKey: 'massiveDatasets', isNullable: true },
    ],
  },
  {
    id: 'interactions-pathways',
    label: 'Interactions & Pathways',
    icon: '🔗',
    panels: [
      { id: 'string', title: 'STRING', propKey: 'proteinInteractions', isNullable: false },
      { id: 'stitch', title: 'STITCH', propKey: 'chemicalProteinInteractions', isNullable: false },
      { id: 'intact', title: 'IntAct', propKey: 'molecularInteractions', isNullable: false },
      { id: 'reactome', title: 'Reactome', propKey: 'reactomePathways', isNullable: false },
      { id: 'wikipathways', title: 'WikiPathways', propKey: 'wikiPathways', isNullable: false },
      { id: 'pathway-commons', title: 'PathwayCommons', propKey: 'pathwayCommonsResults', isNullable: false },
      { id: 'biocyc', title: 'BioCyc', propKey: 'bioCycPathways', isNullable: true },
      { id: 'smpdb', title: 'SMPDB', propKey: 'smpdbPathways', isNullable: true },
      { id: 'ctd-diseases', title: 'CTDDiseases', propKey: 'ctdDiseaseAssociations', isNullable: true },
      { id: 'kegg', title: 'KEGG', propKey: 'keggData', isNullable: true },
    ],
  },
  {
    id: 'nih-high-impact',
    label: 'NIH High-Impact',
    icon: '🏥',
    panels: [
      { id: 'nci-cadsr', title: 'NCI caDSR', propKey: 'cadsrData', isNullable: true },
      { id: 'ncats-translator', title: 'NCATS Translator', propKey: 'translatorData', isNullable: true },
      { id: 'nhgri-anvil', title: 'NHGRI AnVIL', propKey: 'anvilData', isNullable: true },
      { id: 'niaid-immport', title: 'NIAID ImmPort', propKey: 'immPortData', isNullable: true },
      { id: 'ninds-neurommsig', title: 'NINDS NeuroMMSig', propKey: 'neuroMMSigData', isNullable: true },
    ],
  },
  {
    id: 'research-literature',
    label: 'Research & Literature',
    icon: '📚',
    panels: [
      { id: 'nih-reporter', title: 'NIHReporter', propKey: 'nihGrants', isNullable: false },
      { id: 'patents', title: 'Patents', propKey: 'patents', isNullable: false },
      { id: 'sec', title: 'SEC', propKey: 'secFilings', isNullable: false },
      { id: 'literature', title: 'Literature', propKey: 'literature', isNullable: false },
      { id: 'pubmed', title: 'PubMed', propKey: 'pubmedArticles', isNullable: false },
      { id: 'semantic-scholar', title: 'SemanticScholar', propKey: 'semanticPapers', isNullable: false },
      { id: 'open-alex', title: 'OpenAlex', propKey: 'openAlexWorks', isNullable: false },
      { id: 'open-citations', title: 'OpenCitations', propKey: 'citationMetrics', isNullable: false },
      { id: 'crossref', title: 'CrossRef', propKey: 'crossRefWorks', isNullable: true },
      { id: 'arxiv', title: 'arXiv', propKey: 'arxivPapers', isNullable: true },
    ],
  },
]

function hasRealData(value: unknown): boolean {
  if (value === null || value === undefined || value === '' || value === 0) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if ('data' in obj && typeof obj.data === 'object' && obj.data !== null) {
      return hasRealData(obj.data)
    }
    return Object.values(obj).some(v => hasRealData(v))
  }
  return true
}

export function getCategoryDataCounts(
  props: Record<string, unknown>
): Record<CategoryId, CategoryDataCount> {
  const result = {} as Record<CategoryId, CategoryDataCount>

  for (const category of CATEGORIES) {
    let withData = 0
    for (const panel of category.panels) {
      const value = props[panel.propKey]
      if (panel.isNullable) {
        if (hasRealData(value)) withData++
      } else {
        if (Array.isArray(value) && value.length > 0) {
          withData++
        }
      }
    }
    result[category.id] = { withData, total: category.panels.length }
  }

  return result
}
