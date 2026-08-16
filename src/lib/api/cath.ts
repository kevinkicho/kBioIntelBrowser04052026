import type { CATHDomain, Gene3DEntry } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'http://www.cathdb.info/api/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * CATH/Gene3D harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * Short query, 404, missing id, and zero-hit JSON remain empty.
 */
function isAbsentStatus(status: number): boolean {
  return status === 404
}

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

function formatDomain(domain: Record<string, unknown>): CATHDomain {
  return {
    id: String(domain.id || domain.domain_id || ''),
    domainId: String(domain.domain_id || domain.domainId || domain.id || ''),
    superfamilyId: String(domain.superfamily_id || domain.superfamilyId || ''),
    fold: String(domain.fold || ''),
    superfamily: String(domain.superfamily || domain.superfamily_name || ''),
    functionalFamily: String(domain.functional_family || domain.functionalFamily || domain.funfam || ''),
    protein: String(domain.protein || domain.protein_name || ''),
    organism: String(domain.organism || domain.species || ''),
    pdbId: String(domain.pdb_id || domain.pdbId || domain.pdb || ''),
    pdbChain: String(domain.pdb_chain || domain.chain || ''),
    sequence: String(domain.sequence || ''),
    length: parseInt(String(domain.length || domain.seq_length || '0'), 10),
    url: `http://www.cathdb.info/domain/${domain.domain_id || domain.id || ''}`,
  }
}

/**
 * Search CATH/Gene3D for protein domain classifications
 * CATH is a hierarchical domain classification of protein structures
 */
export async function searchCATHDomains(query: string, limit: number = LIMITS.CATH.initial): Promise<CATHDomain[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/search?query=${encodeURIComponent(q)}&limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'CATH')
  const searchData = await searchRes.json()
  const results = searchData?.data || searchData?.results || searchData?.domains || []
  return results.map((domain: Record<string, unknown>) => formatDomain(domain)).filter((d: CATHDomain) => d.domainId)
}

/**
 * Get CATH domain details by domain ID
 */
export async function getCATHDomain(domainId: string): Promise<CATHDomain | null> {
  const id = domainId.trim()
  if (!id) return null
  const domainUrl = `${BASE_URL}/domain/${id}`
  const domainRes = await timedFetch(domainUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(domainRes.status)) return null
  throwIfHttpFailed(domainRes, 'CATH')
  const domain = await domainRes.json() as Record<string, unknown>
  return formatDomain({ ...domain, domain_id: domain.domain_id || id, id: domain.id || id })
}

/**
 * Search Gene3D for gene annotations
 * Gene3D predicts CATH domains in protein sequences
 */
export async function searchGene3D(query: string, limit: number = LIMITS.CATH.initial): Promise<Gene3DEntry[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/gene3d/search?query=${encodeURIComponent(q)}&limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'CATH')
  const searchData = await searchRes.json()
  const results = searchData?.data || searchData?.results || searchData?.entries || []
  return results.map((entry: Record<string, unknown>) => ({
    id: String(entry.id || entry.entry_id || ''),
    geneId: String(entry.gene_id || entry.geneId || ''),
    geneSymbol: String(entry.gene_symbol || entry.geneSymbol || ''),
    proteinName: String(entry.protein_name || entry.proteinName || ''),
    organism: String(entry.organism || entry.species || ''),
    domains: Array.isArray(entry.domains) ? entry.domains.map(formatDomain) : [],
    domainArchitecture: String(entry.domain_architecture || entry.domainArchitecture || ''),
    url: `http://www.cathdb.info/gene3d/${entry.gene_id || entry.geneId || entry.id}`,
  })).filter((e: Gene3DEntry) => e.geneId || e.geneSymbol)
}

/**
 * Get Gene3D entry by gene ID
 */
export async function getGene3DEntry(geneId: string): Promise<Gene3DEntry | null> {
  const id = geneId.trim()
  if (!id) return null
  const entryUrl = `${BASE_URL}/gene3d/entry/${id}`
  const entryRes = await timedFetch(entryUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(entryRes.status)) return null
  throwIfHttpFailed(entryRes, 'CATH')
  const entry = await entryRes.json()
  return {
    id: String(entry.id || id),
    geneId: String(entry.gene_id || id),
    geneSymbol: String(entry.gene_symbol || ''),
    proteinName: String(entry.protein_name || ''),
    organism: String(entry.organism || ''),
    domains: Array.isArray(entry.domains) ? entry.domains.map(formatDomain) : [],
    domainArchitecture: String(entry.domain_architecture || ''),
    url: `http://www.cathdb.info/gene3d/${id}`,
  }
}

/**
 * Get domains by superfamily ID
 */
export async function getCATHBySuperfamily(superfamilyId: string, limit: number = LIMITS.CATH.initial): Promise<CATHDomain[]> {
  const id = superfamilyId.trim()
  if (!id) return []
  const searchUrl = `${BASE_URL}/superfamily/${id}/domains?limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'CATH')
  const searchData = await searchRes.json()
  const results = searchData?.data || searchData?.results || searchData?.domains || []
  return results.map(formatDomain)
}
