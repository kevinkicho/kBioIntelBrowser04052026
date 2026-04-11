/* eslint-disable @typescript-eslint/no-unused-vars */
// Fetcher functions require (name, synonyms, limit, offset) signature but not all use every param
import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getCached, setCache } from '@/lib/cache'
import { LIMITS } from '@/lib/api-limits'

// Panel-specific imports - only what's used in PANEL_CONFIG
import { getDrugsByIngredient } from '@/lib/api/openfda'
import { getNdcProductsByName } from '@/lib/api/fda-ndc'
import { getOrangeBookByName } from '@/lib/api/orangebook'
import { getDrugPricesByName } from '@/lib/api/nadac'
import { getDrugInteractionsByName } from '@/lib/api/rxnorm'
import { getDrugLabelsByName } from '@/lib/api/dailymed'
import { getAtcClassificationsByName } from '@/lib/api/atc'

import { getDrugCentralData } from '@/lib/api/drugcentral'

import { getPharmGKBData } from '@/lib/api/pharmgkb'
import { getCPICData } from '@/lib/api/cpic'


import { getClinicalTrialsByName } from '@/lib/api/clinicaltrials'
import { searchISRCTN } from '@/lib/api/isrctn'
import { getAdverseEventsByName } from '@/lib/api/adverseevents'
import { getDrugRecallsByName } from '@/lib/api/recalls'
import { getChemblIndicationsByName } from '@/lib/api/chembl-indications'
import { getClinVarVariantsByName } from '@/lib/api/clinvar'
import { getGwasAssociationsByName } from '@/lib/api/gwas-catalog'
import { getToxCastData } from '@/lib/api/toxcast'
import { getSIDERData } from '@/lib/api/sider'

import { getChemblActivitiesByName } from '@/lib/api/chembl'
import { getBioAssaysByName } from '@/lib/api/bioassay'
import { getChemblMechanismsByName } from '@/lib/api/chembl-mechanisms'
import { getPharmacologyTargetsByName } from '@/lib/api/iuphar'
import { getBindingAffinitiesByName } from '@/lib/api/bindingdb'
import { getPharosTargetsByName } from '@/lib/api/pharos'
import { getDrugGeneInteractionsByName } from '@/lib/api/dgidb'
import { getDiseaseAssociationsByName } from '@/lib/api/opentargets'
import { getCTDData } from '@/lib/api/ctd'
import { getIEDBData } from '@/lib/api/iedb'
import { searchIRIS } from '@/lib/api/iris'

import { getUniprotEntriesByName } from '@/lib/api/uniprot'
import { getPdbStructuresByName } from '@/lib/api/pdb'
import { getAlphaFoldPredictions } from '@/lib/api/alphafold'
import { getProteinDomains } from '@/lib/api/interpro'
import { getProteinFeaturesByAccessions } from '@/lib/api/ebi-proteins'
import { getProteinAtlasBySymbols } from '@/lib/api/protein-atlas'
import { getGoAnnotationsByAccessions } from '@/lib/api/quickgo'
import { searchPRIDE } from '@/lib/api/pride'
import { searchCATHDomains } from '@/lib/api/cath'

import { searchSAbDab } from '@/lib/api/sabdab'

import { searchPubMed } from '@/lib/api/pubmed'
import { getSemanticPapersByName } from '@/lib/api/semantic-scholar'
import { getOpenAlexWorksByName } from '@/lib/api/openalex'
import { searchCrossRef } from '@/lib/api/crossref'
import { searchArXiv } from '@/lib/api/arxiv'
import { getNihGrantsByName } from '@/lib/api/nihreporter'
import { getPatentsByMoleculeName } from '@/lib/api/patents'
import { getSecFilingsByName } from '@/lib/api/secedgar'
import { getLiteratureByName } from '@/lib/api/europepmc'

import { searchGEO } from '@/lib/api/geo'
import { getDbSNPVariants } from '@/lib/api/dbsnp'
import { getClinGenData } from '@/lib/api/clingen'
import { getMedGenConcepts } from '@/lib/api/medgen'
import { getMonarchDiseasesByName } from '@/lib/api/monarch'
import { getMeshTermsByName } from '@/lib/api/mesh'
import { getDisGeNetData } from '@/lib/api/disgenet'

import { getProteinInteractionsByName } from '@/lib/api/string-db'
import { getChemicalInteractionsByName } from '@/lib/api/stitch'
import { getMolecularInteractionsByName } from '@/lib/api/intact'
import { getReactomePathwaysByName } from '@/lib/api/reactome'
import { getWikiPathwaysByName } from '@/lib/api/wikipathways'
import { getPathwayCommonsByName } from '@/lib/api/pathway-commons'
import { searchBioCyc } from '@/lib/api/biocyc'
import { searchSMPDB } from '@/lib/api/smpdb'
import { getKEGGData } from '@/lib/api/kegg'

import { searchMassBank } from '@/lib/api/massbank'
import { searchChemSpider } from '@/lib/api/chemspider'
import { searchMetaboLights } from '@/lib/api/metabolights'
import { searchGNPSLibrary, searchGNPSNetworks } from '@/lib/api/gnps'

// Additional APIs for expanded coverage
import { getBgeeData } from '@/lib/api/bgee'
import { getEnsemblGenesBySymbols } from '@/lib/api/ensembl'
import { getHMDBData } from '@/lib/api/hmdb'
import { getOMIMData } from '@/lib/api/omim'
import { getOrphanetData } from '@/lib/api/orphanet'
import { getGeneInfoByName } from '@/lib/api/ncbi-gene'
import { getGeneExpressionBySymbols } from '@/lib/api/expression-atlas'
import { getCompToxByName } from '@/lib/api/comptox'
import { getPeptideAtlasData } from '@/lib/api/peptideatlas'
import { getPdbeLigandsByName } from '@/lib/api/pdbe-ligands'
import { getCitationMetrics } from '@/lib/api/opencitations'
import { getRheaSynthesisRoutes } from '@/lib/api/rhea'
import { getChebiAnnotationByName } from '@/lib/api/chebi'
import { getMyChemData } from '@/lib/api/mychem'
import { getMyGeneData } from '@/lib/api/mygene'
import { getNciConceptsByName } from '@/lib/api/nci-thesaurus'
import { getMetabolomicsData } from '@/lib/api/metabolomics'

/**
 * Panel API Configuration
 * Maps panel IDs to their fetch functions and limits
 */
const PANEL_CONFIG: Record<string, {
  fetcher: (name: string, synonyms: string[], limit: number, offset: number) => Promise<PanelResponse<unknown>>
  category: string
  limitKey: keyof typeof LIMITS
}> = {
  // Pharmaceutical
  'companies': {
    category: 'pharmaceutical',
    limitKey: 'OPENFDA',
    fetcher: async (name, synonyms, limit) => {
      const searchTerms = [name, ...synonyms.slice(0, 1)]
      const results = await Promise.all(searchTerms.map(t => getDrugsByIngredient(t, limit)))
      const seen = new Set<string>()
      const companies = results.flat().filter(p => {
        if (seen.has(p.brandName)) return false
        seen.add(p.brandName)
        return true
      })
      return { data: companies, total: companies.length, hasMore: false }
    }
  },
  // Clinical & Safety
  'clinicalTrials': {
    category: 'clinical-safety',
    limitKey: 'CLINICAL_TRIALS',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getClinicalTrialsByName(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'isrctnTrials': {
    category: 'clinical-safety',
    limitKey: 'ISRCTN',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchISRCTN(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'adverseEvents': {
    category: 'clinical-safety',
    limitKey: 'ADVERSE_EVENTS',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getAdverseEventsByName(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  // Bioactivity & Targets
  'chemblActivities': {
    category: 'bioactivity-targets',
    limitKey: 'CHEMBL',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getChemblActivitiesByName(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'bioAssays': {
    category: 'bioactivity-targets',
    limitKey: 'PUBCHEM_BIOASSAY',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getBioAssaysByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  // Protein & Structure
  'uniprotEntries': {
    category: 'protein-structure',
    limitKey: 'UNIPROT',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getUniprotEntriesByName(name)
      return { data: data.slice(0, limit), total: data.length, hasMore: data.length > limit }
    }
  },
  'pdbStructures': {
    category: 'protein-structure',
    limitKey: 'PDB',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getPdbStructuresByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'prideProjects': {
    category: 'protein-structure',
    limitKey: 'PRIDE',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchPRIDE(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  // Research & Literature
  'pubmedArticles': {
    category: 'research-literature',
    limitKey: 'PUBMED',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchPubMed(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'semanticPapers': {
    category: 'research-literature',
    limitKey: 'SEMANTIC_SCHOLAR',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getSemanticPapersByName(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'openAlexWorks': {
    category: 'research-literature',
    limitKey: 'OPEN_ALEX',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getOpenAlexWorksByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'crossRefWorks': {
    category: 'research-literature',
    limitKey: 'CROSSREF',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchCrossRef(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'arxivPapers': {
    category: 'research-literature',
    limitKey: 'ARXIV',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchArXiv(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  // Genomics & Disease
  'geoDatasets': {
    category: 'genomics-disease',
    limitKey: 'GEO',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchGEO(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'dbSnpVariants': {
    category: 'genomics-disease',
    limitKey: 'DBSNP',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getDbSNPVariants(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  // Interactions & Pathways
  'proteinInteractions': {
    category: 'interactions-pathways',
    limitKey: 'STRING',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getProteinInteractionsByName(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'reactomePathways': {
    category: 'interactions-pathways',
    limitKey: 'REACTOME',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getReactomePathwaysByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'wikiPathways': {
    category: 'interactions-pathways',
    limitKey: 'WIKI_PATHWAYS',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getWikiPathwaysByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  // Molecular & Chemical
  'massBankSpectra': {
    category: 'molecular-chemical',
    limitKey: 'MASSBANK',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchMassBank(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'chemSpiderCompounds': {
    category: 'molecular-chemical',
    limitKey: 'CHEMSPIDER',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchChemSpider(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'metabolightsStudies': {
    category: 'molecular-chemical',
    limitKey: 'METABOLIGHTS',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchMetaboLights(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },

  // === Pharmaceutical (additional) ===
  'ndcProducts': {
    category: 'pharmaceutical',
    limitKey: 'FDA_NDC',
    fetcher: async (name, synonyms, limit) => {
      const searchTerms = [name, ...synonyms.slice(0, 2)]
      const results = await Promise.all(searchTerms.map(t => getNdcProductsByName(t)))
      const seen = new Set<string>()
      const allProducts = results.flat().filter(p => {
        if (seen.has(p.productNdc)) return false
        seen.add(p.productNdc)
        return true
      })
      return { data: allProducts.slice(0, limit), total: allProducts.length, hasMore: allProducts.length > limit }
    }
  },
  'orangeBook': {
    category: 'pharmaceutical',
    limitKey: 'ORANGE_BOOK',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getOrangeBookByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'drugPrices': {
    category: 'pharmaceutical',
    limitKey: 'NADAC',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getDrugPricesByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'drugInteractions': {
    category: 'pharmaceutical',
    limitKey: 'RXNORM',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getDrugInteractionsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'drugLabels': {
    category: 'pharmaceutical',
    limitKey: 'DAILYMED',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getDrugLabelsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'atcClassifications': {
    category: 'pharmaceutical',
    limitKey: 'ATC',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getAtcClassificationsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },

  'drugCentral': {
    category: 'pharmaceutical',
    limitKey: 'DRUGCENTRAL',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getDrugCentralData(name)
      // Return as array for consistent panel handling
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },

  'pharmgkb': {
    category: 'pharmaceutical',
    limitKey: 'PHARMGKB',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getPharmGKBData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'cpic': {
    category: 'pharmaceutical',
    limitKey: 'CPIC',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getCPICData(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },


  // === Clinical & Safety (additional) ===
  'drugRecalls': {
    category: 'clinical-safety',
    limitKey: 'RECALLS',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getDrugRecallsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'chemblIndications': {
    category: 'clinical-safety',
    limitKey: 'CHEMBL',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getChemblIndicationsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'clinVarVariants': {
    category: 'clinical-safety',
    limitKey: 'CLINVAR',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getClinVarVariantsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'gwasAssociations': {
    category: 'clinical-safety',
    limitKey: 'GWAS',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getGwasAssociationsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'toxcastData': {
    category: 'clinical-safety',
    limitKey: 'TOXCAST',
    fetcher: async (name, _synonyms, limit) => {
      const result = await getToxCastData(name)
      const data = result ? [result].slice(0, limit) : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'siderData': {
    category: 'clinical-safety',
    limitKey: 'SIDER',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getSIDERData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'irisAssessments': {
    category: 'clinical-safety',
    limitKey: 'IRIS',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchIRIS(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },

  // === Bioactivity & Targets (additional) ===
  'chemblMechanisms': {
    category: 'bioactivity-targets',
    limitKey: 'CHEMBL',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getChemblMechanismsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'pharmacologyTargets': {
    category: 'bioactivity-targets',
    limitKey: 'IUPHAR',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getPharmacologyTargetsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'bindingAffinities': {
    category: 'bioactivity-targets',
    limitKey: 'BINDING_DB',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getBindingAffinitiesByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'pharosTargets': {
    category: 'bioactivity-targets',
    limitKey: 'PHAROS',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getPharosTargetsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'drugGeneInteractions': {
    category: 'bioactivity-targets',
    limitKey: 'DGIDB',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getDrugGeneInteractionsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'diseaseAssociations': {
    category: 'bioactivity-targets',
    limitKey: 'OPEN_TARGETS',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getDiseaseAssociationsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'ctdData': {
    category: 'bioactivity-targets',
    limitKey: 'CTD',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getCTDData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'iedbData': {
    category: 'bioactivity-targets',
    limitKey: 'IEDB',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getIEDBData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },

  // === Protein & Structure (additional) ===
  'alphaFoldPredictions': {
    category: 'protein-structure',
    limitKey: 'ALPHA_FOLD',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getAlphaFoldPredictions([name])
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'proteinDomains': {
    category: 'protein-structure',
    limitKey: 'INTER_PRO',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getProteinDomains([name])
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'proteinFeatures': {
    category: 'protein-structure',
    limitKey: 'EBI_PROTEINS',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getProteinFeaturesByAccessions([name])
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'proteinAtlasEntries': {
    category: 'protein-structure',
    limitKey: 'PROTEIN_ATLAS',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getProteinAtlasBySymbols([name])
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'goAnnotations': {
    category: 'protein-structure',
    limitKey: 'QUICKGO',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getGoAnnotationsByAccessions([name])
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'cathDomains': {
    category: 'protein-structure',
    limitKey: 'CATH',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchCATHDomains(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },

  'sabdabEntries': {
    category: 'protein-structure',
    limitKey: 'SABDAB',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchSAbDab(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },

  // === Research & Literature (additional) ===
  'nihGrants': {
    category: 'research-literature',
    limitKey: 'NIH_REPORTER',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getNihGrantsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'patents': {
    category: 'research-literature',
    limitKey: 'PATENTS',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getPatentsByMoleculeName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'secFilings': {
    category: 'research-literature',
    limitKey: 'SEC_EDGAR',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getSecFilingsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'literature': {
    category: 'research-literature',
    limitKey: 'EUROPE_PMC',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getLiteratureByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },

  // === Genomics & Disease (additional) ===
  'clinGenData': {
    category: 'genomics-disease',
    limitKey: 'CLINGEN',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getClinGenData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'medGenConcepts': {
    category: 'genomics-disease',
    limitKey: 'MEDGEN',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getMedGenConcepts(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'monarchDiseases': {
    category: 'genomics-disease',
    limitKey: 'MONARCH',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getMonarchDiseasesByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'meshTerms': {
    category: 'genomics-disease',
    limitKey: 'MESH',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getMeshTermsByName(name)
      return { data: data.slice(0, limit), total: data.length, hasMore: data.length > limit }
    }
  },
  'disgenetData': {
    category: 'genomics-disease',
    limitKey: 'DISGENET',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getDisGeNetData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },

  // === Interactions & Pathways (additional) ===
  'chemicalProteinInteractions': {
    category: 'interactions-pathways',
    limitKey: 'STITCH',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getChemicalInteractionsByName(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'molecularInteractions': {
    category: 'interactions-pathways',
    limitKey: 'INTACT',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getMolecularInteractionsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'pathwayCommons': {
    category: 'interactions-pathways',
    limitKey: 'PATHWAY_COMMONS',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getPathwayCommonsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },
  'bioCycPathways': {
    category: 'interactions-pathways',
    limitKey: 'BIOCYC',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchBioCyc(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'smpdbPathways': {
    category: 'interactions-pathways',
    limitKey: 'SMPDB',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchSMPDB(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'keggData': {
    category: 'interactions-pathways',
    limitKey: 'KEGG',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getKEGGData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },

  // === Molecular & Chemical (additional) ===
  'gnpsLibrary': {
    category: 'molecular-chemical',
    limitKey: 'GNPS',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchGNPSLibrary(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },
  'gnpsNetworks': {
    category: 'molecular-chemical',
    limitKey: 'GNPS',
    fetcher: async (name, _synonyms, limit) => {
      const data = await searchGNPSNetworks(name, limit)
      return { data, total: data.length, hasMore: data.length === limit }
    }
  },

  // === Genomics & Expression (additional) ===
  'bgeeExpression': {
    category: 'genomics-disease',
    limitKey: 'BGEE',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getBgeeData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'ensemblGenes': {
    category: 'genomics-disease',
    limitKey: 'ENSEMBL',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getEnsemblGenesBySymbols([name])
      return { data: data.slice(0, limit), total: data.length, hasMore: data.length > limit }
    }
  },
  'omimData': {
    category: 'genomics-disease',
    limitKey: 'OMIM',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getOMIMData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'orphanetData': {
    category: 'genomics-disease',
    limitKey: 'ORPHANET',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getOrphanetData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'ncbiGene': {
    category: 'genomics-disease',
    limitKey: 'NCBI_GENE',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getGeneInfoByName(name)
      return { data: data.slice(0, limit), total: data.length, hasMore: data.length > limit }
    }
  },
  'expressionAtlas': {
    category: 'genomics-disease',
    limitKey: 'EXPRESSION_ATLAS',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getGeneExpressionBySymbols([name])
      return { data: data.slice(0, limit), total: data.length, hasMore: data.length > limit }
    }
  },

  // === Metabolomics (additional) ===
  'hmdbData': {
    category: 'molecular-chemical',
    limitKey: 'HMDB',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getHMDBData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'metabolomicsData': {
    category: 'molecular-chemical',
    limitKey: 'METABOLOMICS',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getMetabolomicsData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'chebiData': {
    category: 'molecular-chemical',
    limitKey: 'CHEBI',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getChebiAnnotationByName(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'myChemData': {
    category: 'molecular-chemical',
    limitKey: 'MY_CHEM',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getMyChemData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },

  // === Protein & Structure (additional) ===
  'pdbeLigands': {
    category: 'protein-structure',
    limitKey: 'PDBE_LIGANDS',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getPdbeLigandsByName(name)
      return { data: data.slice(0, limit), total: data.length, hasMore: data.length > limit }
    }
  },
  'peptideAtlas': {
    category: 'protein-structure',
    limitKey: 'PEPTIDE_ATLAS',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getPeptideAtlasData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },

  // === Research & Literature (additional) ===
  'openCitations': {
    category: 'research-literature',
    limitKey: 'OPEN_CITATIONS',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getCitationMetrics([name])
      return { data: data.slice(0, limit), total: data.length, hasMore: data.length > limit }
    }
  },

  // === Bioactivity (additional) ===
  'myGeneData': {
    category: 'bioactivity-targets',
    limitKey: 'MY_GENE',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getMyGeneData(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'compToxData': {
    category: 'bioactivity-targets',
    limitKey: 'COMP_TOX',
    fetcher: async (name, _synonyms, _limit) => {
      const result = await getCompToxByName(name)
      const data = result ? [result] : []
      return { data, total: data.length, hasMore: false }
    }
  },
  'nciThesaurus': {
    category: 'bioactivity-targets',
    limitKey: 'NCI_THESAURUS',
    fetcher: async (name, _synonyms, limit) => {
      const allData = await getNciConceptsByName(name)
      const data = allData.slice(0, limit)
      return { data, total: allData.length, hasMore: allData.length > limit }
    }
  },

  // === Pathways (additional) ===
  'rheaReactions': {
    category: 'interactions-pathways',
    limitKey: 'RHEA',
    fetcher: async (name, _synonyms, limit) => {
      const data = await getRheaSynthesisRoutes(name)
      return { data: data.slice(0, limit), total: data.length, hasMore: data.length > limit }
    }
  },
}

interface PanelResponse<T> {
  data: T
  total: number
  hasMore: boolean
  offset?: number
}

/**
 * GET /api/molecule/[id]/panel/[panelId]
 * Fetches a single panel's data with pagination support
 *
 * Query params:
 * - limit: Number of items to fetch (default: from LIMITS config)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; panelId: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const panelId = params.panelId
  const config = PANEL_CONFIG[panelId]
  if (!config) {
    return NextResponse.json({
      error: 'Invalid panel ID',
      availablePanels: Object.keys(PANEL_CONFIG)
    }, { status: 400 })
  }

  // Parse pagination params
  const { searchParams } = new URL(request.url)
  const limitConfig = LIMITS[config.limitKey]
  const defaultInitial = typeof limitConfig === 'object' && 'initial' in limitConfig ? limitConfig.initial : LIMITS.DEFAULT_INITIAL
  const defaultMax = typeof limitConfig === 'object' && 'max' in limitConfig ? limitConfig.max : LIMITS.DEFAULT_MAX

  const limit = Math.min(
    parseInt(searchParams.get('limit') || String(defaultInitial)),
    defaultMax
  )
  const offset = parseInt(searchParams.get('offset') || '0')

  // Get molecule info
  const molecule = await getMoleculeById(cid)
  if (!molecule) {
    return NextResponse.json({ error: 'Molecule not found' }, { status: 404 })
  }

  const name = molecule.name
  const synonyms = molecule.synonyms || []

  // Check cache
  const cacheKey = `panel:${cid}:${panelId}:${limit}:${offset}`
  const cached = getCached<PanelResponse<unknown>>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  // Fetch panel data
  try {
    const result = await config.fetcher(name, synonyms, limit, offset)
    result.offset = offset

    setCache(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error(`Error fetching panel ${panelId}:`, error)
    return NextResponse.json({
      error: 'Failed to fetch panel data',
      panelId,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}