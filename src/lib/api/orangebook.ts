import type { OrangeBookEntry } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://api.fda.gov/drug/drugsfda.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Orange Book harvest leaf (openFDA Drugs@FDA). HTTP / HTML / timeout are not EMPTY.
 * True 404 (no matches) and zero-hit JSON remain [].
 */
function isAbsentStatus(status: number): boolean {
  // openFDA returns 404 when a drug name has no Drugs@FDA matches.
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

export async function getOrangeBookByName(name: string): Promise<OrangeBookEntry[]> {
  const apiKey = process.env.OPENFDA_API_KEY
  const keyParam = apiKey ? `&api_key=${apiKey}` : ''
  const encoded = encodeURIComponent(name)
  // Match generic OR brand (AND never matches both labels). Do not require a
  // recent submission_date — origin approvals are decades old for many drugs.
  const search = `openfda.generic_name:"${encoded}"+openfda.brand_name:"${encoded}"`
  const url = `${BASE_URL}?search=${search}&limit=10${keyParam}`

  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'Orange Book')
  const data = await res.json()

  return (data.results ?? []).map((r: {
    application_number?: string
    sponsor_name?: string
    submissions?: { submission_date?: string; submission_type?: string }[]
    products?: {
      active_ingredients?: { name?: string }[]
      dosage_form?: string
      te_code?: string
    }[]
    openfda?: { patent_number?: string[]; patent_date?: string[] }
  }) => {
    const product = r.products?.[0]
    const approvalSub = r.submissions?.find(s => s.submission_type === 'ORIG')
    const rawDate = approvalSub?.submission_date ?? r.submissions?.[0]?.submission_date ?? ''
    const approvalDate = rawDate.length === 8
      ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
      : rawDate

    const patents: { patentNumber: string; expiryDate: string }[] = []
    const patentNums = r.openfda?.patent_number ?? []
    const patentDates = r.openfda?.patent_date ?? []
    for (let i = 0; i < patentNums.length; i++) {
      patents.push({
        patentNumber: patentNums[i],
        expiryDate: patentDates[i] ?? '',
      })
    }

    return {
      applicationNumber: r.application_number ?? '',
      sponsorName: r.sponsor_name ?? '',
      approvalDate,
      activeIngredient: product?.active_ingredients?.[0]?.name ?? '',
      dosageForm: product?.dosage_form ?? '',
      teCode: product?.te_code ?? '',
      patents,
      exclusivities: [],
    }
  })
}
