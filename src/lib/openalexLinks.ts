/**
 * Deep links for OpenAlex works (web UI, not API JSON).
 */

/** Normalize DOI string to bare DOI (no doi.org prefix). */
export function normalizeDoi(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  let d = raw.trim()
  d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
  d = d.replace(/^doi:\s*/i, '')
  return d || null
}

/**
 * OpenAlex web page for a work id.
 * API ids look like `https://openalex.org/W2741809807` or bare `W2741809807`.
 */
export function openAlexWorkPageUrl(workId: string | null | undefined): string | null {
  if (!workId?.trim()) return null
  const id = workId.trim()
  if (/^https?:\/\//i.test(id)) {
    // Prefer openalex.org web over api.openalex.org
    return id.replace('https://api.openalex.org/', 'https://openalex.org/')
  }
  // Bare W… or works/W…
  const bare = id.replace(/^works\//i, '')
  if (/^W\d+/i.test(bare)) return `https://openalex.org/${bare}`
  return `https://openalex.org/works/${encodeURIComponent(bare)}`
}

export function doiUrl(doi: string | null | undefined): string | null {
  const d = normalizeDoi(doi)
  return d ? `https://doi.org/${d}` : null
}

/**
 * Best deep link for reviewing a work:
 * stored url → DOI → OpenAlex work page → open-access landing.
 */
export function openAlexWorkDeepLink(work: {
  url?: string | null
  doi?: string | null
  workId?: string | null
  openAccessUrl?: string | null
}): string | null {
  if (work.url?.trim() && !/api\.openalex\.org/i.test(work.url)) {
    return work.url.trim()
  }
  const fromDoi = doiUrl(work.doi)
  if (fromDoi) return fromDoi
  const fromId = openAlexWorkPageUrl(work.workId)
  if (fromId) return fromId
  if (work.url?.trim()) {
    return work.url.replace('https://api.openalex.org/', 'https://openalex.org/')
  }
  if (work.openAccessUrl?.trim()) return work.openAccessUrl.trim()
  return null
}

/** Human label for work type chip. */
export function openAlexTypeLabel(type: string | null | undefined): string {
  const t = (type || '').trim()
  if (!t) return 'work'
  return t.replace(/_/g, ' ')
}
