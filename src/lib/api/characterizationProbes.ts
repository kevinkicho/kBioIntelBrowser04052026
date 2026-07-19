/**
 * Free-public probes for PDB characterization chips (CD / MS).
 * Never throws to callers — soft-fail to “explore” defaults.
 * Product law: free public APIs only (PRIDE Archive, PCDDB web).
 */

import { normalizePdbId } from '@/lib/pdbLinks'
import {
  pcddbSearchUrl,
  prideSearchUrl,
} from '@/lib/pdbCharacterization'

const PRIDE_SEARCH =
  'https://www.ebi.ac.uk/pride/ws/archive/v2/search/projects'
const DEFAULT_TIMEOUT_MS = 6_000

export interface ProbeHit {
  hit: boolean
  href: string
  /** Optional project / entry id when known */
  accession?: string
  /** How we know */
  via: 'pride_api' | 'pcddb_html' | 'fallback'
}

export interface CharacterizationProbeResult {
  pdbId: string | null
  query: string
  ms: ProbeHit
  cd: ProbeHit
  probedAt: string
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...init,
      signal: ac.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json,text/html,*/*',
        'User-Agent': 'BioIntel/0.1 (free-API characterization probe)',
        ...(init?.headers || {}),
      },
    })
  } finally {
    clearTimeout(t)
  }
}

/**
 * PRIDE Archive free REST: any public project for keyword → MS hit.
 * @see https://www.ebi.ac.uk/pride/ws/archive/v2/
 */
export async function probePrideMs(query: string): Promise<ProbeHit> {
  const q = query.trim()
  const fallbackHref = prideSearchUrl(q || 'protein')
  if (!q) {
    return { hit: false, href: fallbackHref, via: 'fallback' }
  }
  try {
    const url =
      `${PRIDE_SEARCH}?keyword=${encodeURIComponent(q)}` +
      `&pageSize=3&page=0`
    const res = await fetchWithTimeout(url)
    if (!res.ok) {
      return { hit: false, href: fallbackHref, via: 'fallback' }
    }
    const data = (await res.json()) as
      | Array<{ accession?: string; title?: string }>
      | { _embedded?: { projects?: Array<{ accession?: string }> } }
      | { content?: Array<{ accession?: string }> }

    let projects: Array<{ accession?: string }> = []
    if (Array.isArray(data)) {
      projects = data
    } else if (data && typeof data === 'object') {
      if (Array.isArray((data as { content?: unknown }).content)) {
        projects = (data as { content: Array<{ accession?: string }> }).content
      } else if (
        Array.isArray(
          (data as { _embedded?: { projects?: unknown[] } })._embedded
            ?.projects,
        )
      ) {
        projects = (
          data as { _embedded: { projects: Array<{ accession?: string }> } }
        )._embedded.projects
      }
    }

    const first = projects.find((p) => p.accession)
    if (first?.accession) {
      return {
        hit: true,
        href: `https://www.ebi.ac.uk/pride/archive/projects/${first.accession}`,
        accession: first.accession,
        via: 'pride_api',
      }
    }
    if (projects.length > 0) {
      return { hit: true, href: fallbackHref, via: 'pride_api' }
    }
    return { hit: false, href: fallbackHref, via: 'pride_api' }
  } catch {
    return { hit: false, href: fallbackHref, via: 'fallback' }
  }
}

/**
 * PCDDB has no stable public JSON API; soft-probe the free HTML search page.
 * Hit = page returns 200 and does not clearly say “no result”.
 */
export async function probePcddbCd(
  pdbId: string | null,
  query: string,
): Promise<ProbeHit> {
  const q = (pdbId || query || '').trim()
  const href = pcddbSearchUrl(q || 'protein')
  if (!q) {
    return { hit: false, href, via: 'fallback' }
  }
  try {
    const res = await fetchWithTimeout(href, {
      headers: { Accept: 'text/html' },
    })
    if (!res.ok) {
      return { hit: false, href, via: 'fallback' }
    }
    const html = (await res.text()).slice(0, 80_000).toLowerCase()
    // Conservative: only mark hit when page looks like a result list with the id/query
    const noHit =
      html.includes('no results') ||
      html.includes('no entries') ||
      html.includes('0 results') ||
      html.includes('nothing found') ||
      html.includes('did not match')
    if (noHit) {
      return { hit: false, href, via: 'pcddb_html' }
    }
    const needle = q.toLowerCase()
    const mentionsQuery =
      html.includes(needle) &&
      (html.includes('entry') ||
        html.includes('spectrum') ||
        html.includes('pcddb') ||
        html.includes('result'))
    // PCDDB site is flaky from some hosts — prefer explore over false available
    if (mentionsQuery && html.length > 500) {
      return { hit: true, href, via: 'pcddb_html' }
    }
    return { hit: false, href, via: 'pcddb_html' }
  } catch {
    return { hit: false, href, via: 'fallback' }
  }
}

export async function probeCharacterizationSources(input: {
  pdbId?: string | null
  query?: string | null
}): Promise<CharacterizationProbeResult> {
  const pdbId = normalizePdbId(input.pdbId)
  const query = (input.query || pdbId || '').trim()
  // Prefer PDB id for CD (structure-linked spectra); keyword for MS (proteomics)
  const [ms, cd] = await Promise.all([
    probePrideMs(query || pdbId || ''),
    probePcddbCd(pdbId, query),
  ])
  return {
    pdbId,
    query,
    ms,
    cd,
    probedAt: new Date().toISOString(),
  }
}
