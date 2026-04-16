import type { NdcProduct } from '../types'
import { getApiKey } from './utils'

const BASE_URL = 'https://api.fda.gov/drug/ndc.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getNdcProductsByName(name: string): Promise<NdcProduct[]> {
  try {
    const encoded = encodeURIComponent(name)
    const apiKey = getApiKey('OPENFDA_API_KEY')
    const apiKeyParam = apiKey ? `&api_key=${apiKey}` : ''
    const url = `${BASE_URL}?search=brand_name:"${encoded}"+generic_name:"${encoded}"&limit=10${apiKeyParam}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? []).slice(0, 10).map((r: {
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
      const productNdc = r.product_ndc ?? ''
      const routeArr = r.route ?? []
      return {
        productNdc,
        brandName: r.brand_name ?? '',
        genericName: r.generic_name ?? '',
        dosageForm: r.dosage_form ?? '',
        route: Array.isArray(routeArr) ? routeArr.join(', ') : String(routeArr),
        marketingCategory: r.marketing_category ?? '',
        labelerName: r.labeler_name ?? '',
        productType: r.product_type ?? '',
        pharmClass: r.openfda?.pharm_class_epc ?? [],
        url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${productNdc}`,
      }
    })
  } catch {
    return []
  }
}
