import type { CompanyProduct } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://api.fda.gov/drug'
const fetchOptions: RequestInit = { next: { revalidate: 3600 } }

function buildUrl(ingredient: string, limit: number): string {
  const apiKey = process.env.OPENFDA_API_KEY
  const keyParam = apiKey ? `&api_key=${apiKey}` : ''
  const encoded = encodeURIComponent(`"${ingredient}"`)
  return `${BASE_URL}/label.json?search=active_ingredient:${encoded}&limit=${limit}${keyParam}`
}

export async function getDrugsByIngredient(ingredient: string, limit: number = LIMITS.OPENFDA.initial): Promise<CompanyProduct[]> {
  try {
    const res = await fetch(buildUrl(ingredient, limit), fetchOptions)
    if (!res.ok) return []
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

    // Deduplicate by brand name
    const seen = new Set<string>()
    return results.filter(r => {
      if (seen.has(r.brandName)) return false
      seen.add(r.brandName)
      return true
    })
  } catch {
    return []
  }
}