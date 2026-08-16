import type { Patent } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

function isAbsentStatus(status: number): boolean {
  // PubChem uses 404 (and sometimes 400) when a name/CID has no PatentID xrefs.
  return status === 404 || status === 400
}

function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

function parsePatentIds(data: unknown): string[] {
  const rec = data as {
    InformationList?: { Information?: Array<{ PatentID?: string[] }> }
  }
  const ids: string[] =
    rec?.InformationList?.Information?.[0]?.PatentID ??
    rec?.InformationList?.Information?.flatMap((i) => i.PatentID ?? []) ??
    []
  return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && id.trim()) : []
}

/**
 * Free patent IDs via PubChem compound xrefs (PatentsView legacy API is migrating
 * to USPTO ODP and is not reliably free/keyless).
 * https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
 *
 * HTTP 5xx / HTML / timeout are not EMPTY. PubChem 404/400 (no xrefs) remains [].
 */
export async function getPatentsByMoleculeName(name: string): Promise<Patent[]> {
  const q = name?.trim()
  if (!q) return []

  // Prefer name → PatentID xrefs
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(q)}/xrefs/PatentID/JSON`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) {
    if (/^\d+$/.test(q)) {
      return getPatentsByCid(parseInt(q, 10))
    }
    return []
  }
  throwIfHttpFailed(res, 'PubChem patents')
  const ids = parsePatentIds(await res.json())
  if (ids.length === 0) return []

  return ids.slice(0, 15).map((pid) => mapPatent(String(pid)))
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
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/xrefs/PatentID/JSON`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'PubChem patents')
  const ids = parsePatentIds(await res.json())
  return ids.slice(0, 15).map((pid) => mapPatent(String(pid)))
}
