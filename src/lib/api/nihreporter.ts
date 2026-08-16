import type { NihGrant } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://api.reporter.nih.gov/v2/projects/search'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * NIH RePORTER harvest/densify leaf. HTTP / HTML / timeout are not EMPTY.
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

export async function getNihGrantsByName(name: string): Promise<NihGrant[]> {
  const q = name?.trim()
  if (!q) return []

  const body = JSON.stringify({
    criteria: {
      advanced_text_search: {
        operator: 'and',
        search_field: 'all',
        search_text: q,
      },
    },
    limit: 10,
    offset: 0,
  })

  const res = await timedFetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    ...fetchOptions,
    timeoutMs: 8000,
  })
  throwIfHttpFailed(res, 'NIH RePORTER')
  const data = await res.json()

  return (data.results ?? []).map((r: {
    project_num: string
    project_title: string
    contact_pi_name: string
    org_name: string
    award_amount: number
    project_start_date: string
    project_end_date: string
  }) => ({
    projectNumber: r.project_num ?? '',
    title: r.project_title ?? '',
    piName: r.contact_pi_name ?? 'Unknown',
    institute: r.org_name ?? 'Unknown',
    fundingAmount: r.award_amount ?? 0,
    startDate: r.project_start_date ?? '',
    endDate: r.project_end_date ?? '',
  }))
}
