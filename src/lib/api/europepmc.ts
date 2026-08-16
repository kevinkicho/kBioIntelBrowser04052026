import type { LiteratureResult } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * EuropePMC literature. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit JSON remains [] / 0.
 */
function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

export async function getLiteratureByName(name: string): Promise<LiteratureResult[]> {
  const url = `${BASE_URL}?query=${encodeURIComponent(name)}&format=json&resultType=core&pageSize=10`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'EuropePMC')
  const data = await res.json()

  return (data.resultList?.result ?? []).map((r: {
    title?: string
    authorString?: string
    journalTitle?: string
    pubYear?: string
    citedByCount?: number
    doi?: string
    pmid?: string
  }) => ({
    title: r.title ?? '',
    authors: r.authorString ?? '',
    journal: r.journalTitle ?? '',
    year: parseInt(r.pubYear ?? '0', 10) || 0,
    citedByCount: r.citedByCount ?? 0,
    doi: r.doi ?? '',
    pmid: r.pmid ?? '',
  }))
}

/**
 * Total hit count for a molecule/query (discovery novelty axis).
 * Uses Europe PMC `hitCount` without downloading full result rows.
 * HTTP / HTML / timeout are not 0-as-success.
 */
export async function getLiteratureHitCount(name: string): Promise<number> {
  const url = `${BASE_URL}?query=${encodeURIComponent(name)}&format=json&resultType=idlist&pageSize=1`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'EuropePMC')
  const data = await res.json()
  const n = Number(data.hitCount ?? 0)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}