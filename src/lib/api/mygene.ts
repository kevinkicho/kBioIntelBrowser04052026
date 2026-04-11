import type { MyGeneAnnotation } from '../types'

const BASE_URL = 'https://mygene.info/v3'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * Search genes by symbol or name
 */
export async function searchGenes(query: string): Promise<MyGeneAnnotation[]> {
  try {
    const url = `${BASE_URL}/query?q=${encodeURIComponent(query)}&fields=symbol,name,taxid,entrezgene,ensembl.gene,uniprot.Swiss-Prot,summary,alias,type_of_gene,map_location,pathway.name,go.BP.name,go.MF.name,go.CC.name&size=20&species=human`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.hits ?? []).map((hit: Record<string, unknown>) => {
      const ensembl = hit.ensembl as Record<string, unknown> | undefined
      const uniprot = hit.uniprot as Record<string, unknown> | undefined
      const pathway = hit.pathway as Record<string, unknown> | undefined
      const go = hit.go as Record<string, unknown> | undefined
      const goBP = go?.BP as Record<string, unknown> | undefined
      const goMF = go?.MF as Record<string, unknown> | undefined
      const goCC = go?.CC as Record<string, unknown> | undefined

      return {
        geneId: hit.entrezgene?.toString() ?? '',
        symbol: hit.symbol as string ?? '',
        name: hit.name as string ?? '',
        taxid: hit.taxid as number ?? 9606,
        ensemblId: ensembl?.gene as string ?? '',
        uniprotId: uniprot?.['Swiss-Prot'] as string ?? '',
        summary: hit.summary as string ?? '',
        aliases: (hit.alias ?? []) as string[],
        typeOfGene: hit.type_of_gene as string ?? '',
        mapLocation: hit.map_location as string ?? '',
        pathways: (pathway?.name ?? []) as string[],
        goAnnotations: {
          biologicalProcess: (goBP?.name ?? []) as string[],
          molecularFunction: (goMF?.name ?? []) as string[],
          cellularComponent: (goCC?.name ?? []) as string[]
        }
      }
    })
  } catch {
    return []
  }
}

/**
 * Get gene annotation by Entrez ID
 */
export async function getGeneById(geneId: string): Promise<MyGeneAnnotation | null> {
  try {
    const url = `${BASE_URL}/gene/${geneId}?fields=symbol,name,taxid,entrezgene,ensembl.gene,uniprot.Swiss-Prot,summary,alias,type_of_gene,map_location,pathway.name,go.BP.name,go.MF.name,go.CC.name`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const hit = await res.json()

    const ensembl = hit.ensembl as Record<string, unknown> | undefined
    const uniprot = hit.uniprot as Record<string, unknown> | undefined
    const pathway = hit.pathway as Record<string, unknown> | undefined
    const go = hit.go as Record<string, unknown> | undefined
    const goBP = go?.BP as Record<string, unknown> | undefined
    const goMF = go?.MF as Record<string, unknown> | undefined
    const goCC = go?.CC as Record<string, unknown> | undefined

    return {
      geneId: hit.entrezgene?.toString() ?? '',
      symbol: hit.symbol as string ?? '',
      name: hit.name as string ?? '',
      taxid: hit.taxid as number ?? 9606,
      ensemblId: ensembl?.gene as string ?? '',
      uniprotId: uniprot?.['Swiss-Prot'] as string ?? '',
      summary: hit.summary as string ?? '',
      aliases: (hit.alias ?? []) as string[],
      typeOfGene: hit.type_of_gene as string ?? '',
      mapLocation: hit.map_location as string ?? '',
      pathways: (pathway?.name ?? []) as string[],
      goAnnotations: {
        biologicalProcess: (goBP?.name ?? []) as string[],
        molecularFunction: (goMF?.name ?? []) as string[],
        cellularComponent: (goCC?.name ?? []) as string[]
      }
    }
  } catch {
    return null
  }
}

/**
 * Main export: Get MyGene annotation data
 */
export async function getMyGeneData(geneSymbol: string): Promise<{
  genes: MyGeneAnnotation[]
}> {
  const genes = await searchGenes(geneSymbol)

  return {
    genes: genes.slice(0, 10)
  }
}