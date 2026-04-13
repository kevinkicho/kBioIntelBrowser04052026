import type { SecFiling } from '../types'

const BASE_URL = 'https://efts.sec.gov/LATEST/search-index'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getSecFilingsByName(name: string): Promise<SecFiling[]> {
  try {
    const url = `${BASE_URL}?q=${encodeURIComponent(`"${name}"`)}&dateRange=custom&startdt=2020-01-01&forms=10-K,10-Q`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'kNIHexplorer research@nihexplorer.example.com',
      },
      ...fetchOptions,
    })
    if (!res.ok) return []
    const data = await res.json()

    const hits = data.hits?.hits ?? []
    return hits.map((hit: {
      _id: string
      _source: {
        display_names?: string[]
        ciks?: string[]
        file_date?: string
        form?: string
        root_forms?: string[]
        period_ending?: string
        adsh?: string
        file_description?: string
      }
    }) => {
      const src = hit._source
      const adsh = src.adsh || ''
      const cik = src.ciks?.[0] || ''
      const filingId = adsh || hit._id.split(':')[0]
      const formType = src.root_forms?.[0] || src.form || ''

      return {
        filingId,
        companyName: src.display_names?.[0]?.replace(/\s*\(CIK\s+\d+\)\s*$/, '').trim() || 'Unknown',
        cik,
        formType,
        filingDate: src.file_date || '',
        description: src.file_description || (src.period_ending ? `Period: ${src.period_ending}` : ''),
        url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${formType}&dateb=&owner=include&count=10`,
      }
    })
  } catch {
    return []
  }
}