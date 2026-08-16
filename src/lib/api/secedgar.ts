import type { SecFiling } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://efts.sec.gov/LATEST/search-index'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * SEC EDGAR harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True 404 / zero-hit JSON remains [].
 */
function isAbsentStatus(status: number): boolean {
  return status === 404
}

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

export async function getSecFilingsByName(name: string): Promise<SecFiling[]> {
  const url = `${BASE_URL}?q=${encodeURIComponent(`"${name}"`)}&dateRange=custom&startdt=2020-01-01&forms=10-K,10-Q`
  const res = await timedFetch(url, {
    headers: {
      'User-Agent': 'kNIHexplorer research@nihexplorer.example.com',
    },
    ...fetchOptions,
    timeoutMs: 8000,
  })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'SEC EDGAR')
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
}
