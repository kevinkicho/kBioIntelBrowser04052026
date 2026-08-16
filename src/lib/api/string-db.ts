import type { StringInteraction } from '../types'
import { LIMITS } from '../api-limits'
import { resolveDrugTargets } from './drugTargetResolve'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * STRING harvest leaf. HTTP / HTML / timeout are not EMPTY.
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

async function stringPartners(
  identifier: string,
  limit: number,
  requiredScore: number,
): Promise<StringInteraction[]> {
  let url =
    `https://string-db.org/api/json/interaction_partners` +
    `?identifiers=${encodeURIComponent(identifier)}&species=9606&limit=${limit}&caller_identity=kNIHexplorer`
  if (requiredScore > 0) url += `&required_score=${requiredScore}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'STRING')
  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return []
  return (data as Record<string, string>[]).map((r) => ({
    proteinA: r.preferredName_A ?? '',
    proteinB: r.preferredName_B ?? '',
    score: Number(r.score) || 0,
    experimentalScore: Number(r.escore) || 0,
    databaseScore: Number(r.dscore) || 0,
    textminingScore: Number(r.tscore) || 0,
    url: `https://string-db.org/network/${r.stringId_A}`,
  }))
}

/**
 * Protein–protein interactions (STRING).
 * Drug/chemical names resolve to target genes first so we do not return
 * unrelated gene PPI from a free-text mis-match.
 */
export async function getProteinInteractionsByName(
  name: string,
  limit: number = LIMITS.STRING.initial,
  requiredScore: number = 0,
): Promise<StringInteraction[]> {
  const q = name?.trim()
  if (!q) return []

  // Gene / accession pass-through
  const looksGene = /^[A-Z][A-Z0-9-]{1,14}$/i.test(q) && ( /[0-9]/.test(q) || q.length <= 6)
  if (looksGene) {
    return stringPartners(q, limit, requiredScore)
  }

  // Drug → target genes via free ChEMBL
  const resolved = await resolveDrugTargets(q, 4)
  for (const gene of resolved.geneSymbols.slice(0, 3)) {
    const rows = await stringPartners(gene, limit, requiredScore)
    if (rows.length) return rows
  }

  // UniProt accessions
  for (const acc of resolved.uniprotAccessions.slice(0, 2)) {
    const rows = await stringPartners(acc, limit, requiredScore)
    if (rows.length) return rows
  }

  // Last resort free-text (may mis-resolve)
  return stringPartners(q, limit, requiredScore)
}
