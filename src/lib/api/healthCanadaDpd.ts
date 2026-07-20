/**
 * Health Canada Drug Product Database (DPD) — free public API, no key.
 * FDA-adjacent: DIN, brand, company, status, ingredients.
 * @see https://health-products.canada.ca/api/documentation/dpd-documentation-en.html
 * @see docs/design/public-apis-international.md
 */

export interface HealthCanadaDpdProduct {
  drugCode: number
  din: string
  brandName: string
  companyName: string
  className: string
  descriptor: string
  numberOfAis: string
  lastUpdateDate: string
  status: string
  historyDate: string
  originalMarketDate: string
  forms: string[]
  routes: string[]
  ingredients: Array<{
    name: string
    strength: string
    strengthUnit: string
  }>
  /** Public DPD search deep link */
  url: string
}

const BASE = 'https://health-products.canada.ca/api/drug'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

function dpdSearchUrl(brandOrDin: string): string {
  return `https://health-products.canada.ca/dpd-bdpp/dispatch-repartition.do?lang=en&type=search&q=${encodeURIComponent(brandOrDin)}`
}

/**
 * Search DPD by brand name (substring match on Health Canada API).
 * Enriches top hits with status, form, route, active ingredients.
 */
export async function getHealthCanadaProductsByName(
  name: string,
  limit = 12,
): Promise<HealthCanadaDpdProduct[]> {
  const q = name.trim()
  if (!q || q.length < 2) return []

  type DrugProductRow = {
    drug_code?: number
    drug_identification_number?: string
    brand_name?: string
    company_name?: string
    class_name?: string
    descriptor?: string
    number_of_ais?: string
    last_update_date?: string
  }

  const listUrl = `${BASE}/drugproduct/?brandname=${encodeURIComponent(q)}&lang=en&type=json`
  const raw = await fetchJson<DrugProductRow[] | DrugProductRow>(listUrl)
  const rows = asArray(raw).slice(0, Math.min(25, Math.max(1, limit)))
  if (rows.length === 0) return []

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const code = Number(row.drug_code)
      if (!Number.isFinite(code) || code <= 0) return null

      const [statusRaw, formRaw, routeRaw, ingRaw] = await Promise.all([
        fetchJson<
          | { status?: string; history_date?: string; original_market_date?: string }
          | Array<{ status?: string; history_date?: string; original_market_date?: string }>
        >(`${BASE}/status/?id=${code}&lang=en&type=json`),
        fetchJson<
          | { pharmaceutical_form_name?: string }
          | Array<{ pharmaceutical_form_name?: string }>
        >(`${BASE}/form/?id=${code}&lang=en&type=json`),
        fetchJson<
          | { route_of_administration_name?: string }
          | Array<{ route_of_administration_name?: string }>
        >(`${BASE}/route/?id=${code}&lang=en&type=json`),
        fetchJson<
          | {
              ingredient_name?: string
              strength?: string
              strength_unit?: string
            }
          | Array<{
              ingredient_name?: string
              strength?: string
              strength_unit?: string
            }>
        >(`${BASE}/activeingredient/?id=${code}&lang=en&type=json`),
      ])

      const statusRow = asArray(statusRaw)[0]
      const din = String(row.drug_identification_number ?? '').trim()
      const brand = String(row.brand_name ?? '').trim()

      return {
        drugCode: code,
        din,
        brandName: brand,
        companyName: String(row.company_name ?? '').trim(),
        className: String(row.class_name ?? '').trim(),
        descriptor: String(row.descriptor ?? '').trim(),
        numberOfAis: String(row.number_of_ais ?? '').trim(),
        lastUpdateDate: String(row.last_update_date ?? '').trim(),
        status: String(statusRow?.status ?? '').trim() || 'Unknown',
        historyDate: String(statusRow?.history_date ?? '').trim(),
        originalMarketDate: String(statusRow?.original_market_date ?? '').trim(),
        forms: asArray(formRaw)
          .map((f) => String(f.pharmaceutical_form_name ?? '').trim())
          .filter(Boolean),
        routes: asArray(routeRaw)
          .map((r) => String(r.route_of_administration_name ?? '').trim())
          .filter(Boolean),
        ingredients: asArray(ingRaw)
          .map((i) => ({
            name: String(i.ingredient_name ?? '').trim(),
            strength: String(i.strength ?? '').trim(),
            strengthUnit: String(i.strength_unit ?? '').trim(),
          }))
          .filter((i) => i.name),
        url: dpdSearchUrl(din || brand || q),
      } satisfies HealthCanadaDpdProduct
    }),
  )

  return enriched.filter((x): x is HealthCanadaDpdProduct => x != null).slice(0, limit)
}
