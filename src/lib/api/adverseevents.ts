import type { AdverseEvent } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://api.fda.gov/drug/event.json'
const fetchOptions: RequestInit = { next: { revalidate: 3600 } }

function buildUrl(name: string, limit: number): string {
  const apiKey = process.env.OPENFDA_API_KEY
  const keyParam = apiKey ? `&api_key=${apiKey}` : ''
  const encoded = encodeURIComponent(name)
  return `${BASE_URL}?search=patient.drug.openfda.generic_name:"${encoded}"&count=patient.reaction.reactionmeddrapt.exact&limit=${limit}${keyParam}`
}

export async function getAdverseEventsByName(name: string, limit: number = LIMITS.ADVERSE_EVENTS.initial): Promise<AdverseEvent[]> {
  try {
    const res = await fetch(buildUrl(name, limit), fetchOptions)
    if (!res.ok) return []
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
  } catch {
    return []
  }
}