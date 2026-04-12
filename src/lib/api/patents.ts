import type { Patent } from '../types'

const BASE_URL = 'https://api.patentsview.org/patents/query'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getPatentsByMoleculeName(name: string): Promise<Patent[]> {
  try {
    const query = JSON.stringify({ _text_any: { patent_abstract: name } })
    const fields = JSON.stringify([
      'patent_number', 'patent_title', 'patent_date', 'patent_abstract',
    ])
    const opts = JSON.stringify({ per_page: 10 })

    const url = `${BASE_URL}?q=${encodeURIComponent(query)}&f=${encodeURIComponent(fields)}&o=${encodeURIComponent(opts)}`

    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const patents = data?.patents
    if (!Array.isArray(patents)) return []

    return patents.slice(0, 10).map((p: Record<string, unknown>) => ({
      id: String(p.patent_number || ''),
      patentNumber: String(p.patent_number || ''),
      title: String(p.patent_title || ''),
      assignee: String(
        (Array.isArray(p.assignees) && p.assignees[0]?.assignee_organization)
          ? p.assignees[0].assignee_organization
          : 'Unknown'
      ),
      filingDate: String(p.patent_date || ''),
      publicationDate: String(p.patent_date || ''),
      expirationDate: '',
      status: '',
      abstract: String(p.patent_abstract || '').slice(0, 300),
    }))
  } catch {
    return []
  }
}