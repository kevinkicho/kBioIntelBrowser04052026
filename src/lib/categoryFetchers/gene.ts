import { trackedSafe } from '@/lib/api-tracker'
import { getGeneById } from '@/lib/api/mygene'
import { getGeneInfoByName } from '@/lib/api/ncbi-gene'
import { getEnsemblGenesBySymbols } from '@/lib/api/ensembl'
import { getDiseasesByGene } from '@/lib/api/disgenet'
import { getClinVarByGene } from '@/lib/api/clinvar'
import { getDbSNPVariants } from '@/lib/api/dbsnp'
import { getGTExTopTissues } from '@/lib/api/gtex'
import { getBgeeData } from '@/lib/api/bgee'
import { getGeneExpressionBySymbols } from '@/lib/api/expression-atlas'
import { getReactomePathwaysByName } from '@/lib/api/reactome'
import { getWikiPathwaysByName } from '@/lib/api/wikipathways'
import { searchGOTerms } from '@/lib/api/gene-ontology'
import type { SectionStatus, DataLoadStatus } from '@/lib/dataStatus'

type TrackedResult<T> = { data: T; status: SectionStatus }

async function trackedStatus<T>(
  source: string,
  promise: Promise<T>,
  fallback: T,
  isEmpty: (v: T) => boolean = (v) => Array.isArray(v) ? v.length === 0 : v == null,
): Promise<TrackedResult<T>> {
  try {
    const result = await trackedSafe(source, promise, fallback)
    return { data: result, status: { status: isEmpty(result) ? 'empty' : 'loaded' as DataLoadStatus } }
  } catch (err) {
    return { data: fallback, status: { status: 'error' as DataLoadStatus, error: err instanceof Error ? err.message : 'Request failed' } }
  }
}

export interface TargetedDrug {
  drugName: string
  interactionType: string
  sources: string[]
  score: number
  pmids: string[]
}

async function getTargetedDrugs(geneSymbol: string): Promise<TargetedDrug[]> {
  try {
    const url = `https://dgidb.org/api/v2/interactions?genes=${encodeURIComponent(geneSymbol)}&interaction_types=inhibitor,antagonist,agonist,blocker,activator,modulator,binder,allosteric_modulator,substrate,ligand,cofactor`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return []
    const data = await res.json()
    const matchedTerms = data?.matchedTerms ?? []
    const geneTerm = matchedTerms.find((t: Record<string, unknown>) =>
      String(t.termName ?? '').toUpperCase() === geneSymbol.toUpperCase()
    )
    const interactions: Record<string, unknown>[] = geneTerm?.interactions ?? data?.interactions ?? []
    const seen = new Set<string>()
    return interactions
      .map((i: Record<string, unknown>) => {
        const srcRaw = i.sources ?? i.source
        const srcArr = Array.isArray(srcRaw) ? srcRaw : [srcRaw ?? 'DGIdb']
        const pmidsRaw = i.pmids ?? i.pmid
        const pmidsArr = Array.isArray(pmidsRaw) ? pmidsRaw : []
        return {
          drugName: String(i.drugName ?? i.drug_name ?? ''),
          interactionType: String(i.interactionType ?? i.interaction_type ?? ''),
          sources: srcArr.map(String),
          score: Number(i.score ?? 0),
          pmids: pmidsArr.map(String),
        }
      })
      .filter((d: TargetedDrug) => d.drugName && !seen.has(d.drugName.toLowerCase()) && seen.add(d.drugName.toLowerCase()))
      .slice(0, 30)
  } catch {
    return []
  }
}

export interface GeneOverview {
  geneId: string
  symbol: string
  name: string
  summary: string
  chromosome: string
  mapLocation: string
  typeOfGene: string
  aliases: string[]
  ensemblId: string
  uniprotId: string
  pathways: string[]
  goAnnotations: {
    biologicalProcess: string[]
    molecularFunction: string[]
    cellularComponent: string[]
  }
  url: string
}

export async function fetchGene(
  geneId: string,
  geneSymbol: string,
) {
  const myGeneResult = await getGeneById(geneId)
  const myGeneData = myGeneResult ?? {
    geneId,
    symbol: geneSymbol,
    name: '',
    taxid: 9606,
    ensemblId: '',
    uniprotId: '',
    summary: '',
    aliases: [],
    typeOfGene: '',
    mapLocation: '',
    pathways: [],
    goAnnotations: { biologicalProcess: [], molecularFunction: [], cellularComponent: [] },
  }

  const geneInfoResults = await trackedSafe('ncbi-gene', getGeneInfoByName(geneSymbol), [])
  const ncbiGene = (geneInfoResults as Array<{ geneId: string; symbol: string; name: string; summary: string; chromosome: string; mapLocation: string; url: string }>).find(
    (g) => g.geneId === geneId || g.symbol.toUpperCase() === geneSymbol.toUpperCase()
  )

  const symbol = myGeneData.symbol || geneSymbol
  const overview: GeneOverview = {
    geneId,
    symbol,
    name: myGeneData.name || ncbiGene?.name || '',
    summary: myGeneData.summary || ncbiGene?.summary || '',
    chromosome: ncbiGene?.chromosome || '',
    mapLocation: myGeneData.mapLocation || ncbiGene?.mapLocation || '',
    typeOfGene: myGeneData.typeOfGene || '',
    aliases: myGeneData.aliases || [],
    ensemblId: myGeneData.ensemblId || '',
    uniprotId: myGeneData.uniprotId || '',
    pathways: myGeneData.pathways || [],
    goAnnotations: myGeneData.goAnnotations || { biologicalProcess: [], molecularFunction: [], cellularComponent: [] },
    url: ncbiGene?.url || `https://www.ncbi.nlm.nih.gov/gene/${geneId}`,
  }

  const ensemblGenes = await trackedSafe('ensembl', getEnsemblGenesBySymbols([symbol]), [])

  const [disgenetResult, clinvarResult, dbsnpResult, drugsResult] = await Promise.all([
    trackedStatus('disgenet', getDiseasesByGene(symbol), []),
    trackedStatus('clinvar', getClinVarByGene(symbol), []),
    trackedStatus('dbsnp', getDbSNPVariants(symbol), []),
    trackedStatus('dgidb', getTargetedDrugs(symbol), []),
  ])

  const [gtexResult, bgeeResult, atlasResult, goResult] = await Promise.all([
    trackedStatus('gtex', getGTExTopTissues(symbol, 10), []),
    trackedStatus('bgee', getBgeeData(symbol), { expressions: [] }),
    trackedStatus('expression-atlas', getGeneExpressionBySymbols([symbol]), []),
    trackedStatus('gene-ontology', searchGOTerms(symbol).then(r => r.terms).catch(() => []), []),
  ])

  const [reactomeResult, wikiResult] = await Promise.all([
    trackedStatus('reactome', getReactomePathwaysByName(symbol), []),
    trackedStatus('wikipathways', getWikiPathwaysByName(symbol), []),
  ])

  const sectionStatus: Record<string, SectionStatus> = {
    drugs: drugsResult.status,
    diseases: disgenetResult.status,
    variants: { status: clinvarResult.status.status === 'error' || dbsnpResult.status.status === 'error' ? 'error' : clinvarResult.status.status === 'loaded' || dbsnpResult.status.status === 'loaded' ? 'loaded' : 'empty' as DataLoadStatus, error: clinvarResult.status.error || dbsnpResult.status.error },
    expression: { status: gtexResult.status.status === 'error' && bgeeResult.status.status === 'error' && atlasResult.status.status === 'error' ? 'error' as DataLoadStatus : (gtexResult.status.status === 'loaded' || bgeeResult.status.status === 'loaded' || atlasResult.status.status === 'loaded') ? 'loaded' as DataLoadStatus : 'empty' as DataLoadStatus, error: gtexResult.status.error || bgeeResult.status.error || atlasResult.status.error },
    pathways: { status: reactomeResult.status.status === 'error' && wikiResult.status.status === 'error' ? 'error' as DataLoadStatus : (reactomeResult.status.status === 'loaded' || wikiResult.status.status === 'loaded') ? 'loaded' as DataLoadStatus : 'empty' as DataLoadStatus, error: reactomeResult.status.error || wikiResult.status.error },
  }

  return {
    geneOverview: overview,
    geneDrugs: drugsResult.data,
    geneDiseases: {
      disgenetAssociations: disgenetResult.data as Array<{ geneSymbol: string; diseaseName: string; score: number; diseaseId: string; source: string }>,
      ensemblGenes,
    },
    geneVariants: {
      clinvarVariants: clinvarResult.data,
      dbsnpVariants: dbsnpResult.data,
    },
    geneExpressionData: {
      gtexExpressions: gtexResult.data,
      bgeeExpressions: (bgeeResult.data as { expressions?: unknown[] }).expressions ?? [],
      expressionAtlasData: atlasResult.data as unknown[],
    },
    genePathways: {
      reactomePathways: reactomeResult.data,
      wikiPathways: wikiResult.data,
      goTerms: Array.isArray(goResult.data) ? goResult.data : [],
    },
    _sectionStatus: sectionStatus,
  }
}