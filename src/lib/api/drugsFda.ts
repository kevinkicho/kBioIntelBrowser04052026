/**
 * openFDA Drugs@FDA — free public NDA/ANDA/BLA application + product rows.
 * Complements Orange Book (TE codes) and biologicsLicensed (BLA-focused).
 * Not regulatory decision support.
 * @see https://open.fda.gov/apis/drug/drugsfda/
 */

import { getApiKey } from './utils'

const BASE_URL = 'https://api.fda.gov/drug/drugsfda.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export interface DrugsFdaProduct {
  brandName: string
  activeIngredients: string
  dosageForm: string
  route: string
  marketingStatus: string
}

export interface DrugsFdaApplication {
  applicationNumber: string
  sponsorName: string
  submissionType: string
  /** First product brand or ingredient summary */
  brandName: string
  genericName: string
  products: DrugsFdaProduct[]
  approvalDate: string | null
  drugsAtFdaUrl: string
  openFdaUrl: string
}

function keyParam(): string {
  const k = getApiKey('OPENFDA_API_KEY')
  return k ? `&api_key=${encodeURIComponent(k)}` : ''
}

export function drugsAtFdaOverviewUrl(applicationNumber: string): string {
  const app = applicationNumber.trim().toUpperCase().replace(/^NDA|^ANDA|^BLA/i, (m) => m)
  const digits = app.replace(/\D/g, '')
  if (!digits) return 'https://www.accessdata.fda.gov/scripts/cder/daf/'
  return `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${encodeURIComponent(digits)}`
}

/**
 * Search Drugs@FDA by brand, generic, or active ingredient name.
 */
export async function getDrugsFdaByName(
  name: string,
  limit = 15,
): Promise<DrugsFdaApplication[]> {
  const q = name.trim()
  if (q.length < 2) return []
  try {
    const enc = encodeURIComponent(`"${q}"`)
    // Broad free-text OR across brand / generic / ingredient fields (openFDA uses +OR+)
    const search = [
      `products.brand_name:${enc}`,
      `openfda.brand_name:${enc}`,
      `openfda.generic_name:${enc}`,
      `products.active_ingredients.name:${enc}`,
    ].join('+OR+')
    const url = `${BASE_URL}?search=${search}&limit=${Math.min(25, Math.max(1, limit))}${keyParam()}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = (await res.json()) as {
      results?: Array<{
        application_number?: string
        sponsor_name?: string
        submissions?: Array<{
          submission_type?: string
          submission_status_date?: string
        }>
        products?: Array<{
          brand_name?: string
          active_ingredients?: Array<{ name?: string; strength?: string }>
          dosage_form?: string
          route?: string
          marketing_status?: string
        }>
        openfda?: {
          brand_name?: string[]
          generic_name?: string[]
          application_number?: string[]
        }
      }>
    }

    const out: DrugsFdaApplication[] = []
    const seen = new Set<string>()
    for (const r of data.results ?? []) {
      const appNo = String(r.application_number || r.openfda?.application_number?.[0] || '').trim()
      if (!appNo || seen.has(appNo)) continue
      seen.add(appNo)
      const products: DrugsFdaProduct[] = (r.products ?? []).slice(0, 8).map((p) => ({
        brandName: String(p.brand_name || '').trim(),
        activeIngredients: (p.active_ingredients ?? [])
          .map((a) => [a.name, a.strength].filter(Boolean).join(' '))
          .filter(Boolean)
          .join('; '),
        dosageForm: String(p.dosage_form || '').trim(),
        route: String(p.route || '').trim(),
        marketingStatus: String(p.marketing_status || '').trim(),
      }))
      const brandName =
        products[0]?.brandName ||
        r.openfda?.brand_name?.[0] ||
        r.openfda?.generic_name?.[0] ||
        q
      const genericName = r.openfda?.generic_name?.[0] || products[0]?.activeIngredients || ''
      const firstSub = r.submissions?.[0]
      out.push({
        applicationNumber: appNo,
        sponsorName: String(r.sponsor_name || '').trim() || 'Unknown sponsor',
        submissionType: String(firstSub?.submission_type || '').trim(),
        brandName,
        genericName,
        products,
        approvalDate: firstSub?.submission_status_date
          ? String(firstSub.submission_status_date)
          : null,
        drugsAtFdaUrl: drugsAtFdaOverviewUrl(appNo),
        openFdaUrl: `https://api.fda.gov/drug/drugsfda.json?search=application_number:"${encodeURIComponent(appNo)}"`,
      })
    }
    return out
  } catch {
    return []
  }
}
