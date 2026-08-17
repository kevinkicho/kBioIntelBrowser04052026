import type { CompanyProduct } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://api.fda.gov/drug'
const fetchOptions: RequestInit = { next: { revalidate: 3600 } }

function buildUrl(ingredient: string, limit: number): string {
  const apiKey = process.env.OPENFDA_API_KEY
  const keyParam = apiKey ? `&api_key=${apiKey}` : ''
  const encoded = encodeURIComponent(`"${ingredient}"`)
  return `${BASE_URL}/label.json?search=active_ingredient:${encoded}&limit=${limit}${keyParam}`
}

function isAbsentStatus(status: number): boolean {
  // openFDA returns 404 when an ingredient has no label matches.
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

/**
 * openFDA label / companies leaf. HTTP 5xx / HTML / timeout / network are not EMPTY.
 * Blank query and true 404 (no matches) remain [].
 */
export async function getDrugsByIngredient(ingredient: string, limit: number = LIMITS.OPENFDA.initial): Promise<CompanyProduct[]> {
  const q = (ingredient || '').trim()
  if (!q) return []

  const res = await timedFetch(buildUrl(q, limit), { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'openFDA companies')
  const data = await res.json()

  const results: CompanyProduct[] = []
  for (const r of data.results ?? []) {
    const openfda = r.openfda ?? {}
    const manufacturers: string[] = openfda.manufacturer_name ?? ['Unknown']
    const brandNames: string[] = openfda.brand_name ?? ['Unknown']
    const genericNames: string[] = openfda.generic_name ?? ['Unknown']

    results.push({
      company: manufacturers[0],
      brandName: brandNames[0],
      genericName: genericNames[0],
      productType: (openfda.product_type ?? ['Unknown'])[0],
      route: (openfda.route ?? ['Unknown'])[0],
      applicationNumber: (openfda.application_number ?? [])[0],
    })
  }

  const seen = new Set<string>()
  return results.filter(r => {
    if (seen.has(r.brandName)) return false
    seen.add(r.brandName)
    return true
  })
}
