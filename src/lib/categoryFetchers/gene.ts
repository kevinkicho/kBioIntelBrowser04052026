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

  const [disgenetAssociations, clinvarVariants, dbsnpVariants, geneDrugs] = await Promise.all([
    trackedSafe('disgenet', getDiseasesByGene(symbol), []),
    trackedSafe('clinvar', getClinVarByGene(symbol), []),
    trackedSafe('dbsnp', getDbSNPVariants(symbol), []),
    trackedSafe('dgidb', getTargetedDrugs(symbol), []),
  ])

  const [gtexExpressions, bgeeData, expressionAtlas, goTerms] = await Promise.all([
    trackedSafe('gtex', getGTExTopTissues(symbol, 10), []),
    trackedSafe('bgee', getBgeeData(symbol), { expressions: [] }),
    trackedSafe('expression-atlas', getGeneExpressionBySymbols([symbol]), []),
    trackedSafe('gene-ontology', searchGOTerms(symbol).then(r => r.terms).catch(() => []), []),
  ])

  const [reactomePathways, wikiPathways] = await Promise.all([
    trackedSafe('reactome', getReactomePathwaysByName(symbol), []),
    trackedSafe('wikipathways', getWikiPathwaysByName(symbol), []),
  ])

  return {
    geneOverview: overview,
    geneDrugs,
    geneDiseases: {
      disgenetAssociations: disgenetAssociations as Array<{ geneSymbol: string; diseaseName: string; score: number; diseaseId: string; source: string }>,
      ensemblGenes,
    },
    geneVariants: {
      clinvarVariants,
      dbsnpVariants,
    },
    geneExpressionData: {
      gtexExpressions,
      bgeeExpressions: (bgeeData as { expressions?: unknown[] }).expressions ?? [],
      expressionAtlasData: expressionAtlas as unknown[],
    },
    genePathways: {
      reactomePathways,
      wikiPathways,
      goTerms: Array.isArray(goTerms) ? goTerms : [],
    },
  }
}