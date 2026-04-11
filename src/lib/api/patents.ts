import type { Patent } from '../types'

const BASE_URL = 'https://api.patentsview.org/patents/query'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getPatentsByMoleculeName(name: string): Promise<Patent[]> {
  try {
    const body = JSON.stringify({
      q: { _text_any: { patent_abstract: name } },
      f: ['patent_number', 'patent_title', 'patent_date', 'patent_abstract', 'assignee_organization'],
      o: { per_page: 10 },
    })

    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      ...fetchOptions,
    })
    if (!res.ok) return []
    const data = await res.json()

    return (data.patents ?? []).map((p: {
      patent_number: string
      patent_title: string
      patent_date: string
      patent_abstract: string
      assignees?: { assignee_organization?: string }[]
    }) => ({
      patentNumber: p.patent_number,
      title: p.patent_title ?? '',
      assignee: p.assignees?.[0]?.assignee_organization ?? 'Unknown',
      filingDate: p.patent_date ?? '',
      expiryDate: '',
      abstract: p.patent_abstract ?? '',
    }))
  } catch {
    return []
  }
}
