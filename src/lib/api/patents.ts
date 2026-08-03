import type { Patent } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Free patent IDs via PubChem compound xrefs (PatentsView legacy API is migrating
 * to USPTO ODP and is not reliably free/keyless).
 * https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
 */
export async function getPatentsByMoleculeName(name: string): Promise<Patent[]> {
  try {
    const q = name?.trim()
    if (!q) return []

    // Prefer name → PatentID xrefs
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(q)}/xrefs/PatentID/JSON`
    const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
    if (!res.ok) {
      // Fallback: CID if numeric
      if (/^\d+$/.test(q)) {
        return getPatentsByCid(parseInt(q, 10))
      }
      return []
    }
    const data = await res.json()
    const ids: string[] =
      data?.InformationList?.Information?.[0]?.PatentID ??
      data?.InformationList?.Information?.flatMap(
        (i: { PatentID?: string[] }) => i.PatentID ?? [],
      ) ??
      []
    if (!Array.isArray(ids) || ids.length === 0) return []

    return ids.slice(0, 15).map((pid) => mapPatent(String(pid)))
  } catch {
    return []
  }
}

function mapPatent(patentNumber: string): Patent {
  return {
    id: patentNumber,
    patentNumber,
    title: `Patent ${patentNumber}`,
    assignee: '',
    filingDate: '',
    publicationDate: '',
    expirationDate: '',
    status: '',
    abstract: patentNumber
      ? `PubChem patent xref ${patentNumber} (open https://patents.google.com/patent/${encodeURIComponent(patentNumber)})`
      : '',
  }
}

async function getPatentsByCid(cid: number): Promise<Patent[]> {
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/xrefs/PatentID/JSON`
    const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
    if (!res.ok) return []
    const data = await res.json()
    const ids: string[] = data?.InformationList?.Information?.[0]?.PatentID ?? []
    if (!Array.isArray(ids)) return []
    return ids.slice(0, 15).map((pid) => mapPatent(String(pid)))
  } catch {
    return []
  }
}
