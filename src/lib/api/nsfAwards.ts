/**
 * NSF Awards Search API (free public, no key required for basic search).
 * Complements NIH RePORTER for multi-funder grant density on profiles / lab dossiers.
 * Affiliation / funding context only — not grant advice.
 * @see https://www.research.gov/common/webapi/awardapisearch-v1.htm
 */

const BASE_URL = 'https://api.nsf.gov/services/v2/awards.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export interface NsfAward {
  id: string
  title: string
  piName: string
  organization: string
  amount: number | null
  startDate: string
  endDate: string
  abstract: string
  /** Official award abstract page when available */
  awardUrl: string
}

/**
 * Keyword search NSF awards (molecule / disease / institution name).
 */
export async function getNsfAwardsByKeyword(
  keyword: string,
  limit = 12,
): Promise<NsfAward[]> {
  const q = keyword.trim()
  if (q.length < 2) return []
  try {
    const rpp = Math.min(25, Math.max(1, limit))
    const url = `${BASE_URL}?keyword=${encodeURIComponent(q)}&rpp=${rpp}&offset=1&printFields=id,title,piFirstName,piLastName,awardeeName,estimatedTotalAmt,startDate,expDate,abstractText,fundProgramName`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = (await res.json()) as {
      response?: {
        award?: Array<Record<string, string | number | undefined>> | Record<string, string | number | undefined>
      }
    }
    let rows = data.response?.award
    if (!rows) return []
    if (!Array.isArray(rows)) rows = [rows]

    return rows.slice(0, rpp).map((r) => {
      const id = String(r.id ?? r.AwardID ?? '').trim()
      const piFirst = String(r.piFirstName ?? '').trim()
      const piLast = String(r.piLastName ?? '').trim()
      const piName = [piFirst, piLast].filter(Boolean).join(' ') || 'Unknown PI'
      const amountRaw = r.estimatedTotalAmt ?? r.fundsObligatedAmt
      const amount =
        typeof amountRaw === 'number'
          ? amountRaw
          : amountRaw != null && String(amountRaw).trim()
            ? Number(String(amountRaw).replace(/[$,]/g, ''))
            : null
      return {
        id,
        title: String(r.title ?? r.AwardTitle ?? '').trim() || 'Untitled award',
        piName,
        organization: String(r.awardeeName ?? r.Institution ?? '').trim() || 'Unknown org',
        amount: amount != null && Number.isFinite(amount) ? amount : null,
        startDate: String(r.startDate ?? '').trim(),
        endDate: String(r.expDate ?? r.endDate ?? '').trim(),
        abstract: String(r.abstractText ?? '').trim().slice(0, 600),
        awardUrl: id
          ? `https://www.nsf.gov/awardsearch/showAward?AWD_ID=${encodeURIComponent(id)}`
          : 'https://www.nsf.gov/awardsearch/',
      } satisfies NsfAward
    })
  } catch {
    return []
  }
}
