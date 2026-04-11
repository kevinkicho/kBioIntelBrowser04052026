import type { OrangeBookEntry } from '../types'

const BASE_URL = 'https://api.fda.gov/drug/drugsfda.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

function twoYearsAgoCompact(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 2)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

export async function getOrangeBookByName(name: string): Promise<OrangeBookEntry[]> {
  try {
    const apiKey = process.env.OPENFDA_API_KEY
    const keyParam = apiKey ? `&api_key=${apiKey}` : ''
    const encoded = encodeURIComponent(name)
    const dateFilter = `+AND+submissions.submission_date:[${twoYearsAgoCompact()}+TO+${new Date().toISOString().slice(0, 10).replace(/-/g, '')}]`
    const url = `${BASE_URL}?search=openfda.generic_name:"${encoded}"${dateFilter}&limit=10${keyParam}`

    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? []).map((r: {
      application_number?: string
      sponsor_name?: string
      submissions?: { submission_date?: string; submission_type?: string }[]
      products?: {
        active_ingredients?: { name?: string }[]
        dosage_form?: string
        te_code?: string
      }[]
      openfda?: { patent_number?: string[]; patent_date?: string[] }
    }) => {
      const product = r.products?.[0]
      const approvalSub = r.submissions?.find(s => s.submission_type === 'ORIG')
      const rawDate = approvalSub?.submission_date ?? r.submissions?.[0]?.submission_date ?? ''
      const approvalDate = rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : rawDate

      const patents: { patentNumber: string; expiryDate: string }[] = []
      const patentNums = r.openfda?.patent_number ?? []
      const patentDates = r.openfda?.patent_date ?? []
      for (let i = 0; i < patentNums.length; i++) {
        patents.push({
          patentNumber: patentNums[i],
          expiryDate: patentDates[i] ?? '',
        })
      }

      return {
        applicationNumber: r.application_number ?? '',
        sponsorName: r.sponsor_name ?? '',
        approvalDate,
        activeIngredient: product?.active_ingredients?.[0]?.name ?? '',
        dosageForm: product?.dosage_form ?? '',
        teCode: product?.te_code ?? '',
        patents,
        exclusivities: [],
      }
    })
  } catch {
    return []
  }
}
