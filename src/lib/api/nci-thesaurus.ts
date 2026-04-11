import type { NciConcept } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getNciConceptsByName(name: string): Promise<NciConcept[]> {
  try {
    const res = await fetch(
      `https://api-evsrest.nci.nih.gov/api/v1/concept/ncit/search?term=${encodeURIComponent(name)}&type=contains&pageSize=10`,
      fetchOptions,
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.concepts ?? []).slice(0, 10).map((c: {
      code?: string
      name?: string
      terminology?: string
      conceptStatus?: string
      leaf?: boolean
    }) => ({
      code: String(c.code ?? ''),
      name: String(c.name ?? ''),
      terminology: String(c.terminology ?? ''),
      conceptStatus: String(c.conceptStatus ?? 'DEFAULT'),
      leaf: Boolean(c.leaf),
      url: `https://ncit.nci.nih.gov/ncitbrowser/ConceptReport.jsp?dictionary=NCI_Thesaurus&code=${c.code}`,
    }))
  } catch {
    return []
  }
}
