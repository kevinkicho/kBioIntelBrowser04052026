import type { NihGrant } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://api.reporter.nih.gov/v2/projects/search'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getNihGrantsByName(name: string): Promise<NihGrant[]> {
  try {
    const body = JSON.stringify({
      criteria: {
        advanced_text_search: {
          operator: 'and',
          search_field: 'all',
          search_text: name,
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
    if (!res.ok) return []
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
  } catch {
    return []
  }
}
