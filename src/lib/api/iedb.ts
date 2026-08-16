import type { IEDBEpitope } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://www.iedb.org/api/v1'
const EBI_PROTEINS = 'https://www.ebi.ac.uk/proteins/api'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } }

/**
 * IEDB harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True 404 / zero-hit JSON remains []. IEDB REST 5xx falls through
 * to EBI Proteins antigen; if that fallback also fails, the error is thrown.
 */
function isAbsentStatus(status: number): boolean {
  return status === 404
}

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

function asHttpError(e: unknown): Error & { status?: number } {
  return e instanceof Error ? e : new Error(String(e))
}

function mapIedbResult(result: Record<string, unknown>, epitopeType = ''): IEDBEpitope {
  return {
    epitopeId: (result.epitope_id as number) ?? 0,
    name: (result.epitope_name as string) ?? '',
    sequence: (result.epitope_sequence as string) ?? (result.sequence as string) ?? '',
    length:
      (result.length as number) ??
      ((result.epitope_sequence as string) || (result.sequence as string) || '').length ??
      0,
    epitopeType: epitopeType || (result.epitope_type as string) || '',
    antigenName: (result.antigen_name as string) ?? (result.protein_name as string) ?? '',
    antigenId: (result.antigen_id as number) ?? (result.protein_id as number) ?? 0,
    organismName: (result.source_organism as string) ?? (result.organism as string) ?? '',
    organismId: (result.source_organism_id as number) ?? (result.organism_id as number) ?? 0,
    mhcRestriction: (result.mhc_restriction as string) ?? (result.mhc_allele as string) ?? '',
    assayCount: (result.assay_count as number) ?? 0,
    positiveAssayCount: (result.positive_count as number) ?? 0,
    source: 'IEDB',
    url: `https://www.iedb.org/epitope/${result.epitope_id}`,
  }
}

function dedupEpitopes(combined: IEDBEpitope[]): IEDBEpitope[] {
  const seen = new Set<number>()
  return combined.filter((e) => {
    if (!e.epitopeId || seen.has(e.epitopeId)) return false
    seen.add(e.epitopeId)
    return true
  })
}

async function iedbSearch(url: string, epitopeType = ''): Promise<IEDBEpitope[]> {
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'IEDB')
  const data = await res.json()
  return (data.results ?? []).map((r: Record<string, unknown>) => mapIedbResult(r, epitopeType))
}

export async function searchEpitopes(query: string): Promise<IEDBEpitope[]> {
  return iedbSearch(`${BASE_URL}/epitopeSearch?search=${encodeURIComponent(query)}&limit=20`)
}

export async function searchBEpitopes(proteinName: string): Promise<IEDBEpitope[]> {
  return iedbSearch(
    `${BASE_URL}/bcellSearch?protein=${encodeURIComponent(proteinName)}&limit=20`,
    'B cell',
  )
}

export async function searchTEpitopes(proteinName: string): Promise<IEDBEpitope[]> {
  return iedbSearch(
    `${BASE_URL}/tcellSearch?protein=${encodeURIComponent(proteinName)}&limit=20`,
    'T cell',
  )
}

/**
 * Free EBI Proteins antigen/epitope features for a UniProt accession.
 * Used when IEDB REST is unavailable (common).
 */
async function ebiAntigenEpitopes(accession: string): Promise<IEDBEpitope[]> {
  const url = `${EBI_PROTEINS}/antigen/${encodeURIComponent(accession)}`
  const res = await timedFetch(url, {
    ...fetchOptions,
    headers: { Accept: 'application/json' },
    timeoutMs: 8000,
  })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'IEDB')
  const data = await res.json()
  const features = Array.isArray(data) ? data : data.features ?? []
  const out: IEDBEpitope[] = []
  let i = 0
  for (const f of features as Array<Record<string, unknown>>) {
    const seq = String(f.peptide || f.sequence || f.description || '').trim()
    const peptideLike = /^[A-Z*]{6,}$/i.test(seq.replace(/\s/g, ''))
    const sequence = peptideLike ? seq.replace(/\s/g, '') : ''
    if (!sequence && !f.begin) continue
    i += 1
    out.push({
      epitopeId: i,
      name: String(f.type || f.category || 'antigen feature'),
      sequence: sequence || String(f.begin || '') + '-' + String(f.end || ''),
      length: sequence.length || 0,
      epitopeType: String(f.type || 'antigen'),
      antigenName: accession,
      antigenId: 0,
      organismName: 'Homo sapiens',
      organismId: 9606,
      mhcRestriction: '',
      assayCount: 0,
      positiveAssayCount: 0,
      source: 'EBI Proteins antigen (IEDB fallback)',
      url: `https://www.ebi.ac.uk/proteins/api/antigen/${accession}`,
    })
    if (out.length >= 20) break
  }
  return out
}

export async function getIEDBData(proteinName: string): Promise<{ epitopes: IEDBEpitope[] }> {
  const q = proteinName?.trim()
  if (!q) return { epitopes: [] }

  let primaryError: (Error & { status?: number }) | null = null
  const settled = await Promise.allSettled([
    searchEpitopes(q),
    searchBEpitopes(q),
    searchTEpitopes(q),
  ])
  const combined: IEDBEpitope[] = []
  for (const s of settled) {
    if (s.status === 'fulfilled') combined.push(...s.value)
    else if (!primaryError) primaryError = asHttpError(s.reason)
  }
  let unique = dedupEpitopes(combined)

  if (unique.length === 0) {
    try {
      if (/^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(q)) {
        unique = await ebiAntigenEpitopes(q.toUpperCase())
      } else {
        const { getUniprotEntriesByName } = await import('./uniprot')
        const entries = await getUniprotEntriesByName(q)
        for (const e of entries.slice(0, 2)) {
          if (!e.accession) continue
          const rows = await ebiAntigenEpitopes(e.accession)
          if (rows.length) {
            unique = rows
            break
          }
        }
      }
    } catch (e) {
      if (primaryError) throw primaryError
      throw e
    }
    if (unique.length === 0 && primaryError) throw primaryError
  }

  return { epitopes: unique.slice(0, 25) }
}
