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
  | 'gene'

/** Discovery workbench data-tier (design §4.2). */
export type PanelTier = 'core' | 'supporting' | 'experimental'

export interface PanelDef {
  id: string
  title: string
  propKey: string
  isNullable: boolean
  /** Core = always-on decision surface; Supporting = never block; Experimental = stubs / NIH HI / scrape-heavy */
  tier: PanelTier
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

/**
 * Molecule profile categories only (excludes `gene`, which is gene-explorer only).
 * Use this for overlay progress, tiered loads, and molecule profile tabs.
 */
export const MOLECULE_CATEGORY_IDS: CategoryId[] = [
  'pharmaceutical',
  'clinical-safety',
  'molecular-chemical',
  'bioactivity-targets',
  'protein-structure',
  'genomics-disease',
  'interactions-pathways',
  'research-literature',
  'nih-high-impact',
]

export function isMoleculeCategoryId(id: string): id is CategoryId {
  return (MOLECULE_CATEGORY_IDS as string[]).includes(id)
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'pharmaceutical',
    label: 'Pharmaceutical',
    icon: '💊',
    panels: [
      { id: 'companies', title: 'Companies', propKey: 'companies', isNullable: false, tier: 'supporting' },
      { id: 'ndc', title: 'NDC', propKey: 'ndcProducts', isNullable: false, tier: 'supporting' },
      { id: 'orange-book', title: 'OrangeBook', propKey: 'orangeBookEntries', isNullable: false, tier: 'supporting' },
      {
        id: 'health-canada',
        title: 'HealthCanadaDPD',
        propKey: 'healthCanadaProducts',
        isNullable: true,
        tier: 'supporting',
      },
      {
        id: 'ema-medicines',
        title: 'EmaMedicines',
        propKey: 'emaMedicines',
        isNullable: true,
        tier: 'supporting',
      },
      {
        id: 'biologics-licensed',
        title: 'BiologicsLicensed',
        propKey: 'biologicsLicensed',
        isNullable: true,
        tier: 'supporting',
      },
      {
        id: 'international-regulators',
        title: 'InternationalRegulators',
        propKey: 'internationalRegulatorLinks',
        isNullable: true,
        tier: 'supporting',
      },
      { id: 'nadac', title: 'NADAC', propKey: 'drugPrices', isNullable: false, tier: 'supporting' },
      { id: 'drug-interactions', title: 'DrugInteractions', propKey: 'drugInteractions', isNullable: false, tier: 'core' },
      { id: 'dailymed', title: 'DailyMed', propKey: 'drugLabels', isNullable: false, tier: 'core' },
      { id: 'atc', title: 'ATC', propKey: 'atcClassifications', isNullable: false, tier: 'supporting' },
      { id: 'drugcentral', title: 'DrugCentral', propKey: 'drugCentralEnhanced', isNullable: true, tier: 'supporting' },
      { id: 'gsrs', title: 'GSRS (UNII)', propKey: 'gsrsSubstances', isNullable: true, tier: 'supporting' },

      { id: 'pharmgkb', title: 'PharmGKB', propKey: 'pharmgkbDrugs', isNullable: true, tier: 'supporting' },
      { id: 'cpic', title: 'CPIC', propKey: 'cpicGuidelines', isNullable: true, tier: 'supporting' },

    ],
  },
  {
    id: 'clinical-safety',
    label: 'Clinical & Safety',
    icon: '🏥',
    panels: [
      { id: 'clinical-trials', title: 'ClinicalTrials', propKey: 'clinicalTrials', isNullable: false, tier: 'core' },
      { id: 'isrctn', title: 'ISRCTN', propKey: 'isrctnTrials', isNullable: true, tier: 'supporting' },
      { id: 'adverse-events', title: 'AdverseEvents', propKey: 'adverseEvents', isNullable: false, tier: 'core' },
      { id: 'recalls', title: 'Recalls', propKey: 'drugRecalls', isNullable: false, tier: 'core' },
      { id: 'chembl-indications', title: 'ChemblIndications', propKey: 'chemblIndications', isNullable: false, tier: 'core' },
      { id: 'clinvar', title: 'ClinVar', propKey: 'clinVarVariants', isNullable: false, tier: 'supporting' },
      { id: 'drug-shortages', title: 'DrugShortages', propKey: 'drugShortages', isNullable: true, tier: 'supporting' },
      { id: 'therapeutic-landscape', title: 'TherapeuticLandscape', propKey: 'therapeuticLandscape', isNullable: true, tier: 'supporting' },
      { id: 'gwas', title: 'GwasCatalog', propKey: 'gwasAssociations', isNullable: false, tier: 'supporting' },
      { id: 'toxcast', title: 'ToxCast', propKey: 'toxcast', isNullable: true, tier: 'supporting' },
      { id: 'sider', title: 'SIDER', propKey: 'siderSideEffects', isNullable: true, tier: 'supporting' },
      { id: 'iris', title: 'IRIS', propKey: 'irisAssessments', isNullable: true, tier: 'supporting' },
    ],
  },
  {
    id: 'molecular-chemical',
    label: 'Molecular & Chemical',
    icon: '🧪',
    panels: [
      { id: 'properties', title: 'Properties', propKey: 'computedProperties', isNullable: true, tier: 'core' },
      { id: 'hazards', title: 'Hazards', propKey: 'ghsHazards', isNullable: true, tier: 'supporting' },
      { id: 'chebi', title: 'CheBI', propKey: 'chebiAnnotation', isNullable: true, tier: 'supporting' },
      { id: 'comptox', title: 'CompTox', propKey: 'compToxData', isNullable: true, tier: 'supporting' },
      { id: 'synthesis', title: 'Synthesis', propKey: 'routes', isNullable: false, tier: 'supporting' },
      { id: 'metabolomics', title: 'Metabolomics', propKey: 'metabolomicsData', isNullable: true, tier: 'supporting' },
      { id: 'mychem', title: 'MyChem', propKey: 'myChemAnnotations', isNullable: true, tier: 'supporting' },
      { id: 'hmdb', title: 'HMDB', propKey: 'hmdbMetabolites', isNullable: true, tier: 'supporting' },
      { id: 'massbank', title: 'MassBank', propKey: 'massBankSpectra', isNullable: true, tier: 'supporting' },
      { id: 'chemspider', title: 'ChemSpider', propKey: 'chemSpiderCompounds', isNullable: true, tier: 'experimental' },
      { id: 'metabolights', title: 'MetaboLights', propKey: 'metabolightsData', isNullable: true, tier: 'supporting' },
      { id: 'gnps', title: 'GNPS', propKey: 'gnpsData', isNullable: true, tier: 'supporting' },
      { id: 'lipidmaps', title: 'LIPID MAPS', propKey: 'lipidMapsLipids', isNullable: true, tier: 'supporting' },
      { id: 'unichem', title: 'UniChem', propKey: 'unichemMappings', isNullable: true, tier: 'core' },
      { id: 'foodb', title: 'FooDB', propKey: 'foodbCompounds', isNullable: true, tier: 'experimental' },
    ],
  },
  {
    id: 'bioactivity-targets',
    label: 'Bioactivity & Targets',
    icon: '🎯',
    panels: [
      { id: 'chembl', title: 'ChEMBL', propKey: 'chemblActivities', isNullable: false, tier: 'core' },
      { id: 'bioassay', title: 'BioAssay', propKey: 'bioAssays', isNullable: false, tier: 'supporting' },
      { id: 'chembl-mechanisms', title: 'ChemblMechanisms', propKey: 'chemblMechanisms', isNullable: false, tier: 'core' },
      { id: 'iuphar', title: 'IUPHAR', propKey: 'pharmacologyTargets', isNullable: false, tier: 'supporting' },
      { id: 'bindingdb', title: 'BindingDB', propKey: 'bindingAffinities', isNullable: false, tier: 'supporting' },
      { id: 'pharos', title: 'Pharos', propKey: 'pharosTargets', isNullable: false, tier: 'supporting' },
      { id: 'dgidb', title: 'DGIdb', propKey: 'drugGeneInteractions', isNullable: false, tier: 'core' },
      { id: 'opentargets', title: 'OpenTargets', propKey: 'diseaseAssociations', isNullable: false, tier: 'core' },
      { id: 'ctd', title: 'CTD', propKey: 'ctdInteractions', isNullable: true, tier: 'supporting' },
      { id: 'iedb', title: 'IEDB', propKey: 'iedbEpitopes', isNullable: true, tier: 'supporting' },
      { id: 'lincs', title: 'LINCS L1000', propKey: 'lincsSignatures', isNullable: true, tier: 'supporting' },
      /** Disabled (no public API) — still listed as next work target with tooltip */
      { id: 'ttd', title: 'TTD', propKey: 'ttdTargets', isNullable: true, tier: 'experimental' },
    ],
  },
  {
    id: 'protein-structure',
    label: 'Protein & Structure',
    icon: '🧬',
    panels: [
      { id: 'uniprot', title: 'UniProt', propKey: 'uniprotEntries', isNullable: false, tier: 'core' },
      { id: 'uniprot-extended', title: 'UniProtExtended', propKey: 'uniprotProteins', isNullable: true, tier: 'supporting' },
      { id: 'interpro', title: 'InterPro', propKey: 'proteinDomains', isNullable: false, tier: 'supporting' },
      { id: 'ebi-proteins', title: 'EbiProteins', propKey: 'ebiProteinVariations', isNullable: true, tier: 'supporting' },
      { id: 'ebi-proteomics', title: 'EbiProteomics', propKey: 'ebiProteomicsData', isNullable: true, tier: 'supporting' },
      { id: 'ebi-crossrefs', title: 'EbiCrossRefs', propKey: 'ebiCrossReferences', isNullable: true, tier: 'supporting' },
      { id: 'protein-atlas', title: 'ProteinAtlas', propKey: 'proteinAtlasEntries', isNullable: false, tier: 'supporting' },
      { id: 'human-protein-atlas', title: 'Human Protein Atlas', propKey: 'humanProteinAtlas', isNullable: true, tier: 'supporting' },
      { id: 'quickgo', title: 'QuickGO', propKey: 'goAnnotations', isNullable: false, tier: 'supporting' },
      { id: 'pdb', title: 'PDB', propKey: 'pdbStructures', isNullable: false, tier: 'supporting' },
      { id: 'pdbe-ligands', title: 'PdbeLigands', propKey: 'pdbeLigands', isNullable: false, tier: 'supporting' },
      { id: 'alphafold', title: 'AlphaFold', propKey: 'alphaFoldPredictions', isNullable: false, tier: 'supporting' },
      { id: 'peptideatlas', title: 'PeptideAtlas', propKey: 'peptideAtlasEntries', isNullable: true, tier: 'supporting' },
      { id: 'pride', title: 'PRIDE', propKey: 'prideProjects', isNullable: true, tier: 'supporting' },
      { id: 'cath', title: 'CATH', propKey: 'cathData', isNullable: true, tier: 'supporting' },

      { id: 'sabdab', title: 'SAbDab', propKey: 'sabdabEntries', isNullable: true, tier: 'experimental' },
    ],
  },
  {
    id: 'genomics-disease',
    label: 'Genomics & Disease',
    icon: '🧫',
    panels: [
      { id: 'gene-info', title: 'GeneInfo', propKey: 'geneInfo', isNullable: false, tier: 'supporting' },
      { id: 'ensembl', title: 'Ensembl', propKey: 'ensemblGenes', isNullable: false, tier: 'supporting' },
      { id: 'expression-atlas', title: 'ExpressionAtlas', propKey: 'geneExpressions', isNullable: false, tier: 'supporting' },
      { id: 'gtex', title: 'GTEx', propKey: 'gtexExpressions', isNullable: true, tier: 'supporting' },
      { id: 'geo', title: 'GEO', propKey: 'geoDatasets', isNullable: true, tier: 'supporting' },
      { id: 'dbsnp', title: 'dbSNP', propKey: 'dbSnpVariants', isNullable: true, tier: 'supporting' },
      { id: 'clingen', title: 'ClinGen', propKey: 'clinGenData', isNullable: true, tier: 'supporting' },
      { id: 'medgen', title: 'MedGen', propKey: 'medGenConcepts', isNullable: true, tier: 'supporting' },
      { id: 'monarch', title: 'Monarch', propKey: 'monarchDiseases', isNullable: false, tier: 'supporting' },
      { id: 'nci-thesaurus', title: 'NciThesaurus', propKey: 'nciConcepts', isNullable: false, tier: 'supporting' },
      { id: 'mesh', title: 'MeSH', propKey: 'meshTerms', isNullable: false, tier: 'supporting' },
      { id: 'go', title: 'GeneOntology', propKey: 'goTerms', isNullable: true, tier: 'supporting' },
      { id: 'hpo', title: 'HPO', propKey: 'hpoTerms', isNullable: true, tier: 'supporting' },
      { id: 'ols', title: 'OLS', propKey: 'olsTerms', isNullable: true, tier: 'supporting' },
      { id: 'disgenet', title: 'DisGeNET', propKey: 'disgenetAssociations', isNullable: true, tier: 'supporting' },
      { id: 'orphanet', title: 'Orphanet', propKey: 'orphanetDiseases', isNullable: true, tier: 'supporting' },
      { id: 'mygene', title: 'MyGene', propKey: 'myGeneAnnotations', isNullable: true, tier: 'supporting' },
      { id: 'bgee', title: 'Bgee', propKey: 'bgeeExpressions', isNullable: true, tier: 'supporting' },
      { id: 'omim', title: 'OMIM', propKey: 'omimEntries', isNullable: true, tier: 'supporting' },
      { id: 'biomodels', title: 'BioModels', propKey: 'bioModelsModels', isNullable: true, tier: 'supporting' },
      { id: 'biosamples', title: 'BioSamples', propKey: 'bioSamples', isNullable: true, tier: 'supporting' },
      { id: 'massive', title: 'MassIVE', propKey: 'massiveDatasets', isNullable: true, tier: 'supporting' },
    ],
  },
  {
    id: 'interactions-pathways',
    label: 'Interactions & Pathways',
    icon: '🔗',
    panels: [
      { id: 'string', title: 'STRING', propKey: 'proteinInteractions', isNullable: false, tier: 'supporting' },
      { id: 'stitch', title: 'STITCH', propKey: 'chemicalProteinInteractions', isNullable: false, tier: 'supporting' },
      { id: 'intact', title: 'IntAct', propKey: 'molecularInteractions', isNullable: false, tier: 'supporting' },
      { id: 'reactome', title: 'Reactome', propKey: 'reactomePathways', isNullable: false, tier: 'supporting' },
      { id: 'wikipathways', title: 'WikiPathways', propKey: 'wikiPathways', isNullable: false, tier: 'supporting' },
      { id: 'pathway-commons', title: 'PathwayCommons', propKey: 'pathwayCommonsResults', isNullable: false, tier: 'supporting' },
      { id: 'biocyc', title: 'BioCyc', propKey: 'bioCycPathways', isNullable: true, tier: 'supporting' },
      { id: 'smpdb', title: 'SMPDB', propKey: 'smpdbPathways', isNullable: true, tier: 'supporting' },
      { id: 'ctd-diseases', title: 'CTDDiseases', propKey: 'ctdDiseaseAssociations', isNullable: true, tier: 'supporting' },
      { id: 'kegg', title: 'KEGG', propKey: 'keggData', isNullable: true, tier: 'supporting' },
    ],
  },
  {
    id: 'nih-high-impact',
    label: 'NIH High-Impact',
    icon: '🏥',
    panels: [
      { id: 'nci-cadsr', title: 'NCI caDSR', propKey: 'cadsrData', isNullable: true, tier: 'experimental' },
      { id: 'ncats-translator', title: 'NCATS Translator', propKey: 'translatorData', isNullable: true, tier: 'experimental' },
      { id: 'nhgri-anvil', title: 'NHGRI AnVIL', propKey: 'anvilData', isNullable: true, tier: 'experimental' },
      { id: 'niaid-immport', title: 'NIAID ImmPort', propKey: 'immPortData', isNullable: true, tier: 'experimental' },
      { id: 'ninds-neurommsig', title: 'NINDS NeuroMMSig', propKey: 'neuroMMSigData', isNullable: true, tier: 'experimental' },
    ],
  },
  {
    id: 'research-literature',
    label: 'Research & Literature',
    icon: '📚',
    panels: [
      { id: 'nih-reporter', title: 'NIHReporter', propKey: 'nihGrants', isNullable: false, tier: 'supporting' },
      {
        id: 'openaire-projects',
        title: 'OpenAIREProjects',
        propKey: 'openAireProjects',
        isNullable: true,
        tier: 'supporting',
      },
      {
        id: 'openaire-publications',
        title: 'OpenAIREPublications',
        propKey: 'openAirePublications',
        isNullable: true,
        tier: 'supporting',
      },
      { id: 'patents', title: 'Patents', propKey: 'patents', isNullable: false, tier: 'supporting' },
      { id: 'sec', title: 'SEC', propKey: 'secFilings', isNullable: false, tier: 'supporting' },
      { id: 'literature', title: 'Literature', propKey: 'literature', isNullable: false, tier: 'core' },
      { id: 'pubmed', title: 'PubMed', propKey: 'pubmedArticles', isNullable: false, tier: 'core' },
      { id: 'semantic-scholar', title: 'SemanticScholar', propKey: 'semanticPapers', isNullable: false, tier: 'supporting' },
      { id: 'open-alex', title: 'OpenAlex', propKey: 'openAlexWorks', isNullable: false, tier: 'supporting' },
      { id: 'open-citations', title: 'OpenCitations', propKey: 'citationMetrics', isNullable: false, tier: 'supporting' },
      { id: 'crossref', title: 'CrossRef', propKey: 'crossRefWorks', isNullable: true, tier: 'supporting' },
      { id: 'arxiv', title: 'arXiv', propKey: 'arxivPapers', isNullable: true, tier: 'supporting' },
    ],
  },
  {
    id: 'gene',
    label: 'Gene',
    icon: '🧬',
    panels: [
      { id: 'gene-overview', title: 'GeneOverview', propKey: 'geneOverview', isNullable: false, tier: 'supporting' },
      { id: 'gene_drugs', title: 'TargetedDrugs', propKey: 'geneDrugs', isNullable: true, tier: 'supporting' },
      { id: 'gene-diseases', title: 'GeneDiseases', propKey: 'geneDiseases', isNullable: true, tier: 'supporting' },
      { id: 'gene-variants', title: 'GeneVariants', propKey: 'geneVariants', isNullable: true, tier: 'supporting' },
      { id: 'gene-expression', title: 'GeneExpression', propKey: 'geneExpressionData', isNullable: true, tier: 'supporting' },
      { id: 'gene-pathways', title: 'GenePathways', propKey: 'genePathways', isNullable: true, tier: 'supporting' },
    ],
  },
]

/** Categories shown on molecule profile (never the gene-only explorer category). */
export const MOLECULE_CATEGORIES: CategoryDef[] = CATEGORIES.filter((c) => c.id !== 'gene')

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
