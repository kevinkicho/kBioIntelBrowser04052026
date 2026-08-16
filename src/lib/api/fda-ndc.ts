import type { NdcProduct } from '../types'
import { getApiKey } from './utils'
import { ndcProductDeepLink, normalizeProductNdc } from '../ndcLinks'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://api.fda.gov/drug/ndc.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * FDA NDC Directory harvest leaf (openFDA). HTTP / HTML / timeout are not EMPTY.
 * True 404 (no matches) and zero-hit JSON remain [].
 */
function isAbsentStatus(status: number): boolean {
  // openFDA returns 404 when a drug name has no NDC matches.
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

export async function getNdcProductsByName(name: string): Promise<NdcProduct[]> {
  const encoded = encodeURIComponent(name)
  const apiKey = getApiKey('OPENFDA_API_KEY')
  const apiKeyParam = apiKey ? `&api_key=${apiKey}` : ''
  const url = `${BASE_URL}?search=brand_name:"${encoded}"+generic_name:"${encoded}"&limit=10${apiKeyParam}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'FDA NDC')
  const data = await res.json()

  return (data.results ?? []).slice(0, 10).map(
    (r: {
      product_ndc?: string
      brand_name?: string
      generic_name?: string
      dosage_form?: string
      route?: string[]
      marketing_category?: string
      labeler_name?: string
      product_type?: string
      openfda?: { pharm_class_epc?: string[] }
    }) => {
      const productNdc = normalizeProductNdc(r.product_ndc) || r.product_ndc || ''
      const brandName = r.brand_name ?? ''
      const genericName = r.generic_name ?? ''
      const routeArr = r.route ?? []
      const deep = ndcProductDeepLink({
        productNdc,
        brandName,
        genericName,
      })
      return {
        productNdc,
        brandName,
        genericName,
        dosageForm: r.dosage_form ?? '',
        route: Array.isArray(routeArr) ? routeArr.join(', ') : String(routeArr),
        marketingCategory: r.marketing_category ?? '',
        labelerName: r.labeler_name ?? '',
        productType: r.product_type ?? '',
        pharmClass: r.openfda?.pharm_class_epc ?? [],
        url: deep,
      } satisfies NdcProduct
    },
  )
}
