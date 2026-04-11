import type { SecFiling } from '../types'

const BASE_URL = 'https://efts.sec.gov/LATEST/search-index'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getSecFilingsByName(name: string): Promise<SecFiling[]> {
  try {
    const url = `${BASE_URL}?q=${encodeURIComponent(name)}&dateRange=custom&startdt=2020-01-01&forms=10-K`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BioIntel Explorer research@biointel.example.com',
      },
      ...fetchOptions,
    })
    if (!res.ok) return []
    const data = await res.json()

    const hits = data.hits?.hits ?? []
    return hits.map((hit: {
      _source: {
        display_names?: string[]
        entity_id?: string
        file_date?: string
        form_type?: string
        period_of_report?: string
      }
      _id: string
    }) => {
      const src = hit._source
       const filingId = hit._id.replace(/-/g, '')
       return {
         filingId,
         companyName: src.display_names?.[0] ?? 'Unknown',
         cik: src.entity_id ?? '',
         formType: src.form_type ?? '10-K',
         filingDate: src.file_date ?? '',
         description: src.period_of_report ? `Period: ${src.period_of_report}` : '',
         url: `https://www.sec.gov/Archives/edgar/data/${src.entity_id}/${filingId}`,
       }
    })
  } catch {
    return []
  }
}
