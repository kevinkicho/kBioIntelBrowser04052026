import type { AdverseEvent } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://api.fda.gov/drug/event.json'
const fetchOptions: RequestInit = { next: { revalidate: 3600 } }

function buildUrl(name: string, limit: number): string {
  const apiKey = process.env.OPENFDA_API_KEY
  const keyParam = apiKey ? `&api_key=${apiKey}` : ''
  const encoded = encodeURIComponent(name)
  return `${BASE_URL}?search=patient.drug.openfda.generic_name:"${encoded}"+OR+patient.drug.openfda.brand_name:"${encoded}"&count=patient.reaction.reactionmeddrapt.exact&limit=${limit}${keyParam}`
}

function isAbsentStatus(status: number): boolean {
  // openFDA returns 404 when a drug name has no FAERS matches.
  return status === 404
}

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

/**
 * openFDA FAERS reaction counts. HTTP 5xx / HTML / timeout are not EMPTY.
 * True 404 (no matches) remains [].
 */
export async function getAdverseEventsByName(name: string, limit: number = LIMITS.ADVERSE_EVENTS.initial): Promise<AdverseEvent[]> {
  const res = await timedFetch(buildUrl(name, limit), { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'openFDA FAERS')
  const data = await res.json()

  return (data.results ?? []).map((r: {
    term: string
    count: number
    serious_count?: number
    outcome?: string
  }) => ({
    reactionName: r.term ?? '',
    count: r.count ?? 0,
    serious: r.serious_count ?? 0,
    outcome: r.outcome ?? '',
  }))
}