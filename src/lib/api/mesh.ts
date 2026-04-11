import type { MeshTerm } from '../types'
import { LIMITS } from '../api-limits'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getMeshTermsByName(name: string): Promise<MeshTerm[]> {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=mesh&term=${encodeURIComponent(name)}&retmode=json&retmax=${LIMITS.DEFAULT_INITIAL}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()

    const uids: string[] = searchData?.esearchresult?.idlist ?? []
    if (uids.length === 0) return []

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=mesh&id=${uids.join(',')}&retmode=json`
    const summaryRes = await fetch(summaryUrl, fetchOptions)
    if (!summaryRes.ok) return []
    const summaryData = await summaryRes.json()

    const result = summaryData?.result ?? {}
    return uids
      .filter(uid => result[uid])
      .map(uid => {
        const entry = result[uid] as Record<string, unknown>
        const meshTerms = (entry.ds_meshterms as string[]) ?? []
        return {
          meshId: uid,
          termName: meshTerms[0] ?? uid,
          name: meshTerms[0] ?? uid,
          definition: (entry.ds_scopenote as string) ?? '',
          scopeNote: (entry.ds_scopenote as string) ?? '',
          treeNumbers: [] as string[],
          relatedTerms: [] as string[],
          url: `https://meshb.nlm.nih.gov/record/ui?ui=${uid}`,
        }
      })
  } catch {
    return []
  }
}
