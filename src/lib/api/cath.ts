import type { CATHDomain, Gene3DEntry } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'http://www.cathdb.info/api/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search CATH/Gene3D for protein domain classifications
 * CATH is a hierarchical domain classification of protein structures
 */
export async function searchCATHDomains(query: string, limit: number = LIMITS.CATH.initial): Promise<CATHDomain[]> {
  try {
    const searchUrl = `${BASE_URL}/search?query=${encodeURIComponent(query)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.data || searchData?.results || searchData?.domains || []

    return results.map((domain: Record<string, unknown>) => ({
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
    })).filter((d: CATHDomain) => d.domainId)
  } catch (error) {
    console.error('CATH domain search error:', error)
    return []
  }
}

/**
 * Get CATH domain details by domain ID
 */
export async function getCATHDomain(domainId: string): Promise<CATHDomain | null> {
  try {
    const domainUrl = `${BASE_URL}/domain/${domainId}`
    const domainRes = await fetch(domainUrl, fetchOptions)
    if (!domainRes.ok) return null

    const domain = await domainRes.json()

    return {
      id: String(domain.id || domainId),
      domainId: String(domain.domain_id || domainId),
      superfamilyId: String(domain.superfamily_id || ''),
      fold: String(domain.fold || ''),
      superfamily: String(domain.superfamily || domain.superfamily_name || ''),
      functionalFamily: String(domain.functional_family || domain.funfam || ''),
      protein: String(domain.protein || domain.protein_name || ''),
      organism: String(domain.organism || domain.species || ''),
      pdbId: String(domain.pdb_id || domain.pdb || ''),
      pdbChain: String(domain.pdb_chain || domain.chain || ''),
      sequence: String(domain.sequence || ''),
      length: parseInt(String(domain.length || domain.seq_length || '0'), 10),
      url: `http://www.cathdb.info/domain/${domainId}`,
    }
  } catch (error) {
    console.error('CATH domain fetch error:', error)
    return null
  }
}

/**
 * Search Gene3D for gene annotations
 * Gene3D predicts CATH domains in protein sequences
 */
export async function searchGene3D(query: string, limit: number = LIMITS.CATH.initial): Promise<Gene3DEntry[]> {
  try {
    const searchUrl = `${BASE_URL}/gene3d/search?query=${encodeURIComponent(query)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

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
  } catch (error) {
    console.error('Gene3D search error:', error)
    return []
  }
}

/**
 * Get Gene3D entry by gene ID
 */
export async function getGene3DEntry(geneId: string): Promise<Gene3DEntry | null> {
  try {
    const entryUrl = `${BASE_URL}/gene3d/entry/${geneId}`
    const entryRes = await fetch(entryUrl, fetchOptions)
    if (!entryRes.ok) return null

    const entry = await entryRes.json()

    return {
      id: String(entry.id || geneId),
      geneId: String(entry.gene_id || geneId),
      geneSymbol: String(entry.gene_symbol || ''),
      proteinName: String(entry.protein_name || ''),
      organism: String(entry.organism || ''),
      domains: Array.isArray(entry.domains) ? entry.domains.map(formatDomain) : [],
      domainArchitecture: String(entry.domain_architecture || ''),
      url: `http://www.cathdb.info/gene3d/${geneId}`,
    }
  } catch (error) {
    console.error('Gene3D entry fetch error:', error)
    return null
  }
}

/**
 * Get domains by superfamily ID
 */
export async function getCATHBySuperfamily(superfamilyId: string, limit: number = LIMITS.CATH.initial): Promise<CATHDomain[]> {
  try {
    const searchUrl = `${BASE_URL}/superfamily/${superfamilyId}/domains?limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.data || searchData?.results || searchData?.domains || []

    return results.map(formatDomain)
  } catch (error) {
    console.error('CATH superfamily search error:', error)
    return []
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