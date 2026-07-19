/**
 * DailyMed label deep links.
 *
 * Canonical label page: drugInfo.cfm?setid={UUID}
 * Search (when no setid): search.cfm?labeltype=all&query=…
 * Never send users to bare homepage or empty setid=.
 */

const DAILYMED = 'https://dailymed.nlm.nih.gov/dailymed'

/** Normalize setid (strip braces; prefer lowercase UUID form). */
export function normalizeDailyMedSetId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const t = raw.trim().replace(/^\{|\}$/g, '')
  if (!t || t.length < 3) return null
  // UUID with hyphens
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(t)) {
    return t.toLowerCase()
  }
  // 32 hex → dashed UUID
  if (/^[0-9a-fA-F]{32}$/.test(t)) {
    return `${t.slice(0, 8)}-${t.slice(8, 12)}-${t.slice(12, 16)}-${t.slice(16, 20)}-${t.slice(20)}`.toLowerCase()
  }
  // Other DailyMed setids (hyphenated tokens, legacy ids) — pass through
  if (/^[0-9a-zA-Z._-]{3,80}$/.test(t)) return t
  return null
}

/** Extract setid from a DailyMed URL if present. */
export function extractDailyMedSetId(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  try {
    const u = new URL(url)
    const fromQuery = u.searchParams.get('setid') || u.searchParams.get('setId')
    if (fromQuery) return normalizeDailyMedSetId(fromQuery)
  } catch {
    /* fall through */
  }
  const m = url.match(/[?&]setid=([0-9a-fA-F-]{8,64})/i)
  return m ? normalizeDailyMedSetId(m[1]) : null
}

/** True if URL is a usable per-label deep link (has setid on DailyMed host). */
export function isStableDailyMedDeepLink(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  if (!/dailymed\.nlm\.nih\.gov/i.test(url)) return false
  if (/\/dailymed\/?(index\.cfm)?$/i.test(url.replace(/[?#].*$/, ''))) return false
  return Boolean(extractDailyMedSetId(url))
}

/**
 * Canonical human-facing label page for a setid.
 * Verified: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid={uuid} → 200
 */
export function dailyMedLabelUrl(setId: string | null | undefined): string | null {
  const id = normalizeDailyMedSetId(setId)
  if (!id) return null
  return `${DAILYMED}/drugInfo.cfm?setid=${encodeURIComponent(id)}`
}

/** Free-text search on DailyMed when we only have a title/name. */
export function dailyMedSearchUrl(query: string | null | undefined): string | null {
  const q = query?.trim()
  if (!q) return null
  return `${DAILYMED}/search.cfm?labeltype=all&query=${encodeURIComponent(q)}`
}

/**
 * Best deep link for a Drug Labels list row.
 * Prefer setid → drugInfo.cfm; else stable stored URL; else search by title.
 */
export function dailyMedRowDeepLink(input: {
  setId?: string | null
  dailyMedUrl?: string | null
  url?: string | null
  title?: string | null
}): string {
  const fromSetId = dailyMedLabelUrl(input.setId)
  if (fromSetId) return fromSetId

  const stored = input.dailyMedUrl || input.url
  if (isStableDailyMedDeepLink(stored)) {
    const id = extractDailyMedSetId(stored)
    return dailyMedLabelUrl(id) || stored!
  }
  // Recover setid embedded in a broken URL
  const recovered = extractDailyMedSetId(stored)
  if (recovered) {
    const rebuilt = dailyMedLabelUrl(recovered)
    if (rebuilt) return rebuilt
  }

  return (
    dailyMedSearchUrl(input.title) ||
    `${DAILYMED}/index.cfm`
  )
}

export function dailyMedRowTitle(input: {
  setId?: string | null
  title?: string | null
}): string {
  const id = normalizeDailyMedSetId(input.setId)
  if (id && input.title) return `DailyMed label: ${input.title} (setid ${id})`
  if (id) return `DailyMed label setid ${id}`
  if (input.title) return `DailyMed search: ${input.title}`
  return 'DailyMed'
}
