import type { MeshTerm } from '../types'
import { stripHtml } from '../utils'
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
        const meshUi = String(entry.ds_meshui ?? uid)
        return {
          meshId: meshUi,
          termName: meshTerms[0] ?? uid,
          name: meshTerms[0] ?? uid,
          definition: stripHtml((entry.ds_scopenote as string) ?? ''),
          scopeNote: stripHtml((entry.ds_scopenote as string) ?? ''),
          treeNumbers: ((entry.ds_idxlinks as Array<Record<string, unknown>>) ?? []).map((l: Record<string, unknown>) => String(l.treenum ?? '')).filter(Boolean),
          relatedTerms: (entry.ds_seerelated as string[]) ?? [],
          url: `https://meshb.nlm.nih.gov/record/ui?ui=${meshUi}`,
        }
      })
  } catch {
    return []
  }
}
