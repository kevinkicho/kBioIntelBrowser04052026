import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getCached, setCache } from '@/lib/cache'
import { safe, withTimeout } from '@/lib/utils'
import { recordMetric } from '@/lib/analytics/db'

// Pharmaceutical
import { getDrugsByIngredient } from '@/lib/api/openfda'
import { getNdcProductsByName } from '@/lib/api/fda-ndc'
import { getOrangeBookByName } from '@/lib/api/orangebook'
import { getDrugPricesByName } from '@/lib/api/nadac'
import { getDrugInteractionsByName } from '@/lib/api/rxnorm'
import { getDrugLabelsByName } from '@/lib/api/dailymed'
import { getAtcClassificationsByName } from '@/lib/api/atc'

import { getDrugCentralEnhanced } from '@/lib/api/drugcentral'
import { searchGSRS } from '@/lib/api/gsrs'

import { getPharmGKBData } from '@/lib/api/pharmgkb'
import { getCPICData } from '@/lib/api/cpic'

// Clinical & Safety
import { getClinicalTrialsByName } from '@/lib/api/clinicaltrials'
import { searchISRCTN } from '@/lib/api/isrctn'
import { getAdverseEventsByName } from '@/lib/api/adverseevents'
import { getDrugRecallsByName } from '@/lib/api/recalls'
import { getChemblIndicationsByName } from '@/lib/api/chembl-indications'
import { getClinVarVariantsByName } from '@/lib/api/clinvar'
import { getGwasAssociationsByName } from '@/lib/api/gwas-catalog'
import { getToxCastData } from '@/lib/api/toxcast'
import { getSIDERData } from '@/lib/api/sider'
import { searchIRIS } from '@/lib/api/iris'

// Molecular & Chemical
import { getComputedPropertiesByCid } from '@/lib/api/pubchem-properties'
import { getGhsHazardsByCid } from '@/lib/api/pubchem-hazards'
import { getChebiAnnotationByName } from '@/lib/api/chebi'
import { getCompToxByName } from '@/lib/api/comptox'
import { getKeggCompoundId, getKeggReactions, getKeggReactionDetail, getKEGGData } from '@/lib/api/kegg'
import { getRheaSynthesisRoutes } from '@/lib/api/rhea'
import { getMetabolomicsData } from '@/lib/api/metabolomics'
import { getMyChemData } from '@/lib/api/mychem'
import { getHMDBData } from '@/lib/api/hmdb'
import { searchMassBank } from '@/lib/api/massbank'
import { searchChemSpider } from '@/lib/api/chemspider'
import { searchMetaboLights } from '@/lib/api/metabolights'
import { searchGNPSLibrary, searchGNPSNetworks } from '@/lib/api/gnps'
import { searchFooDB } from '@/lib/api/foodb'

// Bioactivity & Targets
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

// Protein & Structure (chained: UniProt first)
import { getUniprotEntriesByName } from '@/lib/api/uniprot'
import { getAlphaFoldPredictions } from '@/lib/api/alphafold'
import { getProteinDomains } from '@/lib/api/interpro'
import { getProteinFeaturesByAccessions } from '@/lib/api/ebi-proteins'
import { getProteinAtlasBySymbols } from '@/lib/api/protein-atlas'
import { getGoAnnotationsByAccessions } from '@/lib/api/quickgo'
import { getPdbStructuresByName } from '@/lib/api/pdb'
import { getPdbeLigandsByName } from '@/lib/api/pdbe-ligands'
import { getPeptideAtlasData } from '@/lib/api/peptideatlas'
import { searchPRIDE } from '@/lib/api/pride'
import { searchCATHDomains, searchGene3D } from '@/lib/api/cath'

import { searchSAbDab } from '@/lib/api/sabdab'

// Genomics & Disease (chained: needs gene symbols from UniProt)
import { getGeneInfoByName } from '@/lib/api/ncbi-gene'
import { searchGEO } from '@/lib/api/geo'
import { getDbSNPVariants } from '@/lib/api/dbsnp'
import { getClinGenData } from '@/lib/api/clingen'
import { getMedGenConcepts } from '@/lib/api/medgen'
import { getEnsemblGenesBySymbols } from '@/lib/api/ensembl'
import { getGeneExpressionBySymbols } from '@/lib/api/expression-atlas'
import { getMonarchDiseasesByName } from '@/lib/api/monarch'
import { getNciConceptsByName } from '@/lib/api/nci-thesaurus'
import { getMeshTermsByName } from '@/lib/api/mesh'
import { getDisGeNetData } from '@/lib/api/disgenet'
import { getOrphanetData } from '@/lib/api/orphanet'
import { getMyGeneData } from '@/lib/api/mygene'
import { getBgeeData } from '@/lib/api/bgee'
import { getOMIMData } from '@/lib/api/omim'

// Interactions & Pathways
import { getProteinInteractionsByName } from '@/lib/api/string-db'
import { getChemicalInteractionsByName } from '@/lib/api/stitch'
import { getMolecularInteractionsByName } from '@/lib/api/intact'
import { getReactomePathwaysByName } from '@/lib/api/reactome'
import { getWikiPathwaysByName } from '@/lib/api/wikipathways'
import { getPathwayCommonsByName } from '@/lib/api/pathway-commons'
import { searchBioCyc } from '@/lib/api/biocyc'
import { searchSMPDB } from '@/lib/api/smpdb'

// Research & Literature (chained: Literature first for DOIs)
import { getNihGrantsByName } from '@/lib/api/nihreporter'
import { getPatentsByMoleculeName } from '@/lib/api/patents'
import { getSecFilingsByName } from '@/lib/api/secedgar'
import { getLiteratureByName } from '@/lib/api/europepmc'
import { getSemanticPapersByName } from '@/lib/api/semantic-scholar'
import { getOpenAlexWorksByName } from '@/lib/api/openalex'
import { getCitationMetrics } from '@/lib/api/opencitations'
import { searchPubMed } from '@/lib/api/pubmed'
import { searchCrossRef } from '@/lib/api/crossref'
import { searchArXiv } from '@/lib/api/arxiv'


// New APIs (2026-04-09)
import { getUniProtProtein } from '@/lib/api/uniprot'
import { searchGOTerms } from '@/lib/api/gene-ontology'
import { searchHPOTerms } from '@/lib/api/hpo'
import { getGTExTopTissues } from '@/lib/api/gtex'
import { searchDrugShortages } from '@/lib/api/fda-drug-shortages'
import { searchLipidMaps } from '@/lib/api/lipidmaps'
import { searchBioModels } from '@/lib/api/biomodels'
import { searchOLS } from '@/lib/api/ols'
import { getProteinVariations, getProteomicsMappings, getProteinCrossReferences } from '@/lib/api/ebi-proteins-variation'
import { getAllCompoundIds } from '@/lib/api/unichem'
import { searchBioSamples } from '@/lib/api/biosamples'
import { searchMassive } from '@/lib/api/massive'
import { getLINCSSignaturesByName } from '@/lib/api/lincs'
import { getProteinAtlasData } from '@/lib/api/human-protein-atlas'
import { getTTDData } from '@/lib/api/ttd'

// NIH High-Impact
import { fetchTranslatorData } from '@/lib/api/ncats-translator'
import { fetchCadsrData } from '@/lib/api/nci-cadsr'
import { fetchAnvilData } from '@/lib/api/nhgri-anvil'
import { fetchImmPortData } from '@/lib/api/niaid-immport'
import { fetchNeuroMMSigData } from '@/lib/api/ninds-neurommsig'

import type { SynthesisRoute } from '@/lib/types'

const VALID_CATEGORIES = [
  'pharmaceutical', 'clinical-safety', 'molecular-chemical',
  'bioactivity-targets', 'protein-structure', 'genomics-disease',
  'interactions-pathways', 'research-literature', 'nih-high-impact',
]

const VALID_CATEGORY_IDS = new Set(VALID_CATEGORIES)

async function fetchSynthesisRoutes(moleculeName: string): Promise<SynthesisRoute[]> {
  const [keggId, rheaRoutes] = await Promise.all([
    safe(getKeggCompoundId(moleculeName), null),
    safe(getRheaSynthesisRoutes(moleculeName), []),
  ])
  const keggRoutes: SynthesisRoute[] = []
  if (keggId) {
    const reactionIds = await safe(getKeggReactions(keggId), [])
    const details = await Promise.all((reactionIds as string[]).slice(0, 5).map(id => safe(getKeggReactionDetail(id), null)))
    for (const detail of details) {
      if (!detail) continue
      keggRoutes.push({
        method: detail.name,
        description: detail.equation,
        keggReactionIds: [detail.id],
        enzymesInvolved: detail.enzymes,
        precursors: [],
        source: 'kegg',
      })
    }
  }
  return [...keggRoutes, ...(rheaRoutes as SynthesisRoute[])]
}

async function fetchPharmaceutical(name: string, synonyms: string[]) {
  const searchTerms = [name, ...synonyms.slice(0, 1)]
  const [companiesNested, ndcProducts, orangeBookEntries, drugPrices, drugInteractions, drugLabels, atcClassifications, drugCentralData, gsrsSubstances, pharmgkbData, cpicGuidelines] = await Promise.all([
    safe(withTimeout(Promise.all(searchTerms.map(t => getDrugsByIngredient(t))).then(r => r.filter(Boolean))), []),
    safe(withTimeout(getNdcProductsByName(name)), []),
    safe(withTimeout(getOrangeBookByName(name)), []),
    safe(withTimeout(getDrugPricesByName(name)), []),
    safe(withTimeout(getDrugInteractionsByName(name)), []),
    safe(withTimeout(getDrugLabelsByName(name)), []),
    safe(withTimeout(getAtcClassificationsByName(name)), []),
    safe(withTimeout(getDrugCentralEnhanced(name)), { drug: null, targets: [], indications: [], pharmacologicActions: [], atcCodes: [], manufacturers: [], products: [] }),
    safe(withTimeout(searchGSRS(name)), []),
    safe(withTimeout(getPharmGKBData(name)), { drugs: [], genes: [], guidelines: [] }),
    safe(withTimeout(getCPICData(name)), []),
  ])
  const seen = new Set<string>()
  const companies = companiesNested.flat().filter(p => {
    if (seen.has(p.brandName)) return false
    seen.add(p.brandName)
    return true
  })
  return {
    companies,
    ndcProducts,
    orangeBookEntries,
    drugPrices,
    drugInteractions,
    drugLabels,
    atcClassifications,
    drugCentralEnhanced: drugCentralData,
    gsrsSubstances,
    pharmgkbDrugs: pharmgkbData.drugs,
    cpicGuidelines,
  }
}

async function fetchClinicalSafety(name: string) {
  const [clinicalTrials, isrctnTrials, adverseEvents, drugRecalls, chemblIndications, clinVarVariants, gwasAssociations, toxcastData, siderData, irisAssessments, drugShortagesData] = await Promise.all([
    safe(withTimeout(getClinicalTrialsByName(name)), []),
    safe(withTimeout(searchISRCTN(name)), []),
    safe(withTimeout(getAdverseEventsByName(name)), []),
    safe(withTimeout(getDrugRecallsByName(name)), []),
    safe(withTimeout(getChemblIndicationsByName(name)), []),
    safe(withTimeout(getClinVarVariantsByName(name)), []),
    safe(withTimeout(getGwasAssociationsByName(name)), []),
    safe(withTimeout(getToxCastData(name)), { casrn: '', dtxsid: '', chemicalName: '', assays: [], summary: { totalAssays: 0, activeAssays: 0, inactiveAssays: 0, inconclusiveAssays: 0, topHitSubcategory: '' } }),
    safe(withTimeout(getSIDERData(name)), { sideEffects: [] }),
    safe(withTimeout(searchIRIS(name)), []),
    safe(withTimeout(searchDrugShortages(name)), { shortages: [], total: 0 }),
  ])
  return {
    clinicalTrials,
    isrctnTrials,
    adverseEvents,
    drugRecalls,
    chemblIndications,
    clinVarVariants,
    gwasAssociations,
    toxcastData,
    siderSideEffects: siderData.sideEffects,
    irisAssessments,
    drugShortages: drugShortagesData.shortages,
  }
}

async function fetchMolecularChemical(name: string, cid: number, molecularWeight: number) {
  const [computedProperties, ghsHazards, chebiAnnotation, compToxData, routes, metabolomicsData, myChemData, hmdbData, massBankSpectra, chemSpiderCompounds, metabolightsData, gnpsData, lipidMapsResult, unichemResult, foodbCompounds] = await Promise.all([
    safe(withTimeout(getComputedPropertiesByCid(cid)), null),
    safe(withTimeout(getGhsHazardsByCid(cid)), { signalWord: '', hazardStatements: [], precautionaryStatements: [] }),
    safe(withTimeout(getChebiAnnotationByName(name)), null),
    safe(withTimeout(getCompToxByName(name)), null),
    safe(withTimeout(fetchSynthesisRoutes(name)), []),
    safe(withTimeout(getMetabolomicsData(name, molecularWeight)), { metabolites: [], studies: [] }),
    safe(withTimeout(getMyChemData(name)), { chemicals: [] }),
    safe(withTimeout(getHMDBData(name)), { metabolites: [] }),
    safe(withTimeout(searchMassBank(name)), []),
    safe(withTimeout(searchChemSpider(name)), []),
    safe(withTimeout(searchMetaboLights(name)), []),
    safe(withTimeout(Promise.all([searchGNPSLibrary(name), searchGNPSNetworks(name)]).then(([spectra, clusters]) => ({ spectra, clusters }))), { spectra: [], clusters: [] }),
    safe(withTimeout(searchLipidMaps(name)), { lipids: [], total: 0 }),
    safe(withTimeout(getAllCompoundIds('pubchem', String(cid))), { inchiKey: null, mappings: {} }),
    safe(withTimeout(searchFooDB(name)), []),
  ])
  return {
    computedProperties,
    ghsHazards,
    chebiAnnotation,
    compToxData,
    routes,
    metabolomicsData,
    myChemAnnotations: myChemData.chemicals,
    hmdbMetabolites: hmdbData.metabolites,
    massBankSpectra,
    chemSpiderCompounds,
    metabolightsData: { studies: metabolightsData, metabolites: [] },
    gnpsData,
    lipidMapsLipids: lipidMapsResult.lipids,
    unichemMappings: Object.entries(unichemResult.mappings).map(([source, id]) => ({
      sourceId: source.toLowerCase(),
      sourceName: source,
      externalId: id,
      url: `https://www.ebi.ac.uk/unichem/#/search/${source.toLowerCase()}/${encodeURIComponent(id)}`,
    })),
    foodbCompounds,
  }
}

async function fetchBioactivityTargets(name: string) {
  const [chemblActivities, bioAssays, chemblMechanisms, pharmacologyTargets, bindingAffinities, pharosTargets, drugGeneInteractions, diseaseAssociations, ctdData, iedbData, lincsSignatures, ttdData] = await Promise.all([
    safe(withTimeout(getChemblActivitiesByName(name)), []),
    safe(withTimeout(getBioAssaysByName(name)), []),
    safe(withTimeout(getChemblMechanismsByName(name)), []),
    safe(withTimeout(getPharmacologyTargetsByName(name)), []),
    safe(withTimeout(getBindingAffinitiesByName(name)), []),
    safe(withTimeout(getPharosTargetsByName(name)), []),
    safe(withTimeout(getDrugGeneInteractionsByName(name)), []),
    safe(withTimeout(getDiseaseAssociationsByName(name)), []),
    safe(withTimeout(getCTDData(name, false)), { interactions: [], diseaseAssociations: [] }),
    safe(withTimeout(getIEDBData(name)), { epitopes: [] }),
    safe(withTimeout(getLINCSSignaturesByName(name)), []),
    safe(withTimeout(getTTDData(name)), { targets: [], drugs: [] }),
  ])
  return {
    chemblActivities,
    bioAssays,
    chemblMechanisms,
    pharmacologyTargets,
    bindingAffinities,
    pharosTargets,
    drugGeneInteractions,
    diseaseAssociations,
    ctdInteractions: ctdData.interactions,
    ctdDiseaseAssociations: ctdData.diseaseAssociations,
    iedbEpitopes: iedbData.epitopes,
    lincsSignatures,
    ttdTargets: ttdData.targets,
    ttdDrugs: ttdData.drugs,
  }
}

async function fetchProteinStructure(name: string) {
  const [uniprotEntries, pdbStructures, pdbeLigands, prideProjects, cathDomains, sabdabEntries] = await Promise.all([
    safe(getUniprotEntriesByName(name), []),
    safe(getPdbStructuresByName(name), []),
    safe(getPdbeLigandsByName(name), []),
    safe(searchPRIDE(name), []),
    safe(searchCATHDomains(name), []),
    safe(searchSAbDab(name), []),
  ])
  const accessions = (uniprotEntries as Array<{accession: string}>).map(e => e.accession).filter(Boolean)
  const geneSymbols = (uniprotEntries as Array<{geneName: string}>).map(e => e.geneName).filter(Boolean)
  const [alphaFoldPredictions, proteinDomains, proteinFeatures, proteinAtlasEntries, goAnnotations, peptideAtlasData, gene3dEntries, uniprotProteins, ebiVariations, ebiProteomics, ebiCrossRefs, humanProteinAtlas] = await Promise.all([
    safe(getAlphaFoldPredictions(accessions), []),
    safe(getProteinDomains(accessions), []),
    safe(getProteinFeaturesByAccessions(accessions), []),
    safe(getProteinAtlasBySymbols(geneSymbols), []),
    safe(getGoAnnotationsByAccessions(accessions), []),
    safe(getPeptideAtlasData(name), { peptides: [] }),
    safe(Promise.all(geneSymbols.slice(0, 5).map(s => searchGene3D(s).catch(() => []))).then(r => r.flat()), []),
    safe(Promise.all(geneSymbols.slice(0, 5).map(g => getUniProtProtein(g).catch(() => null))).then(results => results.filter((p): p is NonNullable<typeof p> => p !== null)), []),
    safe(Promise.all(accessions.slice(0, 3).map(a => getProteinVariations(a).catch(() => null))).then(r => r.find(x => x) || null), null),
    safe(Promise.all(accessions.slice(0, 3).map(a => getProteomicsMappings(a).catch(() => null))).then(r => r.find(x => x) || null), null),
    safe(Promise.all(accessions.slice(0, 3).map(a => getProteinCrossReferences(a).catch(() => null))).then(r => r.find(x => x) || null), null),
    safe(geneSymbols.length > 0 ? getProteinAtlasData(geneSymbols[0]) : Promise.resolve(null), null),
  ])
  return {
    uniprotEntries,
    pdbStructures,
    pdbeLigands,
    alphaFoldPredictions,
    proteinDomains,
    proteinFeatures,
    proteinAtlasEntries,
    goAnnotations,
    peptideAtlasEntries: peptideAtlasData.peptides,
    prideProjects,
    cathData: { domains: cathDomains, gene3dEntries },
    sabdabEntries,
    uniprotProteins,
    ebiProteinVariations: ebiVariations,
    ebiProteomicsData: ebiProteomics,
    ebiCrossReferences: ebiCrossRefs,
    humanProteinAtlas,
  }
}

async function fetchGenomicsDisease(name: string) {
  // Fetch UniProt for gene symbols, plus independent sources in parallel
  const [uniprotEntries, geneInfo, monarchDiseases, nciConcepts, meshTerms, disgenetData, orphanetData, myGeneData, omimData, geoDatasets, dbSnpVariants, clinGenData, medGenConcepts] = await Promise.all([
    safe(withTimeout(getUniprotEntriesByName(name)), []),
    safe(withTimeout(getGeneInfoByName(name)), []),
    safe(withTimeout(getMonarchDiseasesByName(name)), []),
    safe(withTimeout(getNciConceptsByName(name)), []),
    safe(withTimeout(getMeshTermsByName(name)), []),
    safe(withTimeout(getDisGeNetData(name)), { associations: [] }),
    safe(withTimeout(getOrphanetData(name)), { diseases: [] }),
    safe(withTimeout(getMyGeneData(name)), { genes: [] }),
    safe(withTimeout(getOMIMData(name)), { entries: [] }),
    safe(withTimeout(searchGEO(name)), []),
    safe(withTimeout(getDbSNPVariants(name)), []),
    safe(withTimeout(getClinGenData(name)), { geneDiseases: [], variants: [] }),
    safe(withTimeout(getMedGenConcepts(name)), []),
  ])
  const geneSymbols = (uniprotEntries as Array<{geneName: string}>).map(e => e.geneName).filter(Boolean)
  const [ensemblGenes, geneExpressions, bgeeData, gtexExpressions, goTerms, hpoTerms, olsTerms, bioModelsResult, bioSamplesResult, massiveResult] = await Promise.all([
    safe(withTimeout(getEnsemblGenesBySymbols(geneSymbols)), []),
    safe(withTimeout(getGeneExpressionBySymbols(geneSymbols)), []),
    safe(withTimeout(getBgeeData(name)), { expressions: [] }),
    safe(withTimeout(Promise.all(geneSymbols.slice(0, 5).map(g => getGTExTopTissues(g, 10).catch(() => []))).then(r => r.flat())), []),
    safe(withTimeout(Promise.all(geneSymbols.slice(0, 5).map(g => searchGOTerms(g).catch(() => []))).then(r => r.flat())), []),
    safe(withTimeout(searchHPOTerms(name)), { terms: [], total: 0 }),
    safe(withTimeout(searchOLS(name)), { terms: [], total: 0 }),
    safe(withTimeout(searchBioModels(name)), { models: [], total: 0 }),
    safe(withTimeout(searchBioSamples(name, 0, 10)), { samples: [], total: 0, page: 0, size: 10 }),
    safe(withTimeout(searchMassive(name, 10)), { datasets: [], total: 0 }),
  ])
  return {
    geneInfo,
    ensemblGenes,
    geneExpressions,
    geoDatasets,
    dbSnpVariants,
    clinGenData,
    medGenConcepts,
    monarchDiseases,
    nciConcepts,
    meshTerms,
    disgenetAssociations: disgenetData.associations,
    orphanetDiseases: orphanetData.diseases,
    myGeneAnnotations: myGeneData.genes,
    bgeeExpressions: bgeeData.expressions,
    omimEntries: omimData.entries,
    gtexExpressions,
    goTerms: normalizeGoTerms(goTerms),
    hpoTerms: (hpoTerms as unknown as { terms?: unknown[] })?.terms ?? hpoTerms,
    olsTerms: olsTerms.terms,
    bioModelsModels: bioModelsResult.models,
    bioSamples: bioSamplesResult.samples,
    massiveDatasets: massiveResult.datasets,
  }
}

async function fetchInteractionsPathways(name: string) {
  const [proteinInteractions, chemicalProteinInteractions, molecularInteractions, reactomePathways, wikiPathways, pathwayCommonsResults, bioCycPathways, smpdbPathways, keggData] = await Promise.all([
    safe(withTimeout(getProteinInteractionsByName(name)), []),
    safe(withTimeout(getChemicalInteractionsByName(name)), []),
    safe(withTimeout(getMolecularInteractionsByName(name)), []),
    safe(withTimeout(getReactomePathwaysByName(name)), []),
    safe(withTimeout(getWikiPathwaysByName(name)), []),
    safe(withTimeout(getPathwayCommonsByName(name)), []),
    safe(withTimeout(searchBioCyc(name)), []),
    safe(withTimeout(searchSMPDB(name)), []),
    safe(withTimeout(getKEGGData(name)), { pathways: [], compounds: [], drugs: [] }),
  ])
  return { proteinInteractions, chemicalProteinInteractions, molecularInteractions, reactomePathways, wikiPathways, pathwayCommonsResults, bioCycPathways, smpdbPathways, keggData }
}

async function fetchResearchLiterature(name: string) {
  const [literature, nihGrants, patents, secFilings, semanticPapers, openAlexWorks, pubmedArticles, crossRefWorks, arxivPapers] = await Promise.all([
    safe(withTimeout(getLiteratureByName(name)), []),
    safe(withTimeout(getNihGrantsByName(name)), []),
    safe(withTimeout(getPatentsByMoleculeName(name)), []),
    safe(withTimeout(getSecFilingsByName(name)), []),
    safe(withTimeout(getSemanticPapersByName(name)), []),
    safe(withTimeout(getOpenAlexWorksByName(name)), []),
    safe(withTimeout(searchPubMed(name, 20)), []),
    safe(withTimeout(searchCrossRef(name)), []),
    safe(withTimeout(searchArXiv(name)), []),
  ])
  const dois = (literature as Array<{doi?: string}>).map(l => l.doi).filter(Boolean) as string[]
  const citationMetrics = await safe(withTimeout(getCitationMetrics(dois)), [])
  return { literature, nihGrants, patents, secFilings, semanticPapers, openAlexWorks, citationMetrics, pubmedArticles, crossRefWorks, arxivPapers }
}

async function fetchNihHighImpact(name: string) {
  const [translatorData, cadsrData, anvilData, immPortData, neuroMMSigData] = await Promise.all([
    safe(fetchTranslatorData(name), null),
    safe(fetchCadsrData(name), null),
    safe(fetchAnvilData(name), null),
    safe(fetchImmPortData(name), null),
    safe(fetchNeuroMMSigData(name), null),
  ])
  return { translatorData, cadsrData, anvilData, immPortData, neuroMMSigData }
}

function normalizeGoTerms(raw: unknown): unknown[] {
  let items: unknown[]
  if (Array.isArray(raw)) {
    items = raw
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    items = Array.isArray(obj.terms) ? obj.terms : []
  } else {
    items = []
  }
  return items.map((raw: unknown) => {
    const item = raw as Record<string, unknown>
    return {
      goId: item.goId || item.id || '',
      goName: item.goName || item.label || item.name || '',
      goAspect: item.goAspect || item.aspect || '',
      evidence: item.evidence || item.goEvidence || '',
      qualifier: item.qualifier || '',
      url: item.url || `https://amigo.geneontology.org/amigo/term/${item.goId || item.id || ''}`,
    }
  })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; categoryId: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const categoryId = params.categoryId
  if (!VALID_CATEGORY_IDS.has(categoryId)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const molecule = await getMoleculeById(cid)
  if (!molecule) {
    return NextResponse.json({ error: 'Molecule not found' }, { status: 404 })
  }

  const name = molecule.name
  const synonyms = molecule.synonyms || []
  const molecularWeight = molecule.molecularWeight || 0

  const cacheKey = `category:${cid}:${categoryId}`
  const cached = getCached<Record<string, unknown>>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  let data: Record<string, unknown>
  const startTime = Date.now()
  try {
    switch (categoryId) {
      case 'pharmaceutical':
        data = await fetchPharmaceutical(name, synonyms)
        break
      case 'clinical-safety':
        data = await fetchClinicalSafety(name)
        break
      case 'molecular-chemical':
        data = await fetchMolecularChemical(name, cid, molecularWeight)
        break
      case 'bioactivity-targets':
        data = await fetchBioactivityTargets(name)
        break
      case 'protein-structure':
        data = await fetchProteinStructure(name)
        break
      case 'genomics-disease':
        data = await fetchGenomicsDisease(name)
        break
      case 'interactions-pathways':
        data = await fetchInteractionsPathways(name)
        break
      case 'research-literature':
        data = await fetchResearchLiterature(name)
        break
      case 'nih-high-impact':
        data = await fetchNihHighImpact(name)
        break
      default:
        return NextResponse.json({ error: 'Unknown category' }, { status: 400 })
    }

    const duration = Date.now() - startTime
    const panelKeys = Object.keys(data)
    let totalItems = 0
    let hasAnyData = false
    for (const key of panelKeys) {
      const val = data[key]
      if (val && typeof val === 'object' && 'data' in (val as object)) {
        const inner = (val as Record<string, unknown>).data
        if (Array.isArray(inner)) {
          totalItems += inner.length
          if (inner.length > 0) hasAnyData = true
        } else if (inner && typeof inner === 'object') {
          const arrVals = Object.values(inner as Record<string, unknown>)
          const foundArr = arrVals.find(Array.isArray)
          if (foundArr && Array.isArray(foundArr)) {
            totalItems += foundArr.length
            if (foundArr.length > 0) hasAnyData = true
          } else if (arrVals.length > 0) {
            hasAnyData = true
          }
        }
      } else if (Array.isArray(val)) {
        totalItems += val.length
        if (val.length > 0) hasAnyData = true
      }
    }

    recordMetric({
      source: `category:${categoryId}`,
      endpoint: `/api/molecule/${cid}/category/${categoryId}`,
      status: 200,
      duration_ms: duration,
      has_data: hasAnyData,
      items_count: totalItems,
    })
  } catch (err) {
    const duration = Date.now() - startTime
    recordMetric({
      source: `category:${categoryId}`,
      endpoint: `/api/molecule/${cid}/category/${categoryId}`,
      status: 500,
      duration_ms: duration,
      error: err instanceof Error ? err.message : String(err),
      has_data: false,
    })
    throw err
  }

  setCache(cacheKey, data)
  return NextResponse.json(data)
}
