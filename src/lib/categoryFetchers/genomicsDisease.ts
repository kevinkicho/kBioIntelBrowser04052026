import { trackedSafe } from '@/lib/api-tracker'
import type { ApiParamValue } from '@/lib/apiIdentifiers'

import { getUniprotEntriesByName } from '@/lib/api/uniprot'
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
import { searchGOTerms } from '@/lib/api/gene-ontology'
import { searchHPOTerms } from '@/lib/api/hpo'
import { searchOLS } from '@/lib/api/ols'
import { searchBioModels } from '@/lib/api/biomodels'
import { searchBioSamples } from '@/lib/api/biosamples'
import { searchMassive } from '@/lib/api/massive'
import { getGTExTopTissues } from '@/lib/api/gtex'

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchGenomicsDisease(name: string, queryFor: (s: string) => string, apiParams: Record<string, ApiParamValue>) {
  const [uniprotEntries, geneInfo, monarchDiseases, nciConcepts, meshTerms, disgenetData, orphanetData, myGeneData, omimData, geoDatasets, dbSnpVariants, clinGenData, medGenConcepts] = await Promise.all([
    trackedSafe('uniprot', getUniprotEntriesByName(queryFor('uniprot')), []),
    trackedSafe('ncbi-gene', getGeneInfoByName(queryFor('gene-info')), []),
    trackedSafe('monarch', getMonarchDiseasesByName(queryFor('monarch')), []),
    trackedSafe('nci-thesaurus', getNciConceptsByName(queryFor('nci-thesaurus')), []),
    trackedSafe('mesh', getMeshTermsByName(queryFor('mesh')), []),
    trackedSafe('disgenet', getDisGeNetData(queryFor('disgenet')), { associations: [] }),
    trackedSafe('orphanet', getOrphanetData(queryFor('orphanet')), { diseases: [] }),
    trackedSafe('mygene', getMyGeneData(queryFor('mygene')), { genes: [] }),
    trackedSafe('omim', getOMIMData(queryFor('omim')), { entries: [] }),
    trackedSafe('geo', searchGEO(name), []),
    trackedSafe('dbsnp', getDbSNPVariants(queryFor('dbsnp')), []),
    trackedSafe('clingen', getClinGenData(queryFor('clingen')), { geneDiseases: [], variants: [] }),
    trackedSafe('medgen', getMedGenConcepts(queryFor('medgen')), []),
  ])
  const geneSymbols = (uniprotEntries as Array<{geneName: string}>).map(e => e.geneName).filter(Boolean)
  const [ensemblGenes, geneExpressions, bgeeData, gtexExpressions, goTerms, hpoTerms, olsTerms, bioModelsResult, bioSamplesResult, massiveResult] = await Promise.all([
    trackedSafe('ensembl', getEnsemblGenesBySymbols(geneSymbols), []),
    trackedSafe('expression-atlas', getGeneExpressionBySymbols(geneSymbols), []),
    trackedSafe('bgee', getBgeeData(geneSymbols[0] || name), { expressions: [] }),
    trackedSafe('gtex', Promise.all(geneSymbols.slice(0, 5).map(g => getGTExTopTissues(g, 10).catch(() => []))).then(r => r.flat()), []),
    trackedSafe('gene-ontology', Promise.all(geneSymbols.slice(0, 5).map(g => searchGOTerms(g).then(r => r.terms).catch(() => []))).then(r => r.flat()), []),
    trackedSafe('hpo', searchHPOTerms(name), { terms: [], total: 0 }),
    trackedSafe('ols', searchOLS(name), { terms: [], total: 0 }),
    trackedSafe('biomodels', searchBioModels(name), { models: [], total: 0 }),
    trackedSafe('biosamples', searchBioSamples(name, 0, 10), { samples: [], total: 0, page: 0, size: 10 }),
    trackedSafe('massive', searchMassive(name, 10), { datasets: [], total: 0 }),
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