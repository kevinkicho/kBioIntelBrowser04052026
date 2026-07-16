import type { LiteratureResult } from '../types'

const BASE_URL = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getLiteratureByName(name: string): Promise<LiteratureResult[]> {
  try {
    const url = `${BASE_URL}?query=${encodeURIComponent(name)}&format=json&resultType=core&pageSize=10`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
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
  } catch {
    return []
  }
}

/**
 * Total hit count for a molecule/query (discovery novelty axis).
 * Uses Europe PMC `hitCount` without downloading full result rows.
 */
export async function getLiteratureHitCount(name: string): Promise<number> {
  try {
    const url = `${BASE_URL}?query=${encodeURIComponent(name)}&format=json&resultType=idlist&pageSize=1`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return 0
    const data = await res.json()
    const n = Number(data.hitCount ?? 0)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  } catch {
    return 0
  }
}
