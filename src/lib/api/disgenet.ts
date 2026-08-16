import type { DisGeNetAssociation } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://api.disgenet.org/api/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * DisGeNET gather leaf. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit JSON remains [].
 */
function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

function mapAssociations(data: { response?: Record<string, unknown>[] }): DisGeNetAssociation[] {
  return (data.response ?? []).map((item: Record<string, unknown>) => ({
    geneSymbol: item.gene_symbol as string,
    geneId: item.gene_id as string,
    diseaseId: item.disease_id as string,
    diseaseName: item.disease_name as string,
    diseaseType: item.disease_type as string,
    score: item.score as number,
    source: item.source as string,
    pmids: ((item.pmids as string[]) ?? []).slice(0, 5),
  }))
}

/**
 * Get gene-disease associations by gene symbol
 */
export async function getDiseasesByGene(geneSymbol: string): Promise<DisGeNetAssociation[]> {
  if (!geneSymbol?.trim()) return []
  const url = `${BASE_URL}/gda?gene_symbol=${encodeURIComponent(geneSymbol)}&limit=50`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'DisGeNET')
  const data = await res.json()
  return mapAssociations(data)
}

/**
 * Get gene-disease associations by disease name
 */
export async function getGenesByDisease(diseaseName: string): Promise<DisGeNetAssociation[]> {
  if (!diseaseName?.trim()) return []
  const url = `${BASE_URL}/gda?disease_name=${encodeURIComponent(diseaseName)}&limit=50`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'DisGeNET')
  const data = await res.json()
  return mapAssociations(data)
}

/**
 * Main export: gene–disease associations for a query that may be a gene symbol
 * *or* a drug/disease name. DisGeNET gene_symbol search returns empty for drug
 * names; fall back to free Open Targets disease associations for drugs.
 */
export async function getDisGeNetData(name: string): Promise<{
  associations: DisGeNetAssociation[]
}> {
  const q = name?.trim()
  if (!q) return { associations: [] }

  // Gene-shaped queries (TP53, TTR, …)
  if (/^[A-Z][A-Z0-9]{1,14}$/i.test(q) && !/\s/.test(q)) {
    const geneAssociations = await getDiseasesByGene(q)
    if (geneAssociations.length > 0) {
      return { associations: geneAssociations.slice(0, 30) }
    }
  }

  // Drug / free-text: free Open Targets associations (no DisGeNET key required)
  try {
    const { getDiseaseAssociationsByName } = await import('./opentargets')
    const hits = await getDiseaseAssociationsByName(q)
    const associations: DisGeNetAssociation[] = hits.slice(0, 30).map((h) => ({
      geneSymbol: q,
      geneId: '',
      diseaseId: h.diseaseId ?? '',
      diseaseName: h.diseaseName ?? '',
      diseaseType: (h.therapeuticAreas ?? []).join('; '),
      score: Number(h.score) || 0,
      source: 'Open Targets',
      pmids: [],
    }))
    if (associations.length > 0) return { associations }
  } catch {
    /* fall through */
  }

  const byDisease = await getGenesByDisease(q)
  return { associations: byDisease.slice(0, 30) }
}