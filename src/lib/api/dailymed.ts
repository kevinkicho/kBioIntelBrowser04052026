import type { DrugLabel } from '../types'
import { dailyMedLabelUrl, dailyMedSearchUrl, normalizeDailyMedSetId } from '../dailymedLinks'

const BASE_URL = 'https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getDrugLabelsByName(name: string): Promise<DrugLabel[]> {
  try {
    const url = `${BASE_URL}?drug_name=${encodeURIComponent(name)}&page_size=5`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.data ?? []).map(
      (entry: {
        setid?: string
        title?: string
        published_date?: string
        products?: { dosage_form?: string; route?: string; labeler_name?: string }[]
      }) => {
        const product = entry.products?.[0]
        const setId = normalizeDailyMedSetId(entry.setid) || entry.setid || ''
        const title = entry.title ?? ''
        const labelUrl =
          dailyMedLabelUrl(setId) ||
          dailyMedSearchUrl(title || name) ||
          'https://dailymed.nlm.nih.gov/dailymed/index.cfm'

        return {
          title,
          setId,
          publishedDate: entry.published_date ?? '',
          dosageForm: product?.dosage_form ?? '',
          route: product?.route ?? '',
          labelerName: product?.labeler_name ?? '',
          // Canonical deep link to the SPL label page (not API/search homepage)
          dailyMedUrl: labelUrl,
          url: labelUrl,
        } satisfies DrugLabel
      },
    )
  } catch {
    return []
  }
}
