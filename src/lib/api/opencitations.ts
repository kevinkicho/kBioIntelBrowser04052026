import type { CitationMetric } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * OpenCitations harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * Blank / invalid DOI lists, 404, and zero-hit JSON remain empty.
 * The four OC endpoints are same-source fallbacks. All-fail throws.
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

type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown }

function normalizeDoi(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim()
}

function parseIds(idField: string | undefined): {
  openAlexId?: string
  pmid?: string
} {
  if (!idField) return {}
  const openAlex = idField.match(/openalex:(W\d+)/i)?.[1]
  const pmid = idField.match(/pmid:(\d+)/i)?.[1]
  return {
    openAlexId: openAlex,
    pmid,
  }
}

/** Strip OpenCitations bracket ids from author / venue strings. */
function cleanOcText(raw: string | undefined, maxLen = 160): string {
  if (!raw) return ''
  const cleaned = raw
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\s+/g, ' ')
    .trim()
  if (cleaned.length <= maxLen) return cleaned
  return `${cleaned.slice(0, maxLen - 1)}…`
}

function yearFromPubDate(pubDate: string | undefined): string | undefined {
  if (!pubDate) return undefined
  const m = pubDate.match(/^(\d{4})/)
  return m?.[1]
}

async function fetchJson(url: string): Promise<unknown | null> {
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return null
  throwIfHttpFailed(res, 'OpenCitations')
  return await res.json()
}

async function fetchJsonOutcome(url: string): Promise<Outcome<unknown | null>> {
  try {
    const value = await fetchJson(url)
    return { ok: true, value }
  } catch (error) {
    return { ok: false, error }
  }
}

function buildMetric(
  doi: string,
  countJson: unknown | null,
  refJson: unknown | null,
  metaJson: unknown | null,
  citeJson: unknown | null,
): CitationMetric {
  const countArr = Array.isArray(countJson) ? countJson : []
  const citationCount = Number((countArr[0] as { count?: string | number } | undefined)?.count) || 0

  const refs = Array.isArray(refJson) ? refJson : []
  const referenceCount = refs.length
  const referenceDois = refs
    .map((r: { cited?: string }) => {
      const c = r.cited || ''
      const m = c.match(/doi:([^\s]+)/i) || c.match(/10\.\d{4,}\/[^\s]+/)
      return m ? (m[1] || m[0]).replace(/^doi:/i, '') : ''
    })
    .filter(Boolean)
    .slice(0, 8)

  const cites = Array.isArray(citeJson) ? citeJson : []
  const citedByDois = cites
    .map((r: { citing?: string }) => {
      const c = r.citing || ''
      const m = c.match(/doi:([^\s]+)/i)
      return m?.[1] || ''
    })
    .filter(Boolean)
    .slice(0, 8)

  const metaArr = Array.isArray(metaJson) ? metaJson : []
  const meta = (metaArr[0] || {}) as {
    id?: string
    title?: string
    author?: string
    pub_date?: string
    venue?: string
    type?: string
    volume?: string
    issue?: string
    page?: string
    publisher?: string
  }
  const ids = parseIds(meta.id)
  const title = (meta.title || '').trim()

  return {
    doi,
    title: title || undefined,
    citationCount,
    referenceCount,
    citedBy: citedByDois,
    references: referenceDois,
    url: `https://doi.org/${doi}`,
    authors: cleanOcText(meta.author, 120) || undefined,
    venue: cleanOcText(meta.venue, 80) || undefined,
    year: yearFromPubDate(meta.pub_date),
    type: meta.type || undefined,
    openAlexId: ids.openAlexId,
    pmid: ids.pmid,
    volume: meta.volume || undefined,
    pages: meta.page || undefined,
  }
}

async function metricsForDoi(doi: string): Promise<Outcome<CitationMetric | null>> {
  const doiEnc = encodeURIComponent(`doi:${doi}`)
  const doiBare = encodeURIComponent(doi)

  const [countOut, refOut, metaOut, citeOut] = await Promise.all([
    fetchJsonOutcome(`https://opencitations.net/index/api/v2/citation-count/${doiEnc}`),
    fetchJsonOutcome(`https://opencitations.net/index/coci/api/v1/references/${doiBare}`),
    fetchJsonOutcome(`https://opencitations.net/meta/api/v1/metadata/doi:${doiBare}`),
    fetchJsonOutcome(`https://opencitations.net/index/api/v2/citations/${doiEnc}`),
  ])

  const parts = [countOut, refOut, metaOut, citeOut]
  const anyData = parts.some((p) => p.ok && p.value != null)
  if (anyData) {
    return {
      ok: true,
      value: buildMetric(
        doi,
        countOut.ok ? countOut.value : null,
        refOut.ok ? refOut.value : null,
        metaOut.ok ? metaOut.value : null,
        citeOut.ok ? citeOut.value : null,
      ),
    }
  }

  const allAbsent = parts.every((p) => p.ok && p.value == null)
  if (allAbsent) return { ok: true, value: null }

  const err = parts.find((p) => !p.ok)
  return { ok: false, error: err && !err.ok ? err.error : new Error('OpenCitations upstream failed') }
}

/**
 * Enrich DOI list with OpenCitations index counts + OpenCitations Meta
 * (title, authors, venue, year). Prefer free public OC endpoints only.
 */
export async function getCitationMetrics(dois: string[]): Promise<CitationMetric[]> {
  const limited = Array.from(
    new Set(dois.map(normalizeDoi).filter((d) => d.length > 5 && d.includes('/'))),
  ).slice(0, 12)
  if (limited.length === 0) return []

  const outcomes = await Promise.all(limited.map((doi) => metricsForDoi(doi)))
  const metrics = outcomes
    .filter((o): o is { ok: true; value: CitationMetric } => o.ok && o.value != null)
    .map((o) => o.value)

  if (metrics.length > 0) {
    metrics.sort((a, b) => {
      const score = (m: CitationMetric) =>
        (m.citationCount > 0 ? 1000 + m.citationCount : 0) +
        (m.title ? 100 : 0) +
        (m.referenceCount || 0)
      return score(b) - score(a)
    })
    return metrics
  }

  const allFailed = outcomes.every((o) => !o.ok)
  if (allFailed) {
    const err = outcomes.find((o) => !o.ok)
    throw err && !err.ok && err.error instanceof Error
      ? err.error
      : new Error('OpenCitations upstream failed')
  }

  return []
}
