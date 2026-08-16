import type { MeshTerm } from '../types'
import { stripHtml } from '../utils'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * MeSH harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit JSON remains [].
 */
function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

export async function getMeshTermsByName(name: string): Promise<MeshTerm[]> {
  const q = (name || '').trim()
  if (!q) return []

  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=mesh&term=${encodeURIComponent(q)}&retmode=json&retmax=${LIMITS.DEFAULT_INITIAL}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(searchRes, 'MeSH')
  const searchData = await searchRes.json()

  const uids: string[] = searchData?.esearchresult?.idlist ?? []
  if (uids.length === 0) return []

  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=mesh&id=${uids.join(',')}&retmode=json`
  const summaryRes = await timedFetch(summaryUrl, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(summaryRes, 'MeSH')
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
}