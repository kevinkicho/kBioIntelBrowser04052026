import type { DrugPrice } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

function twoYearsAgo(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 2)
  return d.toISOString().slice(0, 10)
}

export async function getDrugPricesByName(name: string): Promise<DrugPrice[]> {
  try {
    const cutoff = twoYearsAgo()
    const where = `upper(ndc_description) like upper('%25${name}%25') AND effective_date > '${cutoff}'`
    const url = `https://data.medicaid.gov/resource/a4y5-998d.json?$where=${encodeURIComponent(where)}&$limit=10&$order=effective_date DESC`

    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data as Record<string, string>[]).map(r => ({
      ndcCode: r.ndc ?? '',
      ndcDescription: r.ndc_description ?? '',
      nadacPerUnit: Number(r.nadac_per_unit) || 0,
      effectiveDate: r.effective_date ?? '',
      pharmacyType: r.pharmacy_type_code || 'RETAIL',
      pricingUnit: r.pricing_unit ?? '',
      url: 'https://data.medicaid.gov/dataset/nadac',
    }))
  } catch {
    return []
  }
}
