import type { DrugPrice } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/** Medicaid NADAC 2025 dataset (Socrata legacy a4y5-998d retired). */
const NADAC_DATASET = 'f38d0706-1239-442c-a3cc-40ef1b686ac0'
const NADAC_QUERY = `https://data.medicaid.gov/api/1/datastore/query/${NADAC_DATASET}/0`

/**
 * Free NADAC unit prices by drug name (substring match on ndc_description).
 */
export async function getDrugPricesByName(name: string): Promise<DrugPrice[]> {
  try {
    const q = name?.trim()
    if (!q || q.length < 2) return []

    const params = new URLSearchParams()
    params.set('limit', '15')
    params.set('conditions[0][property]', 'ndc_description')
    params.set('conditions[0][value]', q.toUpperCase())
    params.set('conditions[0][operator]', 'contains')

    const res = await fetch(`${NADAC_QUERY}?${params.toString()}`, fetchOptions)
    if (!res.ok) return []
    const data = (await res.json()) as {
      results?: Record<string, string>[]
    }
    const rows = data.results ?? []
    if (!Array.isArray(rows) || rows.length === 0) return []

    // Prefer most recent effective_date when present
    const sorted = [...rows].sort((a, b) =>
      String(b.effective_date || '').localeCompare(String(a.effective_date || '')),
    )

    return sorted.slice(0, 10).map((r) => ({
      ndcCode: r.ndc ?? '',
      ndcDescription: r.ndc_description ?? '',
      nadacPerUnit: Number(r.nadac_per_unit) || 0,
      effectiveDate: r.effective_date ?? '',
      pharmacyType: r.pharmacy_type_indicator || r.pharmacy_type_code || 'RETAIL',
      pricingUnit: r.pricing_unit ?? '',
      url: 'https://data.medicaid.gov/dataset/f38d0706-1239-442c-a3cc-40ef1b686ac0',
    }))
  } catch {
    return []
  }
}
