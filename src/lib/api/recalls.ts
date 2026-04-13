import type { DrugRecall } from '../types'

const BASE_URL = 'https://api.fda.gov/drug/enforcement.json'
const fetchOptions: RequestInit = { next: { revalidate: 3600 } }

function twoYearsAgoCompact(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 2)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function formatDate(raw: string): string {
  if (raw.length === 8) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
  }
  return raw
}

export async function getDrugRecallsByName(name: string): Promise<DrugRecall[]> {
  try {
    const apiKey = process.env.OPENFDA_API_KEY
    const keyParam = apiKey ? `&api_key=${apiKey}` : ''
    const encoded = encodeURIComponent(name)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const dateFilter = `+AND+report_date:[${twoYearsAgoCompact()}+TO+${today}]`
    const url = `${BASE_URL}?search=openfda.generic_name:"${encoded}"+OR+openfda.brand_name:"${encoded}"${dateFilter}&limit=10&sort=report_date:desc${keyParam}`

    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? []).map((r: {
      recall_number?: string
      classification?: string
      reason_for_recall?: string
      product_description?: string
      recalling_firm?: string
      report_date?: string
      status?: string
      city?: string
      state?: string
    }) => ({
      recallNumber: r.recall_number ?? '',
      classification: r.classification ?? '',
      reason: r.reason_for_recall ?? '',
      description: r.product_description ?? '',
      recallingFirm: r.recalling_firm ?? '',
      reportDate: formatDate(r.report_date ?? ''),
      status: r.status ?? '',
      city: r.city ?? '',
      state: r.state ?? '',
    }))
  } catch {
    return []
  }
}
