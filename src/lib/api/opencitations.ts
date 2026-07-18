import type { CitationMetric } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

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
  try {
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Enrich DOI list with OpenCitations index counts + OpenCitations Meta
 * (title, authors, venue, year). Prefer free public OC endpoints only.
 */
export async function getCitationMetrics(dois: string[]): Promise<CitationMetric[]> {
  try {
    const limited = Array.from(
      new Set(dois.map(normalizeDoi).filter((d) => d.length > 5 && d.includes('/'))),
    ).slice(0, 12)
    if (limited.length === 0) return []

    const results = await Promise.all(
      limited.map(async (doi): Promise<CitationMetric | null> => {
        const doiEnc = encodeURIComponent(`doi:${doi}`)
        const doiBare = encodeURIComponent(doi)

        const [countJson, refJson, metaJson, citeJson] = await Promise.all([
          // Index citation count (v2)
          fetchJson(`https://opencitations.net/index/api/v2/citation-count/${doiEnc}`),
          // Outgoing references (works this paper cites)
          fetchJson(`https://opencitations.net/index/coci/api/v1/references/${doiBare}`),
          // Bibliographic metadata
          fetchJson(`https://opencitations.net/meta/api/v1/metadata/doi:${doiBare}`),
          // Incoming citations sample (who cites this paper)
          fetchJson(`https://opencitations.net/index/api/v2/citations/${doiEnc}`),
        ])

        // All four failed (network / 5xx) — skip this DOI
        if (countJson == null && refJson == null && metaJson == null && citeJson == null) {
          return null
        }

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
      }),
    )

    const metrics = results.filter((r): r is CitationMetric => r !== null)
    // Most informative first: cited papers, then those with titles, then rest
    metrics.sort((a, b) => {
      const score = (m: CitationMetric) =>
        (m.citationCount > 0 ? 1000 + m.citationCount : 0) +
        (m.title ? 100 : 0) +
        (m.referenceCount || 0)
      return score(b) - score(a)
    })
    return metrics
  } catch {
    return []
  }
}
