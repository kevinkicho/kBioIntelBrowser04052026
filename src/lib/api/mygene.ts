import type { MyGeneAnnotation } from '../types'

const BASE_URL = 'https://mygene.info/v3'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * MyGene returns scalar-or-array for alias, pathway.name, go.*.name, etc.
 * Always coerce to string[] for UI .map() safety.
 */
export function asStringList(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : v != null ? String(v) : ''))
      .filter((s) => s.length > 0)
  }
  if (typeof value === 'string') {
    const t = value.trim()
    return t ? [t] : []
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)]
  }
  return []
}

function mapMyGeneHit(hit: Record<string, unknown>): MyGeneAnnotation {
  const ensembl = hit.ensembl as Record<string, unknown> | undefined
  const uniprot = hit.uniprot as Record<string, unknown> | undefined
  const pathway = hit.pathway as Record<string, unknown> | undefined
  const go = hit.go as Record<string, unknown> | undefined
  const goBP = go?.BP as Record<string, unknown> | undefined
  const goMF = go?.MF as Record<string, unknown> | undefined
  const goCC = go?.CC as Record<string, unknown> | undefined

  // uniprot Swiss-Prot can also be string | string[]
  const swiss = uniprot?.['Swiss-Prot']
  const uniprotId = Array.isArray(swiss)
    ? String(swiss[0] ?? '')
    : typeof swiss === 'string'
      ? swiss
      : ''

  const ensemblGene = ensembl?.gene
  const ensemblId = Array.isArray(ensemblGene)
    ? String(ensemblGene[0] ?? '')
    : typeof ensemblGene === 'string'
      ? ensemblGene
      : ''

  return {
    geneId: hit.entrezgene?.toString() ?? '',
    symbol: (hit.symbol as string) ?? '',
    name: (hit.name as string) ?? '',
    taxid: (hit.taxid as number) ?? 9606,
    ensemblId,
    uniprotId,
    summary: (hit.summary as string) ?? '',
    aliases: asStringList(hit.alias),
    typeOfGene: (hit.type_of_gene as string) ?? '',
    mapLocation: (hit.map_location as string) ?? '',
    pathways: asStringList(pathway?.name),
    goAnnotations: {
      biologicalProcess: asStringList(goBP?.name),
      molecularFunction: asStringList(goMF?.name),
      cellularComponent: asStringList(goCC?.name),
    },
  }
}

/**
 * Search genes by symbol or name
 */
export async function searchGenes(query: string): Promise<MyGeneAnnotation[]> {
  try {
    const q = query.trim()
    if (q.length < 1) return []
    // Prefer symbol match first, then free-text — improves gene hits in unified search
    const fields =
      'symbol,name,taxid,entrezgene,ensembl.gene,uniprot.Swiss-Prot,summary,alias,type_of_gene,map_location,pathway.name,go.BP.name,go.MF.name,go.CC.name'
    const queries = [
      `${BASE_URL}/query?q=symbol:${encodeURIComponent(q)}&fields=${fields}&size=15&species=human`,
      `${BASE_URL}/query?q=${encodeURIComponent(q)}&fields=${fields}&size=15&species=human`,
    ]
    const seen = new Set<string>()
    const out: MyGeneAnnotation[] = []
    for (const url of queries) {
      const res = await fetch(url, fetchOptions)
      if (!res.ok) continue
      const data = await res.json()
      for (const hit of data.hits ?? []) {
        const mapped = mapMyGeneHit(hit as Record<string, unknown>)
        const key = mapped.geneId || mapped.symbol
        if (!key || seen.has(key)) continue
        seen.add(key)
        out.push(mapped)
        if (out.length >= 20) return out
      }
    }
    return out
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
    return mapMyGeneHit(hit as Record<string, unknown>)
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