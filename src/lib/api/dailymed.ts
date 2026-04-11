import type { DrugLabel } from '../types'

const BASE_URL = 'https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getDrugLabelsByName(name: string): Promise<DrugLabel[]> {
  try {
    const url = `${BASE_URL}?drug_name=${encodeURIComponent(name)}&page_size=5`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.data ?? []).map((entry: {
      setid?: string; title?: string; published_date?: string
      products?: { dosage_form?: string; route?: string; labeler_name?: string }[]
    }) => {
      const product = entry.products?.[0]
      return {
        title: entry.title ?? '',
        setId: entry.setid ?? '',
        publishedDate: entry.published_date ?? '',
        dosageForm: product?.dosage_form ?? '',
        route: product?.route ?? '',
        labelerName: product?.labeler_name ?? '',
        dailyMedUrl: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${entry.setid ?? ''}`,
      }
    })
  } catch {
    return []
  }
}
